alter table public.calendar_events
  add column if not exists contact_phone text,
  add column if not exists assigned_user_ids uuid[] not null default '{}'::uuid[];

create index if not exists calendar_events_assigned_user_ids_gin
  on public.calendar_events using gin (assigned_user_ids);

create or replace function public.fersys_calendar_activity_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_changed boolean := false;
  v_title text;
  v_description text;
  v_actor_name text;
begin
  if tg_op = 'UPDATE' then
    v_changed :=
      new.title is distinct from old.title or
      new.customer_name is distinct from old.customer_name or
      new.event_date is distinct from old.event_date or
      new.start_time is distinct from old.start_time or
      new.end_time is distinct from old.end_time or
      new.location is distinct from old.location or
      new.contact_phone is distinct from old.contact_phone or
      new.workers is distinct from old.workers or
      new.assigned_user_ids is distinct from old.assigned_user_ids or
      new.description is distinct from old.description or
      new.status is distinct from old.status;

    if not v_changed then
      return new;
    end if;
  end if;

  select coalesce(nullif(trim(p.full_name), ''), nullif(trim(p.email), ''), 'Član tima')
    into v_actor_name
  from public.profiles p
  where p.id = auth.uid()
  limit 1;

  v_actor_name := coalesce(v_actor_name, 'Član tima');
  v_title := case when tg_op = 'INSERT' then 'Novi termin u kalendaru' else 'Termin u kalendaru je izmijenjen' end;
  v_description := concat_ws(' · ',
    nullif(new.title, ''),
    to_char(new.event_date, 'DD.MM.YYYY.'),
    to_char(new.start_time, 'HH24:MI'),
    nullif(new.location, ''),
    nullif(new.contact_phone, '')
  );

  insert into public.notification_events_v2 (
    company_id, category, title, description, route,
    actor_user_id, actor_name, entity_type, entity_id
  ) values (
    new.company_id, 'calendar', v_title, v_description, '/calendar',
    auth.uid(), v_actor_name, 'calendar_event', new.id::text
  );

  return new;
end;
$$;

drop trigger if exists trg_calendar_activity_notification on public.calendar_events;
create trigger trg_calendar_activity_notification
after insert or update on public.calendar_events
for each row execute function public.fersys_calendar_activity_notification();
