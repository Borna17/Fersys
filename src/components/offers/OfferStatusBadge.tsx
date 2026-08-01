import type { OfferStatus } from '../../types/offers'

type OfferStatusBadgeProps = {
  status: OfferStatus
  size?: 'sm' | 'md'
  showDot?: boolean
}

const statusStyles: Record<
  OfferStatus,
  {
    wrapper: string
    dot: string
  }
> = {
  Nacrt: {
    wrapper:
      'border-slate-200 bg-slate-100 text-slate-700',
    dot: 'bg-slate-500',
  },

  Poslano: {
    wrapper:
      'border-blue-200 bg-blue-50 text-blue-700',
    dot: 'bg-blue-500',
  },

  Pregledano: {
    wrapper:
      'border-violet-200 bg-violet-50 text-violet-700',
    dot: 'bg-violet-500',
  },

  'U tijeku': {
    wrapper:
      'border-amber-200 bg-amber-50 text-amber-700',
    dot: 'bg-amber-500',
  },

  Prihvaćeno: {
    wrapper:
      'border-emerald-200 bg-emerald-50 text-emerald-700',
    dot: 'bg-emerald-500',
  },

  Odbijeno: {
    wrapper:
      'border-red-200 bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },

  Isteklo: {
    wrapper:
      'border-orange-200 bg-orange-50 text-orange-700',
    dot: 'bg-orange-500',
  },

  Otkazano: {
    wrapper:
      'border-zinc-300 bg-zinc-100 text-zinc-700',
    dot: 'bg-zinc-500',
  },
}

const sizeStyles = {
  sm: 'gap-1.5 px-2 py-1 text-xs',
  md: 'gap-2 px-2.5 py-1.5 text-sm',
}

export default function OfferStatusBadge({
  status,
  size = 'sm',
  showDot = true,
}: OfferStatusBadgeProps) {
  const styles = statusStyles[status]

  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-full border font-semibold',
        'whitespace-nowrap',
        styles.wrapper,
        sizeStyles[size],
      ].join(' ')}
    >
      {showDot && (
        <span
          className={[
            'shrink-0 rounded-full',
            size === 'sm'
              ? 'h-1.5 w-1.5'
              : 'h-2 w-2',
            styles.dot,
          ].join(' ')}
        />
      )}

      <span>{status}</span>
    </span>
  )
}
