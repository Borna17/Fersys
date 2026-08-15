import {
  Turnstile,
  type TurnstileInstance,
} from '@marsidev/react-turnstile'
import {
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react'

export type FersysTurnstileRef = {
  reset: () => void
}

type Props = {
  onTokenChange: (token: string) => void
}

const siteKey = String(
  import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '',
).trim()

export const FersysTurnstile = forwardRef<
  FersysTurnstileRef,
  Props
>(function FersysTurnstile(
  { onTokenChange },
  ref,
) {
  const widgetRef =
    useRef<TurnstileInstance | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      reset() {
        widgetRef.current?.reset()
        onTokenChange('')
      },
    }),
    [onTokenChange],
  )

  if (!siteKey) {
    return (
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs leading-5 text-amber-200">
        Cloudflare Turnstile još nije konfiguriran.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50 p-2">
      <Turnstile
        ref={widgetRef}
        siteKey={siteKey}
        options={{
          theme: 'dark',
          size: 'flexible',
          appearance: 'interaction-only',
          refreshExpired: 'auto',
        }}
        onSuccess={onTokenChange}
        onExpire={() => onTokenChange('')}
        onError={() => onTokenChange('')}
      />
    </div>
  )
})