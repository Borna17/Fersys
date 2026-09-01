import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Download, RefreshCw, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { checkForAndroidAppUpdate, type AppUpdateCheck } from '../services/appUpdate.service'

const SNOOZE_PREFIX = 'fersys_update_snooze_v2:'
const CHECK_INTERVAL_MS = 30 * 60 * 1000
const SNOOZE_MS = 12 * 60 * 60 * 1000

export default function AppUpdatePrompt() {
  const [update, setUpdate] = useState<AppUpdateCheck | null>(null)
  const checkingRef = useRef(false)

  const check = useCallback(async () => {
    if (checkingRef.current) return
    checkingRef.current = true

    try {
      const result = await checkForAndroidAppUpdate()
      if (!result.available || !result.release) {
        setUpdate(null)
        return
      }

      if (!result.required) {
        const key = SNOOZE_PREFIX + result.release.latestVersionCode
        const until = Number(localStorage.getItem(key) ?? 0)
        if (Date.now() < until) {
          setUpdate(null)
          return
        }
      }

      setUpdate(result)
    } catch (error) {
      console.warn('[FERSYS] Provjera nove verzije nije uspjela:', error)
    } finally {
      checkingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return

    void check()
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check()
    }
    document.addEventListener('visibilitychange', onVisible)

    let removeAppState: (() => void) | undefined
    void App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void check()
    }).then((handle) => {
      removeAppState = () => void handle.remove()
    })

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      removeAppState?.()
    }
  }, [check])

  if (!update?.available || !update.release) return null
  const release = update.release

  async function openStore() {
    const marketUrl = 'market://details?id=com.fersys.app'
    try {
      window.location.href = marketUrl
      window.setTimeout(() => {
        if (document.visibilityState === 'visible') {
          void Browser.open({ url: release.storeUrl })
        }
      }, 1200)
    } catch {
      await Browser.open({ url: release.storeUrl })
    }
  }

  function later() {
    if (update?.required) return
    localStorage.setItem(
      SNOOZE_PREFIX + release.latestVersionCode,
      String(Date.now() + SNOOZE_MS),
    )
    setUpdate(null)
  }

  return (
    <div className="fixed left-1/2 top-[max(12px,env(safe-area-inset-top))] z-[2147482500] w-[min(calc(100vw-24px),720px)] -translate-x-1/2">
      <div className="flex items-start gap-3 rounded-2xl border border-blue-400/25 bg-slate-950/98 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-4">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
          <RefreshCw size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">{release.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-300">{release.message}</p>
              <p className="mt-1 text-[11px] font-bold text-blue-300">
                Instalirano {update.installedVersion} · dostupno {release.latestVersion}
              </p>
            </div>

            {!update.required && (
              <button type="button" onClick={later} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 active:bg-slate-800" aria-label="Kasnije">
                <X size={18} />
              </button>
            )}
          </div>

          <button type="button" onClick={() => void openStore()} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white active:scale-[0.98]">
            <Download size={17} />
            Ažuriraj na Trgovini Play
          </button>
        </div>
      </div>
    </div>
  )
}
