import type { OfferStatistics } from '../../types/offers'
import { formatCurrency } from '../../utils/offerCalculations'

type Props = {
  statistics: OfferStatistics
}

type CardProps = {
  title: string
  value: string | number
  subtitle?: string
  color:
    | 'blue'
    | 'green'
    | 'amber'
    | 'red'
    | 'purple'
    | 'slate'
}

const colors = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    value: 'text-blue-900',
  },
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    value: 'text-emerald-900',
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    value: 'text-amber-900',
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    value: 'text-red-900',
  },
  purple: {
    bg: 'bg-violet-50',
    border: 'border-violet-200',
    text: 'text-violet-700',
    value: 'text-violet-900',
  },
  slate: {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-700',
    value: 'text-slate-900',
  },
}

function Card({
  title,
  value,
  subtitle,
  color,
}: CardProps) {
  const c = colors[color]

  return (
    <div
      className={[
        'rounded-2xl border p-5 shadow-sm transition',
        'hover:shadow-md',
        c.bg,
        c.border,
      ].join(' ')}
    >
      <p className={`text-sm font-medium ${c.text}`}>
        {title}
      </p>

      <h2
        className={`mt-2 text-3xl font-bold ${c.value}`}
      >
        {value}
      </h2>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default function OffersStats({
  statistics,
}: Props) {
  return (
    <div className="grid gap-5 xl:grid-cols-6 lg:grid-cols-3 md:grid-cols-2">

      <Card
        title="Ukupno ponuda"
        value={statistics.total}
        subtitle="Sve izrađene ponude"
        color="blue"
      />

      <Card
        title="Ukupna vrijednost"
        value={formatCurrency(statistics.totalValue)}
        subtitle="Vrijednost svih ponuda"
        color="green"
      />

      <Card
        title="Prihvaćene"
        value={statistics.accepted}
        subtitle={formatCurrency(
          statistics.acceptedValue,
        )}
        color="purple"
      />

      <Card
        title="U obradi"
        value={statistics.inProgress}
        subtitle={formatCurrency(
          statistics.pendingValue,
        )}
        color="amber"
      />

      <Card
        title="Odbijene"
        value={statistics.rejected}
        subtitle={formatCurrency(
          statistics.rejectedValue,
        )}
        color="red"
      />

      <Card
        title="Uspješnost"
        value={`${statistics.successRate.toFixed(
          1,
        )}%`}
        subtitle="Prihvaćene od svih odlučenih"
        color="slate"
      />
    </div>
  )
}
