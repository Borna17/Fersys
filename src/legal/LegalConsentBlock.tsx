import {
  Link,
} from 'react-router'

type Props = {
  checked: boolean
  onChange: (
    checked: boolean,
  ) => void
}

export function LegalConsentBlock({
  checked,
  onChange,
}: Props) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="mt-1 h-4 w-4 shrink-0 accent-violet-500"
      />

      <span className="text-xs leading-5 text-slate-400">
        Prihvaćam{' '}
        <Link
          to="/terms"
          target="_blank"
          className="font-black text-violet-300 hover:text-violet-200"
        >
          Uvjete korištenja
        </Link>
        , potvrđujem da sam pročitao/la{' '}
        <Link
          to="/privacy"
          target="_blank"
          className="font-black text-violet-300 hover:text-violet-200"
        >
          Politiku privatnosti
        </Link>{' '}
        i upoznat/a sam s pravilima{' '}
        <Link
          to="/refund-policy"
          target="_blank"
          className="font-black text-violet-300 hover:text-violet-200"
        >
          pretplate, otkazivanja i povrata
        </Link>
        .
      </span>
    </label>
  )
}
