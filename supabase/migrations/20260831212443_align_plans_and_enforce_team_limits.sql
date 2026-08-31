update public.plans
set
  description = 'Vodim mali obrt i želim digitalizirati osnovne stvari.',
  monthly_price_eur = 19.99,
  is_recommended = false,
  limits = jsonb_build_object(
    'users', 1,
    'customers', 15,
    'work_orders_monthly', 30,
    'offers_monthly', 30
  ),
  features = jsonb_build_object(
    'customers', true,
    'work_orders', true,
    'offers', true,
    'calendar', true,
    'basic_pdf', true,
    'employees', false,
    'permissions', false,
    'invoices', false,
    'incoming_invoices', false,
    'inventory', false,
    'ai', false,
    'advanced_pdf', false,
    'email_sending', false,
    'inventory_costs', false,
    'advanced_finance', false,
    'advanced_ai', false,
    'automations', false,
    'multi_location', false,
    'excel_export', false
  ),
  updated_at = now()
where id = 'starter';

update public.plans
set
  description = 'Imam malu firmu i nekoliko zaposlenika.',
  monthly_price_eur = 29.99,
  is_recommended = false,
  limits = jsonb_build_object(
    'users', 5,
    'customers', 30,
    'work_orders_monthly', 60,
    'offers_monthly', 60
  ),
  features = jsonb_build_object(
    'customers', true,
    'work_orders', true,
    'offers', true,
    'calendar', true,
    'basic_pdf', true,
    'employees', true,
    'permissions', true,
    'invoices', true,
    'incoming_invoices', true,
    'inventory', true,
    'ai', true,
    'advanced_pdf', true,
    'email_sending', true,
    'inventory_costs', false,
    'advanced_finance', false,
    'advanced_ai', false,
    'automations', false,
    'multi_location', false,
    'excel_export', false
  ),
  updated_at = now()
where id = 'business';

update public.plans
set
  description = 'FERSYS mi je glavni poslovni sustav i ne želim razmišljati o ograničenjima.',
  monthly_price_eur = 49.99,
  is_recommended = true,
  limits = jsonb_build_object(
    'users', -1,
    'customers', -1,
    'work_orders_monthly', -1,
    'offers_monthly', -1
  ),
  features = jsonb_build_object(
    'customers', true,
    'work_orders', true,
    'offers', true,
    'calendar', true,
    'basic_pdf', true,
    'employees', true,
    'permissions', true,
    'invoices', true,
    'incoming_invoices', true,
    'inventory', true,
    'ai', true,
    'advanced_pdf', true,
    'email_sending', true,
    'inventory_costs', true,
    'advanced_finance', true,
    'advanced_ai', true,
    'automations', true,
    'multi_location', true,
    'excel_export', true
  ),
  updated_at = now()
where id = 'pro';

create or replace function public.assert_company_member_capacity(
  requested_company_id uuid,
  include_pending_invitations boolean default false
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_subscription public.company_subscriptions;
  v_plan public.plans;
  v_limit integer;
  v_active integer;
  v_pending integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Korisnik nije prijavljen.';
  end if;

  select * into v_subscription
  from public.company_subscriptions
  where company_id = requested_company_id
  limit 1;

  if v_subscription.id is null then
    raise exception 'Pretplata tvrtke nije pronađena.';
  end if;

  select * into v_plan
  from public.plans
  where id = v_subscription.plan_id
  limit 1;

  if v_plan.id is null then
    raise exception 'Paket pretplate nije pronađen.';
  end if;

  if not public.subscription_is_usable(v_subscription) then
    raise exception 'Pretplata ili probno razdoblje nisu aktivni.';
  end if;

  if not coalesce((v_plan.features ->> 'employees')::boolean, false) then
    raise exception 'Dodavanje zaposlenika nije dostupno u paketu %.', v_plan.name;
  end if;

  v_limit := coalesce((v_plan.limits ->> 'users')::integer, 0);

  if v_limit = -1 then
    return;
  end if;

  select count(*) into v_active
  from public.company_members
  where company_id = requested_company_id
    and status = 'active';

  if include_pending_invitations then
    select count(*) into v_pending
    from public.invitations
    where company_id = requested_company_id
      and status = 'pending'
      and expires_at > now();
  end if;

  if v_active + v_pending >= v_limit then
    raise exception 'Dosegnut je limit paketa % (% od % korisnika).',
      v_plan.name, v_active + v_pending, v_limit;
  end if;
end;
$$;

revoke all on function public.assert_company_member_capacity(uuid, boolean) from public;
grant execute on function public.assert_company_member_capacity(uuid, boolean) to authenticated;

create or replace function public.create_company_invitation(requested_email text, requested_message text default null::text, requested_name text default null::text, requested_role text default 'worker'::text)
returns table(id uuid, company_id uuid, email text, invitee_name text, role company_role, token text, invite_code text, status invitation_status, invited_by uuid, accepted_by uuid, message text, expires_at timestamp with time zone, accepted_at timestamp with time zone, last_sent_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone)
language plpgsql
security definer
set search_path to 'public', 'auth', 'extensions'
as $$
declare
  v_user_id uuid := auth.uid();
  v_company_id uuid;
  v_membership_role public.company_role;
  v_email text;
  v_code text;
  v_token text;
  v_row public.invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Korisnik nije prijavljen.';
  end if;

  v_email := lower(trim(coalesce(requested_email, '')));
  if v_email = '' then raise exception 'E-mail adresa je obavezna.'; end if;
  if v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'E-mail adresa nije ispravna.';
  end if;

  if requested_role not in ('admin','manager','worker','assistant','intern','accounting','viewer') then
    raise exception 'Odabrana uloga nije dopuštena.';
  end if;

  select cm.company_id, cm.role
  into v_company_id, v_membership_role
  from public.company_members cm
  where cm.user_id = v_user_id and cm.status = 'active'
  order by case when cm.role = 'owner' then 0 else 1 end, cm.created_at asc
  limit 1;

  if v_company_id is null then
    raise exception 'Prijavljeni korisnik nije povezan s aktivnom tvrtkom.';
  end if;

  if v_membership_role not in ('owner','admin','manager') then
    raise exception 'Nemate dopuštenje za izradu pozivnica.';
  end if;

  if v_membership_role = 'admin' and requested_role = 'admin' then
    raise exception 'Samo vlasnik može dodijeliti administratorsku ulogu.';
  end if;

  if v_membership_role = 'manager' and requested_role in ('admin','manager') then
    raise exception 'Voditelj ne može dodijeliti administratorsku ili voditeljsku ulogu.';
  end if;

  if exists (
    select 1
    from public.company_members cm
    join auth.users au on au.id = cm.user_id
    where cm.company_id = v_company_id and lower(au.email) = v_email
  ) then
    raise exception 'Korisnik s ovom e-mail adresom već je član tvrtke.';
  end if;

  if exists (
    select 1 from public.invitations i
    where i.company_id = v_company_id
      and lower(i.email) = v_email
      and i.status = 'pending'
      and i.expires_at > now()
  ) then
    raise exception 'Za ovu e-mail adresu već postoji aktivna pozivnica.';
  end if;

  perform public.assert_company_member_capacity(v_company_id, true);

  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  loop
    v_code := upper(substr(encode(extensions.gen_random_bytes(12), 'hex'), 1, 16));
    exit when not exists (select 1 from public.invitations i where i.invite_code = v_code);
  end loop;

  insert into public.invitations (
    company_id,email,invitee_name,role,token,invite_code,status,invited_by,message,
    expires_at,last_sent_at,created_at,updated_at
  ) values (
    v_company_id,v_email,nullif(trim(coalesce(requested_name,'')),''),requested_role::public.company_role,
    v_token,v_code,'pending',v_user_id,nullif(trim(coalesce(requested_message,'')),''),
    now()+interval '7 days',now(),now(),now()
  ) returning * into v_row;

  return query select
    v_row.id,v_row.company_id,v_row.email,coalesce(v_row.invitee_name,''),v_row.role,
    v_row.token,v_row.invite_code,v_row.status,v_row.invited_by,v_row.accepted_by,
    coalesce(v_row.message,''),v_row.expires_at,v_row.accepted_at,v_row.last_sent_at,
    v_row.created_at,v_row.updated_at;
end;
$$;

create or replace function public.accept_company_invitation(requested_code text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invitation public.invitations%rowtype;
  v_membership_id uuid;
begin
  if v_user_id is null then
    raise exception 'Za prihvaćanje pozivnice potrebno je prijaviti se.';
  end if;

  select lower(email) into v_user_email
  from auth.users
  where id = v_user_id;

  select * into v_invitation
  from public.invitations
  where invite_code = upper(trim(requested_code))
  for update;

  if v_invitation.id is null then
    raise exception 'Pozivnica nije pronađena.';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Pozivnica više nije aktivna.';
  end if;

  if v_invitation.expires_at <= now() then
    update public.invitations
    set status = 'expired', updated_at = now()
    where id = v_invitation.id;
    raise exception 'Pozivnica je istekla.';
  end if;

  if lower(v_invitation.email) <> v_user_email then
    raise exception 'Pozivnica je vezana uz drugu e-mail adresu.';
  end if;

  perform public.assert_company_member_capacity(v_invitation.company_id, false);

  insert into public.company_members (
    company_id,user_id,role,status,permissions,joined_at,created_at,updated_at
  ) values (
    v_invitation.company_id,v_user_id,v_invitation.role,'active','{}'::jsonb,now(),now(),now()
  )
  on conflict (company_id, user_id)
  do update set role = excluded.role, status = 'active', updated_at = now()
  returning id into v_membership_id;

  update public.invitations
  set status = 'accepted', accepted_by = v_user_id, accepted_at = now(), updated_at = now()
  where id = v_invitation.id;

  return v_membership_id;
end;
$$;
