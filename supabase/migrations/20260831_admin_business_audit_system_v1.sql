-- FERSYS Admin: automatski audit poslovnih radnji.
-- Ne sprema sadržaj dokumenata, fotografije, lozinke ni vrijednosti polja.

create or replace function public.fersys_business_action_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = 'public','auth'
as $$
declare
  source_row jsonb;
  old_clean jsonb;
  new_clean jsonb;
  actor uuid;
  company uuid;
  entity_id text;
  document_no text;
  session_id uuid;
  action_code text;
  action_label text;
  route_value text;
  entity_label text;
begin
  actor := auth.uid();
  if actor is null then
    return coalesce(new, old);
  end if;

  source_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  company := nullif(source_row ->> 'company_id', '')::uuid;
  entity_id := coalesce(nullif(source_row ->> 'id',''), '');

  if company is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'UPDATE' then
    old_clean := to_jsonb(old) - array[
      'updated_at',
      'weather_temperature_c','weather_condition','weather_humidity_pct',
      'weather_wind_kmh','weather_recorded_at','weather_latitude',
      'weather_longitude','weather_source'
    ];
    new_clean := to_jsonb(new) - array[
      'updated_at',
      'weather_temperature_c','weather_condition','weather_humidity_pct',
      'weather_wind_kmh','weather_recorded_at','weather_latitude',
      'weather_longitude','weather_source'
    ];

    if old_clean = new_clean then
      return new;
    end if;
  end if;

  select s.session_key
    into session_id
  from public.user_activity_sessions s
  where s.user_id = actor
    and s.company_id = company
  order by s.last_seen_at desc
  limit 1;

  if session_id is null then
    session_id := gen_random_uuid();
  end if;

  entity_label := case tg_table_name
    when 'work_orders' then 'radni nalog'
    when 'offers' then 'ponuda'
    when 'invoices' then 'račun'
    when 'incoming_invoices' then 'ulazni račun'
    when 'customers' then 'investitor'
    when 'inventory_items' then 'artikl'
    when 'inventory_movements' then 'skladišna promjena'
    when 'delivery_notes' then 'dostavnica'
    when 'calendar_events' then 'termin'
    when 'vehicles' then 'vozilo'
    else replace(tg_table_name, '_', ' ')
  end;

  route_value := case tg_table_name
    when 'work_orders' then '/work-orders'
    when 'offers' then '/offers'
    when 'invoices' then '/invoices'
    when 'incoming_invoices' then '/incoming-invoices'
    when 'customers' then '/customers'
    when 'inventory_items' then '/inventory'
    when 'inventory_movements' then '/inventory'
    when 'delivery_notes' then '/inventory/delivery-notes'
    when 'calendar_events' then '/calendar'
    when 'vehicles' then '/vehicles'
    else '/dashboard'
  end;

  document_no := coalesce(
    nullif(source_row ->> 'order_number',''),
    nullif(source_row ->> 'offer_number',''),
    nullif(source_row ->> 'invoice_number',''),
    nullif(source_row ->> 'delivery_note_number',''),
    nullif(source_row ->> 'document_number',''),
    nullif(source_row ->> 'name',''),
    ''
  );

  action_code := lower(tg_op) || '_' || tg_table_name;
  action_label := case tg_op
    when 'INSERT' then 'Kreiran ' || entity_label
    when 'UPDATE' then 'Uređen ' || entity_label
    when 'DELETE' then 'Obrisan ' || entity_label
    else 'Promijenjen ' || entity_label
  end;

  if document_no <> '' then
    action_label := action_label || ' · ' || left(document_no, 80);
  end if;

  insert into public.user_activity_events(
    session_key,
    company_id,
    user_id,
    event_type,
    route,
    label,
    metadata
  ) values (
    session_id,
    company,
    actor,
    'action',
    route_value,
    left(action_label, 160),
    jsonb_build_object(
      'action', action_code,
      'entityType', tg_table_name,
      'entityId', entity_id
    )
  );

  return coalesce(new, old);
end;
$$;

revoke all on function public.fersys_business_action_trigger_v1() from public, anon;
grant execute on function public.fersys_business_action_trigger_v1() to authenticated;

-- Postavi audit samo na tablice koje postoje u konkretnoj instalaciji.
do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'work_orders','offers','invoices','incoming_invoices','customers',
    'inventory_items','inventory_movements','delivery_notes','calendar_events','vehicles'
  ]
  loop
    if to_regclass('public.' || table_name) is not null then
      trigger_name := 'fersys_audit_' || table_name || '_v1';
      execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
      execute format(
        'create trigger %I after insert or update or delete on public.%I for each row execute function public.fersys_business_action_trigger_v1()',
        trigger_name,
        table_name
      );
    end if;
  end loop;
end $$;

-- Aktivnost Admina sada koristi isti privatnost-siguran event stream i za stranice i za poslovne radnje.
create or replace function public.admin_get_user_activity_range_v1(
  requested_start timestamptz,
  requested_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'auth'
as $function$
declare
  result jsonb;
  range_start timestamptz;
  range_end timestamptz;
  includes_now boolean;
begin
  if not public.is_platform_admin() then
    raise exception 'Nemate pristup FERSYS administraciji.';
  end if;

  if requested_start is null or requested_end is null then
    raise exception 'Raspon aktivnosti nije zadan.';
  end if;
  if requested_end <= requested_start then
    raise exception 'Završetak raspona mora biti nakon početka.';
  end if;
  if requested_end - requested_start > interval '93 days' then
    raise exception 'Najveći dopušteni raspon je 93 dana.';
  end if;

  range_start := requested_start;
  range_end := requested_end;
  includes_now := now() >= range_start and now() < range_end;

  with range_sessions as (
    select
      s.*,
      greatest(s.started_at, range_start) as clipped_start,
      least(coalesce(s.ended_at, s.last_seen_at), range_end) as clipped_end
    from public.user_activity_sessions s
    where s.last_seen_at >= range_start
      and s.started_at < range_end
  ),
  per_user as (
    select
      s.user_id,
      s.company_id,
      min(s.clipped_start) as first_seen_at,
      max(least(s.last_seen_at, range_end)) as last_seen_at,
      sum(greatest(0, extract(epoch from (s.clipped_end - s.clipped_start))))::bigint as duration_seconds,
      (array_agg(s.last_route order by s.last_seen_at desc))[1] as last_route,
      bool_or(
        includes_now
        and s.last_seen_at > now() - interval '2 minutes'
        and s.ended_at is null
      ) as is_online,
      count(*)::int as sessions_count
    from range_sessions s
    where s.clipped_end >= s.clipped_start
    group by s.user_id, s.company_id
  ),
  rows as (
    select
      p.user_id,
      p.company_id,
      coalesce(nullif(pr.full_name,''), split_part(u.email,'@',1), 'Korisnik') as user_name,
      coalesce(u.email,'') as email,
      coalesce(c.name,'Tvrtka') as company_name,
      p.first_seen_at,
      p.last_seen_at,
      p.duration_seconds,
      coalesce(p.last_route, '/dashboard') as last_route,
      p.is_online,
      p.sessions_count,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'type', timeline.event_type,
            'route', timeline.route,
            'label', timeline.label,
            'createdAt', timeline.created_at
          ) order by timeline.created_at desc
        )
        from (
          select e.event_type, e.route, e.label, e.created_at
          from public.user_activity_events e
          where e.user_id = p.user_id
            and e.company_id = p.company_id
            and e.created_at >= range_start
            and e.created_at < range_end
          order by e.created_at desc
          limit 32
        ) timeline
      ), '[]'::jsonb) as recent_events,
      (
        select count(*)
        from public.user_activity_events e
        where e.user_id = p.user_id
          and e.company_id = p.company_id
          and e.event_type = 'page_view'
          and e.created_at >= range_start
          and e.created_at < range_end
      )::int as page_views,
      (
        select count(*)
        from public.user_activity_events e
        where e.user_id = p.user_id
          and e.company_id = p.company_id
          and e.event_type = 'action'
          and e.created_at >= range_start
          and e.created_at < range_end
      )::int as business_actions
    from per_user p
    join auth.users u on u.id = p.user_id
    left join public.profiles pr on pr.id = p.user_id
    left join public.companies c on c.id = p.company_id
  )
  select jsonb_build_object(
    'allowed', true,
    'rangeStart', range_start,
    'rangeEnd', range_end,
    'uniqueUsers', (select count(*) from rows),
    'onlineNow', (select count(*) from rows where is_online),
    'totalSeconds', coalesce((select sum(duration_seconds) from rows), 0),
    'pageViews', (
      select count(*) from public.user_activity_events
      where event_type = 'page_view'
        and created_at >= range_start
        and created_at < range_end
    ),
    'businessActions', (
      select count(*) from public.user_activity_events
      where event_type = 'action'
        and created_at >= range_start
        and created_at < range_end
    ),
    'sessions', coalesce((select sum(sessions_count) from rows), 0),
    'users', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'userId', user_id,
          'companyId', company_id,
          'userName', user_name,
          'email', email,
          'companyName', company_name,
          'firstSeenAt', first_seen_at,
          'lastSeenAt', last_seen_at,
          'durationSeconds', duration_seconds,
          'lastRoute', last_route,
          'isOnline', is_online,
          'sessionsCount', sessions_count,
          'pageViews', page_views,
          'businessActions', business_actions,
          'recentEvents', recent_events
        ) order by is_online desc, duration_seconds desc, last_seen_at desc
      ) from rows
    ), '[]'::jsonb),
    'generatedAt', now()
  ) into result;

  return result;
end;
$function$;

revoke all on function public.admin_get_user_activity_range_v1(timestamptz, timestamptz) from public, anon;
grant execute on function public.admin_get_user_activity_range_v1(timestamptz, timestamptz) to authenticated;
