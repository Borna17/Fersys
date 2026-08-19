import {
  Check,
  LoaderCircle,
} from 'lucide-react'

type QuickStatusSelectProps<
  T extends string,
> = {
  value: T
  options: readonly T[]
  disabled?: boolean
  saving?: boolean
  onChange:
    (value: T) => void
  className?: string
  ariaLabel?: string
}

export default function QuickStatusSelect<
  T extends string,
>({
  value,
  options,
  disabled = false,
  saving = false,
  onChange,
  className = '',
  ariaLabel =
    'Promijeni status',
}: QuickStatusSelectProps<T>) {
  return (
    <div
      className={`relative min-w-0 ${className}`}
    >
      <select
        value={value}
        disabled={
          disabled ||
          saving
        }
        onClick={(event) =>
          event.stopPropagation()
        }
        onChange={(event) => {
          event.stopPropagation()

          onChange(
            event.target
              .value as T,
          )
        }}
        aria-label={
          ariaLabel
        }
        className="h-10 w-full appearance-none rounded-xl border border-slate-700 bg-slate-800 py-0 pl-3 pr-9 text-xs font-black text-white outline-none transition hover:border-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-wait disabled:opacity-65"
      >
        {options.map(
          (status) => (
            <option
              key={status}
              value={status}
            >
              {status}
            </option>
          ),
        )}
      </select>

      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        {saving ? (
          <LoaderCircle
            size={15}
            className="animate-spin text-blue-300"
          />
        ) : (
          <Check
            size={14}
            className="text-emerald-400/80"
          />
        )}
      </span>
    </div>
  )
}
