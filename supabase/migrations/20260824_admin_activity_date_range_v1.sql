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
            'type', timeline.type,
            'route', timeline.route,
            'label', timeline.label,
            'createdAt', timeline.created_at
          )
          order by timeline.created_at desc
        )
        from (
          select *
          from (
            select
              e.event_type as type,
              e.route,
              coalesce(nullif(e.label,''), e.route) as label,
              e.created_at
            from public.user_activity_events e
            where e.user_id = p.user_id
              and e.company_id = p.company_id
              and e.created_at >= range_start
              and e.created_at < range_end

            union all

            select
              'action'::text as type,
              coalesce(nullif(a.metadata ->> 'route',''), '') as route,
              coalesce(nullif(a.description,''), nullif(a.action,''), 'Poslovna radnja') as label,
              a.created_at
            from public.activity_logs a
            where a.actor_user_id = p.user_id
              and a.company_id = p.company_id
              and a.created_at >= range_start
              and a.created_at < range_end
          ) combined
          order by created_at desc
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
        from public.activity_logs a
        where a.actor_user_id = p.user_id
          and a.company_id = p.company_id
          and a.created_at >= range_start
          and a.created_at < range_end
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
      select count(*)
      from public.user_activity_events
      where event_type = 'page_view'
        and created_at >= range_start
        and created_at < range_end
    ),
    'businessActions', (
      select count(*)
      from public.activity_logs
      where created_at >= range_start
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
        )
        order by is_online desc, duration_seconds desc, last_seen_at desc
      )
      from rows
    ), '[]'::jsonb),
    'generatedAt', now()
  ) into result;

  return result;
end;
$function$;

revoke all on function public.admin_get_user_activity_range_v1(timestamptz, timestamptz) from public;
revoke all on function public.admin_get_user_activity_range_v1(timestamptz, timestamptz) from anon;
grant execute on function public.admin_get_user_activity_range_v1(timestamptz, timestamptz) to authenticated;

create index if not exists user_activity_sessions_range_idx
  on public.user_activity_sessions (started_at, last_seen_at, user_id, company_id);
create index if not exists user_activity_events_range_idx
  on public.user_activity_events (created_at, user_id, company_id, event_type);
create index if not exists activity_logs_range_idx
  on public.activity_logs (created_at, actor_user_id, company_id);
