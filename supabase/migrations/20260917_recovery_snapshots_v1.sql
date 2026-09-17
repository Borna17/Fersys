-- FERSYS P0: server-side recovery history for unfinished user work.
-- Payload is retained for 90 days. Access is restricted to the owner of the
-- snapshot and platform administrators; application code still scopes normal
-- draft sync by company + user.

create table if not exists public.recovery_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_type text not null,
  draft_key text not null,
  payload jsonb not null default '{}'::jsonb,
  reason text not null default 'autosave',
  source_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days')
);

create index if not exists recovery_snapshots_company_created_idx
  on public.recovery_snapshots(company_id, created_at desc);
create index if not exists recovery_snapshots_user_created_idx
  on public.recovery_snapshots(user_id, created_at desc);
create index if not exists recovery_snapshots_lookup_idx
  on public.recovery_snapshots(company_id, user_id, draft_type, draft_key, created_at desc);

alter table public.recovery_snapshots enable row level security;

revoke all on public.recovery_snapshots from anon;
grant select, insert on public.recovery_snapshots to authenticated;

drop policy if exists "recovery owner read" on public.recovery_snapshots;
create policy "recovery owner read"
on public.recovery_snapshots for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "recovery owner insert" on public.recovery_snapshots;
create policy "recovery owner insert"
on public.recovery_snapshots for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and company_id = public.current_company_id()
);

create or replace function public.admin_get_recovery_snapshots_v1(
  requested_company_id uuid default null,
  requested_limit integer default 100
)
returns table (
  id uuid,
  company_id uuid,
  user_id uuid,
  user_email text,
  draft_type text,
  draft_key text,
  payload jsonb,
  reason text,
  source_updated_at timestamptz,
  created_at timestamptz,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = 'public','auth'
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Nemate pristup FERSYS administraciji.';
  end if;

  return query
  select
    r.id,
    r.company_id,
    r.user_id,
    coalesce(u.email, '')::text,
    r.draft_type,
    r.draft_key,
    r.payload,
    r.reason,
    r.source_updated_at,
    r.created_at,
    r.expires_at
  from public.recovery_snapshots r
  left join auth.users u on u.id = r.user_id
  where r.expires_at > now()
    and (requested_company_id is null or r.company_id = requested_company_id)
  order by r.created_at desc
  limit greatest(1, least(coalesce(requested_limit, 100), 500));
end;
$$;

revoke all on function public.admin_get_recovery_snapshots_v1(uuid, integer) from public, anon;
grant execute on function public.admin_get_recovery_snapshots_v1(uuid, integer) to authenticated;

-- Safe Admin Recovery: restore the selected snapshot only into user_drafts.
-- It intentionally never updates the active business record. The user must
-- reopen/review the restored draft before doing a normal final save.
create or replace function public.admin_restore_recovery_snapshot_v1(
  requested_snapshot_id uuid
)
returns table (
  draft_type text,
  draft_key text,
  restored_updated_at timestamptz
)
language plpgsql
security definer
set search_path = 'public','auth'
as $$
declare
  snapshot_row public.recovery_snapshots%rowtype;
  restored_at timestamptz := now();
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'Nemate pristup FERSYS administraciji.';
  end if;

  select *
  into snapshot_row
  from public.recovery_snapshots
  where id = requested_snapshot_id
    and expires_at > now();

  if not found then
    raise exception 'Recovery snapshot nije pronađen ili je istekao.';
  end if;

  insert into public.user_drafts (
    company_id,
    user_id,
    draft_type,
    draft_key,
    payload,
    updated_at,
    expires_at
  ) values (
    snapshot_row.company_id,
    snapshot_row.user_id,
    snapshot_row.draft_type,
    snapshot_row.draft_key,
    snapshot_row.payload,
    restored_at,
    restored_at + interval '30 days'
  )
  on conflict (company_id, user_id, draft_type, draft_key)
  do update set
    payload = excluded.payload,
    updated_at = excluded.updated_at,
    expires_at = excluded.expires_at;

  insert into public.recovery_snapshots (
    company_id,
    user_id,
    draft_type,
    draft_key,
    payload,
    reason,
    source_updated_at
  ) values (
    snapshot_row.company_id,
    snapshot_row.user_id,
    snapshot_row.draft_type,
    snapshot_row.draft_key,
    snapshot_row.payload,
    'admin_restore',
    restored_at
  );

  return query
  select snapshot_row.draft_type, snapshot_row.draft_key, restored_at;
end;
$$;

revoke all on function public.admin_restore_recovery_snapshot_v1(uuid) from public, anon;
grant execute on function public.admin_restore_recovery_snapshot_v1(uuid) to authenticated;
