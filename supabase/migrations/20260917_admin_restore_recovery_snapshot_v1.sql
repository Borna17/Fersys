create or replace function public.admin_restore_recovery_snapshot_v1(requested_snapshot_id uuid)
returns table (draft_type text, draft_key text, restored_updated_at timestamptz)
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

  select * into snapshot_row
  from public.recovery_snapshots
  where id = requested_snapshot_id
    and expires_at > now();

  if not found then
    raise exception 'Recovery snapshot nije pronađen ili je istekao.';
  end if;

  -- Restore never writes directly into a business table. It only recreates the
  -- user's recoverable draft, so the user can review it before any final save.
  insert into public.user_drafts (
    company_id, user_id, draft_type, draft_key, payload, updated_at, expires_at
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
    company_id, user_id, draft_type, draft_key, payload, reason, source_updated_at
  ) values (
    snapshot_row.company_id,
    snapshot_row.user_id,
    snapshot_row.draft_type,
    snapshot_row.draft_key,
    snapshot_row.payload,
    'admin_restore',
    restored_at
  );

  return query select snapshot_row.draft_type, snapshot_row.draft_key, restored_at;
end;
$$;

revoke all on function public.admin_restore_recovery_snapshot_v1(uuid) from public, anon;
grant execute on function public.admin_restore_recovery_snapshot_v1(uuid) to authenticated;
