import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearRuntimeCache,
  clearRuntimeCachePrefix,
  readRuntimeCache,
  writeRuntimeCache,
} from '../../src/services/runtimeCache.service'

describe('runtime business-data cache', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns fresh cached business data without network dependency', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    writeRuntimeCache('fersys-cache:customers:company-a', [{ id: 'customer-1' }])

    vi.spyOn(Date, 'now').mockReturnValue(10_000)
    expect(readRuntimeCache('fersys-cache:customers:company-a', 30_000)).toEqual([
      { id: 'customer-1' },
    ])
  })

  it('rejects expired data normally but exposes it for explicit offline fallback', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000)
    writeRuntimeCache('fersys-cache:work-orders:company-a', [{ id: 'wo-1' }])

    vi.spyOn(Date, 'now').mockReturnValue(61_000)
    expect(readRuntimeCache('fersys-cache:work-orders:company-a', 15_000)).toBeNull()
    expect(
      readRuntimeCache('fersys-cache:work-orders:company-a', Number.MAX_SAFE_INTEGER, true),
    ).toEqual([{ id: 'wo-1' }])
  })

  it('isolates company caches and clears only the requested prefix', () => {
    writeRuntimeCache('fersys-cache:customers:company-a', ['A'])
    writeRuntimeCache('fersys-cache:customers:company-b', ['B'])
    writeRuntimeCache('fersys-cache:employees:company-a', ['worker'])

    clearRuntimeCachePrefix('fersys-cache:customers:company-a')

    expect(readRuntimeCache('fersys-cache:customers:company-a', 30_000, true)).toBeNull()
    expect(readRuntimeCache('fersys-cache:customers:company-b', 30_000, true)).toEqual(['B'])
    expect(readRuntimeCache('fersys-cache:employees:company-a', 30_000, true)).toEqual(['worker'])
  })

  it('never throws when browser storage is unavailable', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeRuntimeCache('fersys-cache:test', { ok: true })).not.toThrow()
    setItem.mockRestore()

    localStorage.setItem('fersys-cache:test', JSON.stringify({ savedAt: Date.now(), value: 1 }))
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage blocked')
    })
    expect(readRuntimeCache('fersys-cache:test', 30_000, true)).toBeNull()
    getItem.mockRestore()

    expect(() => clearRuntimeCache('fersys-cache:test')).not.toThrow()
  })
})
