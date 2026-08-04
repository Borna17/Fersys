import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  title: string
  value: string
  change: string
  icon: LucideIcon
  variant?: 'blue' | 'green' | 'purple' | 'red'
}

const variantStyles = {
  blue: {
    icon: 'bg-blue-500/15 text-blue-400',
    change: 'text-blue-400',
  },
  green: {
    icon: 'bg-emerald-500/15 text-emerald-400',
    change: 'text-emerald-400',
  },
  purple: {
    icon: 'bg-violet-500/15 text-violet-400',
    change: 'text-violet-400',
  },
  red: {
    icon: 'bg-red-500/15 text-red-400',
    change: 'text-red-400',
  },
}

export default function StatCard({
  title,
  value,
  change,
  icon: Icon,
  variant = 'blue',
}: StatCardProps) {
  const styles = variantStyles[variant]

  return (
    <article className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:shadow-xl hover:shadow-black/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-4 text-4xl font-extrabold tracking-tight text-white">
            {value}
          </p>
        </div>

        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}
        >
          <Icon size={24} />
        </div>
      </div>

      <p className={`mt-5 text-sm font-semibold ${styles.change}`}>
        {change}
      </p>
    </article>
  )
}
