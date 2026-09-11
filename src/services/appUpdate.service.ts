import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'

export type AppReleasePlatform = 'android' | 'ios'

export type AppReleaseChannel = {
  platform: AppReleasePlatform
  latestVersion: string
  latestVersionCode: number
  minimumVersionCode: number
  updateRequired: boolean
  title: string
  message: string
  releaseNotes: string
  storeUrl: string
}

export type AppUpdateCheck = {
  available: boolean
  required: boolean
  installedVersion: string
  installedVersionCode: number
  platform: AppReleasePlatform | null
  release: AppReleaseChannel | null
}

function currentPlatform(): AppReleasePlatform | null {
  if (!Capacitor.isNativePlatform()) return null
  const platform = Capacitor.getPlatform()
  if (platform === 'android' || platform === 'ios') return platform
  return null
}

function mapRow(row: Record<string, unknown>, platform: AppReleasePlatform): AppReleaseChannel {
  const defaultStoreUrl =
    platform === 'android'
      ? 'https://play.google.com/store/apps/details?id=com.fersys.app'
      : 'https://testflight.apple.com/'

  return {
    platform,
    latestVersion: String(row.latest_version ?? ''),
    latestVersionCode: Number(row.latest_version_code ?? 0),
    minimumVersionCode: Number(row.minimum_version_code ?? 0),
    updateRequired: Boolean(row.update_required),
    title: String(row.title ?? 'Dostupna je nova verzija FERSYS-a'),
    message: String(row.message ?? 'Ažuriraj FERSYS za najnovije funkcije i ispravke.'),
    releaseNotes: String(row.release_notes ?? ''),
    storeUrl: String(row.store_url ?? defaultStoreUrl),
  }
}

export async function checkForAppUpdate(): Promise<AppUpdateCheck> {
  const platform = currentPlatform()

  if (!platform) {
    return {
      available: false,
      required: false,
      installedVersion: '',
      installedVersionCode: 0,
      platform: null,
      release: null,
    }
  }

  const info = await App.getInfo()
  const installedVersionCode = Number(info.build ?? 0)

  const { data, error } = await supabase
    .from('app_release_channel')
    .select('*')
    .eq('platform', platform)
    .maybeSingle()

  if (error) throw error

  if (!data) {
    return {
      available: false,
      required: false,
      installedVersion: info.version,
      installedVersionCode,
      platform,
      release: null,
    }
  }

  const release = mapRow(data as Record<string, unknown>, platform)
  const available = release.latestVersionCode > installedVersionCode
  const required = available && (
    release.updateRequired || installedVersionCode < release.minimumVersionCode
  )

  return {
    available,
    required,
    installedVersion: info.version,
    installedVersionCode,
    platform,
    release,
  }
}

/** Backward-compatible alias for older callers. */
export const checkForAndroidAppUpdate = checkForAppUpdate
