import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('../../supabase/migrations/20260917_recovery_snapshots_v1.sql', import.meta.url),
  'utf8',
)

const adminPage = readFileSync(
  new URL('../../src/admin/AdminRecoveryPage.tsx', import.meta.url),
  'utf8',
)

describe('P0 Admin Recovery safety contract', () => {
  it('keeps recovery history server-side and restricts admin RPCs to signed-in platform admins', () => {
    expect(migration).toContain('create table if not exists public.recovery_snapshots')
    expect(migration).toContain('alter table public.recovery_snapshots enable row level security')
    expect(migration).toContain('auth.uid() is null or not public.is_platform_admin()')
    expect(migration).toContain('revoke all on function public.admin_get_recovery_snapshots_v1(uuid, integer) from public, anon')
    expect(migration).toContain('revoke all on function public.admin_restore_recovery_snapshot_v1(uuid) from public, anon')
  })

  it('safe restore writes only a user draft and a recovery audit snapshot', () => {
    const restoreStart = migration.indexOf('create or replace function public.admin_restore_recovery_snapshot_v1')
    expect(restoreStart).toBeGreaterThan(-1)

    const restoreSql = migration.slice(restoreStart)
    expect(restoreSql).toContain('insert into public.user_drafts')
    expect(restoreSql).toContain("'admin_restore'")
    expect(restoreSql).not.toMatch(/update\s+public\.(work_orders|offers|invoices|incoming_invoices|delivery_notes|customers|vehicles|employees)\b/i)
  })

  it('Admin Recovery UI exposes inspect, copy and safe restore through the recovery RPCs', () => {
    expect(adminPage).toContain("supabase.rpc('admin_get_recovery_snapshots_v1'")
    expect(adminPage).toContain("supabase.rpc('admin_restore_recovery_snapshot_v1'")
    expect(adminPage).toContain('navigator.clipboard.writeText')
    expect(adminPage).toContain('Aktivni poslovni zapis neće biti prepisan')
  })
})
