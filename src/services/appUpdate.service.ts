import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { supabase } from '../lib/supabase'

export type AppReleaseChannel = {
  platform: 'android'
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
  release: AppReleaseChannel | null
}

function mapRow(row: Record<string, unknown>): AppReleaseChannel {
  return {
    platform: 'android',
    latestVersion: String(row.latest_version ?? ''),
    latestVersionCode: Number(row.latest_version_code ?? 0),
    minimumVersionCode: Number(row.minimum_version_code ?? 0),
    updateRequired: Boolean(row.update_required),
    title: String(row.title ?? 'Dostupna je nova verzija FERSYS-a'),
    message: String(row.message ?? 'Ažuriraj FERSYS za najnovije funkcije i ispravke.'),
    releaseNotes: String(row.release_notes ?? ''),
    storeUrl: String(row.store_url ?? 'https://play.google.com/store/apps/details?id=com.fersys.app'),
  }
}

export async function checkForAndroidAppUpdate(): Promise<AppUpdateCheck> {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
    return { available: false, required: false, installedVersion: '', installedVersionCode: 0, release: null }
  }

  const info = await App.getInfo()
  const installedVersionCode = Number(info.build ?? 0)

  const { data, error } = await supabase
    .from('app_release_channel')
    .select('*')
    .eq('platform', 'android')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    return { available: false, required: false, installedVersion: info.version, installedVersionCode, release: null }
  }

  const release = mapRow(data as Record<string, unknown>)
  const available = release.latestVersionCode > installedVersionCode
  const required = available && (release.updateRequired || installedVersionCode < release.minimumVersionCode)

  return {
    available,
    required,
    installedVersion: info.version,
    installedVersionCode,
    release,
  }
}
