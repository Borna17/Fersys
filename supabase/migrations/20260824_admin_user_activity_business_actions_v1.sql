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
          'type', timeline.type,
          'route', timeline.route,
          'label', timeline.label,
          'createdAt', timeline.created_at
        ) order by timeline.created_at desc)
        from (
          select * from (
            select
              e.event_type as type,
              e.route,
              coalesce(nullif(e.label,''), e.route) as label,
              e.created_at
            from public.user_activity_events e
            where e.user_id = p.user_id
              and e.company_id = p.company_id
              and e.created_at >= date_trunc('day', now())

            union all

            select
              'action'::text as type,
              coalesce(nullif(a.metadata ->> 'route',''), '') as route,
              coalesce(nullif(a.description,''), nullif(a.action,''), 'Poslovna radnja') as label,
              a.created_at
            from public.activity_logs a
            where a.actor_user_id = p.user_id
              and a.company_id = p.company_id
              and a.created_at >= date_trunc('day', now())
          ) combined
          order by created_at desc
          limit 16
        ) timeline
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
    'businessActions', (select count(*) from public.activity_logs where created_at >= date_trunc('day', now())),
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

revoke all on function public.admin_get_today_user_activity_v1() from public, anon;
grant execute on function public.admin_get_today_user_activity_v1() to authenticated;
