create or replace function public.admin_get_company_insights_v2(requested_company_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  result jsonb := '{}'::jsonb;
  counts jsonb := '{}'::jsonb;
  users_data jsonb := '[]'::jsonb;
  activity_data jsonb := '[]'::jsonb;
  modules_data text[] := '{}';
  setup_completed boolean := false;
  value_count bigint := 0;
  table_name text;
  key_name text;
begin
  if not public.is_platform_admin() then
    raise exception 'Nemate pristup FERSYS administraciji.';
  end if;

  if not exists (select 1 from public.companies where id = requested_company_id) then
    raise exception 'Tvrtka nije pronađena.';
  end if;

  for table_name, key_name in
    select * from (values
      ('company_members', 'users'),
      ('customers', 'customers'),
      ('work_orders', 'work_orders'),
      ('offers', 'offers'),
      ('invoices', 'invoices'),
      ('incoming_invoices', 'incoming_invoices'),
      ('vehicles', 'vehicles'),
      ('vehicle_service_records', 'vehicle_services')
    ) as x(table_name, key_name)
  loop
    value_count := 0;
    if to_regclass('public.' || table_name) is not null then
      execute format('select count(*) from public.%I where company_id = $1', table_name)
      into value_count using requested_company_id;
    end if;
    counts := counts || jsonb_build_object(key_name, coalesce(value_count, 0));
  end loop;

  select coalesce(c.enabled_modules, '{}'::text[]), coalesce(c.module_setup_completed, false)
  into modules_data, setup_completed
  from public.companies c
  where c.id = requested_company_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', cm.id,
        'userId', cm.user_id,
        'name', coalesce(nullif(p.full_name, ''), split_part(coalesce(u.email, ''), '@', 1), 'Korisnik'),
        'email', coalesce(u.email, ''),
        'role', cm.role::text,
        'status', cm.status::text,
        'createdAt', cm.created_at,
        'lastActiveAt', cm.updated_at
      ) order by cm.created_at desc
    ),
    '[]'::jsonb
  )
  into users_data
  from public.company_members cm
  left join public.profiles p on p.id = cm.user_id
  left join auth.users u on u.id = cm.user_id
  where cm.company_id = requested_company_id;

  if to_regclass('public.notification_events_v2') is not null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', activity.id,
          'category', activity.category,
          'title', activity.title,
          'description', activity.description,
          'route', activity.route,
          'actorName', coalesce(activity.actor_name, ''),
          'createdAt', activity.created_at
        ) order by activity.created_at desc
      ),
      '[]'::jsonb
    )
    into activity_data
    from (
      select id, category, title, description, route, actor_name, created_at
      from public.notification_events_v2
      where company_id = requested_company_id
      order by created_at desc
      limit 30
    ) activity;
  end if;

  return jsonb_build_object(
    'allowed', true,
    'counts', counts,
    'users', users_data,
    'activity', activity_data,
    'enabledModules', to_jsonb(modules_data),
    'moduleSetupCompleted', setup_completed,
    'generatedAt', now()
  );
end;
$$;

create or replace function public.admin_update_company_member(
  requested_company_id uuid,
  requested_membership_id uuid,
  requested_role text,
  requested_status text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_role text;
begin
  if not public.is_platform_admin() then
    raise exception 'Nemate pravo upravljanja FERSYS platformom.';
  end if;

  if requested_role not in ('owner','admin','manager','worker','assistant','intern','accounting','viewer') then
    raise exception 'Nepoznata uloga.';
  end if;

  if requested_status not in ('active','inactive','blocked') then
    raise exception 'Nepoznat status korisnika.';
  end if;

  select role::text into current_role
  from public.company_members
  where id = requested_membership_id and company_id = requested_company_id;

  if current_role is null then
    raise exception 'Korisnik nije pronađen.';
  end if;

  if current_role = 'owner' and requested_role <> 'owner' then
    raise exception 'Vlasniku nije moguće ukloniti owner ulogu iz ove kontrole.';
  end if;

  update public.company_members
  set role = requested_role::public.company_role,
      status = requested_status::public.member_status,
      updated_at = now()
  where id = requested_membership_id
    and company_id = requested_company_id;

  insert into public.platform_admin_activity(admin_user_id, action, company_id, details)
  values(
    auth.uid(),
    'company_member_updated',
    requested_company_id,
    jsonb_build_object(
      'membership_id', requested_membership_id,
      'role', requested_role,
      'status', requested_status
    )
  );
end;
$$;

create or replace function public.admin_update_company_modules(
  requested_company_id uuid,
  requested_modules text[]
)
returns text[]
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  allowed_modules constant text[] := array[
    'customers','work_orders','offers','invoices','incoming_invoices',
    'calendar','inventory','vehicles','employees','ai'
  ]::text[];
  clean_modules text[];
begin
  if not public.is_platform_admin() then
    raise exception 'Nemate pravo upravljanja FERSYS platformom.';
  end if;

  if not exists (select 1 from public.companies where id = requested_company_id) then
    raise exception 'Tvrtka nije pronađena.';
  end if;

  select coalesce(array_agg(distinct module_key order by module_key), '{}'::text[])
  into clean_modules
  from unnest(coalesce(requested_modules, '{}'::text[])) module_key
  where module_key = any(allowed_modules);

  if cardinality(clean_modules) = 0 then
    raise exception 'Tvrtka mora imati uključen barem jedan modul.';
  end if;

  update public.companies
  set enabled_modules = clean_modules,
      module_setup_completed = true,
      updated_at = now()
  where id = requested_company_id;

  insert into public.company_module_preferences(company_id, enabled_modules, setup_completed, updated_at)
  values(requested_company_id, clean_modules, true, now())
  on conflict(company_id) do update
    set enabled_modules = excluded.enabled_modules,
        setup_completed = true,
        updated_at = now();

  insert into public.platform_admin_activity(admin_user_id, action, company_id, details)
  values(
    auth.uid(),
    'company_modules_updated',
    requested_company_id,
    jsonb_build_object('enabled_modules', clean_modules)
  );

  return clean_modules;
end;
$$;

revoke all on function public.admin_get_company_insights_v2(uuid) from public, anon;
revoke all on function public.admin_update_company_member(uuid, uuid, text, text) from public, anon;
revoke all on function public.admin_update_company_modules(uuid, text[]) from public, anon;

grant execute on function public.admin_get_company_insights_v2(uuid) to authenticated;
grant execute on function public.admin_update_company_member(uuid, uuid, text, text) to authenticated;
grant execute on function public.admin_update_company_modules(uuid, text[]) to authenticated;
