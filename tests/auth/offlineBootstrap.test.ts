import { beforeEach, describe, expect, it } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { CurrentMembership } from '../../src/auth/permissions'
import { activateLocalIdentity, clearOfflineBootstrap, getActiveLocalIdentity, isIdentityVerifiedOnline, readOfflineBootstrap, rememberOfflineBootstrap } from '../../src/auth/offlineBootstrap'
const session = { user: { id: 'alice' }, access_token: 'access', refresh_token: 'refresh' } as Session
const membership = { membershipId: 'member-a', companyId: 'company-a', role: 'owner', status: 'active', permissions: {} } as CurrentMembership
beforeEach(() => { localStorage.clear(); clearOfflineBootstrap() })
describe('verified device bootstrap', () => {
  it('does not authorize first-ever offline login', () => { expect(readOfflineBootstrap('auth')).toBeNull() })
  it('restores only a matching previously verified account and never duplicates tokens', () => {
    localStorage.setItem('auth', JSON.stringify(session)); rememberOfflineBootstrap(session, membership)
    expect(readOfflineBootstrap('auth')).toEqual({ session, membership })
    expect(localStorage.getItem('fersys-offline-bootstrap-v2')).not.toContain('refresh_token')
    activateLocalIdentity('alice', membership, false)
    expect(getActiveLocalIdentity()?.userId).toBe('alice'); expect(isIdentityVerifiedOnline()).toBe(false)
  })
  it('rejects another account, absent SDK session, expired and malformed cache', () => {
    rememberOfflineBootstrap(session, membership)
    expect(readOfflineBootstrap('auth')).toBeNull()
    localStorage.setItem('auth', JSON.stringify({ ...session, user: { id: 'bob' } }))
    expect(readOfflineBootstrap('auth')).toBeNull()
    localStorage.setItem('auth', JSON.stringify(session))
    localStorage.setItem('fersys-offline-bootstrap-v2', JSON.stringify({ userId: 'alice', membership, verifiedAt: Date.now() - 8*86400000 }))
    expect(readOfflineBootstrap('auth')).toBeNull()
    localStorage.setItem('fersys-offline-bootstrap-v2', '{'); expect(readOfflineBootstrap('auth')).toBeNull()
  })
  it('revocation and explicit logout remove offline eligibility', () => {
    localStorage.setItem('auth', JSON.stringify(session)); rememberOfflineBootstrap(session, membership)
    rememberOfflineBootstrap(session, { ...membership, status: 'blocked' })
    expect(readOfflineBootstrap('auth')).toBeNull(); expect(getActiveLocalIdentity()).toBeNull()
    rememberOfflineBootstrap(session, membership); clearOfflineBootstrap()
    expect(readOfflineBootstrap('auth')).toBeNull(); expect(isIdentityVerifiedOnline()).toBe(false)
  })
})
