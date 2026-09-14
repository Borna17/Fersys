import { AlertTriangle, Bell, BellOff, BellRing, Camera, CheckCircle2, Mic, RefreshCw, Send, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

import WeatherNotificationSettings from '../components/WeatherNotificationSettings'
import { isNativeApp } from '../lib/platform'
import { supabase } from '../lib/supabase'
import {
  getDevicePermissionSnapshot,
  requestCameraAndPhotos,
  requestMicrophoneAndSpeech,
  type DevicePermissionSnapshot,
  type PermissionState,
} from '../services/devicePermissions.service'
import { disablePushNotifications, enablePushNotifications, getPushRegistrationState, type PushRegistrationState } from '../services/pushNotifications.service'

function stateLabel(state: PushRegistrationState) {
  if (state === 'subscribed') return 'Obavijesti su uključene'
  if (state === 'denied') return 'Obavijesti su blokirane'
  if (state === 'missing-key') return 'Push nije konfiguriran'
  if (state === 'unsupported') return 'Push nije dostupan na ovom uređaju'
  return 'Obavijesti nisu uključene'
}

function permissionLabel(value: PermissionState) {
  if (value === 'granted') return 'Dopušteno'
  if (value === 'limited') return 'Ograničen pristup'
  if (value === 'denied') return 'Blokirano'
  if (value === 'prompt' || value === 'prompt-with-rationale') return 'Čeka dopuštenje'
  if (value === 'unsupported') return 'Nije dostupno'
  return 'Provjeri na uređaju'
}

function permissionTone(value: PermissionState) {
  if (value === 'granted' || value === 'limited') return 'text-emerald-300'
  if (value === 'denied') return 'text-amber-300'
  return 'text-slate-400'
}

export function NotificationSettingsPage() {
  const [state, setState] = useState<PushRegistrationState>('available')
  const [permissions, setPermissions] = useState<DevicePermissionSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [permissionWorking, setPermissionWorking] = useState<'mic' | 'media' | ''>('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function refresh() {
    try {
      setLoading(true)
      setError('')
      const [pushState, deviceState] = await Promise.all([
        getPushRegistrationState(),
        getDevicePermissionSnapshot(),
      ])
      setState(pushState)
      setPermissions(deviceState)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Status dopuštenja nije moguće provjeriti.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
    const handleRefresh = () => void refresh()
    window.addEventListener('fersys:notifications-refresh', handleRefresh)
    document.addEventListener('visibilitychange', handleRefresh)
    return () => {
      window.removeEventListener('fersys:notifications-refresh', handleRefresh)
      document.removeEventListener('visibilitychange', handleRefresh)
    }
  }, [])

  function deniedMessage() {
    return isNativeApp()
      ? 'Dopuštenje za obavijesti je blokirano na telefonu. Otvori Postavke uređaja → FERSYS → Obavijesti i dopusti ih, zatim se vrati i stisni Provjeri ponovno.'
      : 'Dopuštenje za obavijesti je blokirano u pregledniku. Uključi ga u postavkama stranice i pokušaj ponovno.'
  }

  async function enable() {
    try {
      setWorking(true); setError(''); setMessage('')
      const next = await enablePushNotifications()
      setState(next)
      if (next === 'denied') setError(deniedMessage())
      if (next === 'subscribed') setMessage('Uređaj je registriran i spreman za FERSYS push obavijesti.')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Obavijesti trenutno nije moguće uključiti.')
    } finally { setWorking(false) }
  }

  async function testRegistration() {
    try {
      setWorking(true); setError(''); setMessage('')
      const next = await enablePushNotifications()
      setState(next)
      if (next === 'denied') { setError(deniedMessage()); return }
      if (next !== 'subscribed') { setError('Uređaj nije registriran za push obavijesti. Provjeri dopuštenje i pokušaj ponovno.'); return }
      const { data, error: invokeError } = await supabase.functions.invoke('send-test-push', { body: {} })
      if (invokeError) throw invokeError
      const result = data as { ok?: boolean; sent?: number; failed?: number; error?: string } | null
      if (!result?.ok || !result.sent) throw new Error(result?.error || 'Testna push poruka nije poslana.')
      setMessage(result.sent === 1 ? 'Testna push poruka je poslana. Provjeri obavijest na telefonu.' : `Testna push poruka je poslana na ${result.sent} registrirana uređaja.`)
      window.dispatchEvent(new Event('fersys:notifications-refresh'))
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Test push obavijesti nije uspio.')
    } finally { setWorking(false) }
  }

  async function disable() {
    try {
      setWorking(true); setError(''); setMessage('')
      await disablePushNotifications()
      setState('available')
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Obavijesti trenutno nije moguće isključiti.')
    } finally { setWorking(false) }
  }

  async function allowMicrophone() {
    try {
      setPermissionWorking('mic'); setError(''); setMessage('')
      await requestMicrophoneAndSpeech()
      setMessage('Mikrofon i prepoznavanje govora spremni su za FERSYS AI.')
      setPermissions(await getDevicePermissionSnapshot())
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Mikrofon nije moguće uključiti.')
    } finally { setPermissionWorking('') }
  }

  async function allowMedia() {
    try {
      setPermissionWorking('media'); setError(''); setMessage('')
      await requestCameraAndPhotos()
      setMessage('Kamera i fotografije spremne su za radne naloge i dokumente.')
      setPermissions(await getDevicePermissionSnapshot())
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Pristup fotografijama nije moguće uključiti.')
    } finally { setPermissionWorking('') }
  }

  const enabled = state === 'subscribed'
  const micState = permissions?.microphone ?? 'unknown'
  const photoState = permissions?.photos ?? 'unknown'
  const cameraState = permissions?.camera ?? 'unknown'

  return (
    <section className="mx-auto max-w-4xl pb-28">
      <header>
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-blue-300"><Bell size={15} />Obavijesti i dopuštenja</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">Postavke uređaja</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Na jednom mjestu provjeri obavijesti, mikrofon za FERSYS AI te kameru i fotografije za radne naloge.</p>
      </header>

      <div className="mt-7 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4"><div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl ${enabled ? 'bg-emerald-500/15 text-emerald-300' : state === 'denied' ? 'bg-amber-500/15 text-amber-300' : 'bg-blue-500/15 text-blue-300'}`}>{enabled ? <BellRing size={25} /> : state === 'denied' ? <BellOff size={25} /> : <Bell size={25} />}</div><div><p className="text-lg font-black text-white">{loading ? 'Provjera statusa...' : stateLabel(state)}</p><p className="mt-1 text-sm leading-6 text-slate-400">{isNativeApp() ? 'Android/iOS koristi izvorni sustav dopuštenja uređaja.' : 'Mobilna web/PWA verzija koristi dopuštenja preglednika.'}</p></div></div>
          <button type="button" onClick={() => void refresh()} disabled={loading || working || Boolean(permissionWorking)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-300 disabled:opacity-50"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} />Provjeri ponovno</button>
        </div>

        {error && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><span>{error}</span></div>}
        {message && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200"><CheckCircle2 size={18} className="mt-0.5 shrink-0" /><span>{message}</span></div>}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {!enabled ? <button type="button" onClick={() => void enable()} disabled={working || state === 'unsupported' || state === 'missing-key'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white disabled:opacity-50"><BellRing size={18} />{working ? 'Uključivanje...' : 'Uključi obavijesti'}</button> : <button type="button" onClick={() => void disable()} disabled={working} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-5 text-sm font-black text-red-300 disabled:opacity-50"><BellOff size={18} />{working ? 'Isključivanje...' : 'Isključi na ovom uređaju'}</button>}
          <button type="button" onClick={() => void testRegistration()} disabled={working || state === 'unsupported' || state === 'missing-key'} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-500/10 px-5 text-sm font-black text-violet-200 disabled:opacity-50"><Send size={18} />{working ? 'Slanje testa...' : 'Pošalji testnu poruku'}</button>
        </div>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <h2 className="text-lg font-black text-white">Dopuštenja uređaja</h2>
        <p className="mt-1 text-sm leading-6 text-slate-400">FERSYS traži dopuštenje tek kada ga funkcija treba. Ovdje ga možeš unaprijed provjeriti i uključiti.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/10 text-violet-300"><Mic size={21}/></div><div><div className="font-black text-white">Mikrofon i govor</div><div className={`text-xs font-bold ${permissionTone(micState)}`}>{permissionLabel(micState)}</div></div></div><p className="mt-3 text-xs leading-5 text-slate-500">Potreban za diktiranje naredbi FERSYS AI pomoćniku.</p><button onClick={() => void allowMicrophone()} disabled={permissionWorking === 'mic' || micState === 'granted'} className="mt-3 min-h-10 w-full rounded-xl bg-violet-600 px-3 text-sm font-black text-white disabled:bg-slate-800 disabled:text-slate-500">{micState === 'granted' ? 'Dopušteno' : permissionWorking === 'mic' ? 'Provjera...' : 'Dopusti mikrofon'}</button></article>
          <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-cyan-500/10 text-cyan-300"><Camera size={21}/></div><div><div className="font-black text-white">Kamera i fotografije</div><div className={`text-xs font-bold ${permissionTone(photoState === 'granted' || photoState === 'limited' ? photoState : cameraState)}`}>Kamera: {permissionLabel(cameraState)} · Fotografije: {permissionLabel(photoState)}</div></div></div><p className="mt-3 text-xs leading-5 text-slate-500">Za fotografije radova, priloge i odabir slika iz galerije.</p><button onClick={() => void allowMedia()} disabled={permissionWorking === 'media' || (cameraState === 'granted' && (photoState === 'granted' || photoState === 'limited'))} className="mt-3 min-h-10 w-full rounded-xl bg-cyan-600 px-3 text-sm font-black text-white disabled:bg-slate-800 disabled:text-slate-500">{cameraState === 'granted' && (photoState === 'granted' || photoState === 'limited') ? 'Dopušteno' : permissionWorking === 'media' ? 'Provjera...' : 'Dopusti kameru i slike'}</button></article>
        </div>
        <div className="mt-3 flex min-h-12 items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 text-sm text-slate-400"><Smartphone size={18} className="shrink-0 text-slate-500" />Ako je dopuštenje trajno odbijeno, Android/iOS više ne prikazuje upit. Tada ga uključi u sistemskim Postavkama → FERSYS i vrati se na ovaj ekran.</div>
      </div>

      <WeatherNotificationSettings />
      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6"><div className="flex items-start gap-3"><CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-400" /><div><h2 className="font-black text-white">Što će FERSYS slati?</h2><p className="mt-2 text-sm leading-6 text-slate-400">Važne poslovne obavijesti i, ako je uključena, jutarnju vremensku prognozu za tvoj odabrani grad.</p></div></div></div>
    </section>
  )
}
