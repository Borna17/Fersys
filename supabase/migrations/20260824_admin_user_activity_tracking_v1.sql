create table if not exists public.user_activity_sessions (
  id uuid primary key default gen_random_uuid(),
  session_key uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  last_route text not null default '/dashboard',
  platform text not null default 'web',
  user_agent text,
  created_at timestamptz not null default now(),
  unique(session_key, user_id)
);

create index if not exists user_activity_sessions_company_started_idx
  on public.user_activity_sessions(company_id, started_at desc);
create index if not exists user_activity_sessions_user_started_idx
  on public.user_activity_sessions(user_id, started_at desc);

create table if not exists public.user_activity_events (
  id uuid primary key default gen_random_uuid(),
  session_key uuid not null,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  route text not null default '/dashboard',
  label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_events_company_created_idx
  on public.user_activity_events(company_id, created_at desc);
create index if not exists user_activity_events_user_created_idx
  on public.user_activity_events(user_id, created_at desc);

alter table public.user_activity_sessions enable row level security;
alter table public.user_activity_events enable row level security;

create or replace function public.record_my_activity_v1(
  requested_session_key uuid,
  requested_event_type text,
  requested_route text default '/dashboard',
  requested_label text default null,
  requested_platform text default 'web',
  requested_user_agent text default null,
  requested_end_session boolean default false
)
returns void
language plpgsql
security definer
set search_path = 'public','auth'
as $$
declare
  current_company uuid;
  clean_event text;
  clean_route text;
begin
  if auth.uid() is null then
    return;
  end if;

  select cm.company_id into current_company
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.status = 'active'
  order by cm.created_at asc
  limit 1;

  if current_company is null then
    return;
  end if;

  clean_event := case
    when requested_event_type in ('session_start','page_view','heartbeat','session_end')
      then requested_event_type
    else 'page_view'
  end;

  clean_route := left(coalesce(nullif(requested_route,''),'/dashboard'), 240);

  insert into public.user_activity_sessions(
    session_key, company_id, user_id, started_at, last_seen_at,
    ended_at, last_route, platform, user_agent
  ) values (
    requested_session_key, current_company, auth.uid(), now(), now(),
    case when requested_end_session then now() else null end,
    clean_route,
    left(coalesce(requested_platform,'web'),30),
    left(coalesce(requested_user_agent,''),500)
  )
  on conflict(session_key,user_id) do update set
    last_seen_at = now(),
    ended_at = case when requested_end_session then now() else null end,
    last_route = clean_route,
    platform = left(coalesce(requested_platform, user_activity_sessions.platform),30);

  if clean_event <> 'heartbeat' then
    insert into public.user_activity_events(
      session_key, company_id, user_id, event_type, route, label
    ) values (
      requested_session_key, current_company, auth.uid(), clean_event,
      clean_route, left(coalesce(requested_label,''),160)
    );
  end if;
end;
$$;

create or replace function public.admin_get_today_user_activity_v1()
returns jsonb
language plpgsql
security definer
set search_path = 'public','auth'
as $$
declare
  result jsonb;
begin
  if not public.is_platform_admin() then
    raise exception 'Nemate pristup FERSYS administraciji.';
  end if;

  with today_sessions as (
    select s.*
    from public.user_activity_sessions s
    where s.started_at >= date_trunc('day', now())
  ),
  per_user as (
    select
      s.user_id,
      s.company_id,
      min(s.started_at) as first_seen_at,
      max(s.last_seen_at) as last_seen_at,
      sum(greatest(0, extract(epoch from (coalesce(s.ended_at, s.last_seen_at) - s.started_at))))::bigint as duration_seconds,
      (array_agg(s.last_route order by s.last_seen_at desc))[1] as last_route,
      bool_or(s.last_seen_at > now() - interval '2 minutes' and s.ended_at is null) as is_online,
      count(*)::int as sessions_count
    from today_sessions s
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
      p.last_route,
      p.is_online,
      p.sessions_count,
      coalesce((
        select jsonb_agg(jsonb_build_object(
          'type', e.event_type,
          'route', e.route,
          'label', e.label,
          'createdAt', e.created_at
        ) order by e.created_at desc)
        from (
          select * from public.user_activity_events x
          where x.user_id = p.user_id
            and x.company_id = p.company_id
            and x.created_at >= date_trunc('day', now())
          order by x.created_at desc
          limit 12
        ) e
      ), '[]'::jsonb) as recent_events
    from per_user p
    join auth.users u on u.id = p.user_id
    left join public.profiles pr on pr.id = p.user_id
    left join public.companies c on c.id = p.company_id
  )
  select jsonb_build_object(
    'allowed', true,
    'uniqueUsers', (select count(*) from rows),
    'onlineNow', (select count(*) from rows where is_online),
    'totalSeconds', coalesce((select sum(duration_seconds) from rows),0),
    'pageViews', (select count(*) from public.user_activity_events where event_type='page_view' and created_at >= date_trunc('day', now())),
    'users', coalesce((select jsonb_agg(jsonb_build_object(
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
      'recentEvents', recent_events
    ) order by is_online desc, last_seen_at desc) from rows), '[]'::jsonb),
    'generatedAt', now()
  ) into result;

  return result;
end;
$$;

revoke all on function public.record_my_activity_v1(uuid,text,text,text,text,text,boolean) from public, anon;
grant execute on function public.record_my_activity_v1(uuid,text,text,text,text,text,boolean) to authenticated;
revoke all on function public.admin_get_today_user_activity_v1() from public, anon;
grant execute on function public.admin_get_today_user_activity_v1() to authenticated;
