import {
  Cable,
  Cog,
  Hammer,
  Wrench,
} from 'lucide-react'

type FersysLoaderProps = {
  text?: string
  fullScreen?: boolean
  compact?: boolean
}

const tools = [
  { icon: Wrench, label: 'Ključ' },
  { icon: Cable, label: 'Kabel' },
  { icon: Hammer, label: 'Čekić' },
  { icon: Cog, label: 'Oprema' },
]

export default function FersysLoader({
  text = 'Učitavanje podataka...',
  fullScreen = false,
  compact = false,
}: FersysLoaderProps) {
  const content = (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? 'min-h-32 gap-3' : 'min-h-64 gap-5'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-2 shadow-xl shadow-black/20">
        {tools.map((tool, index) => {
          const Icon = tool.icon

          return (
            <div
              key={tool.label}
              className="fersys-tool grid h-11 w-11 place-items-center rounded-xl bg-slate-800 text-blue-400"
              style={{ animationDelay: `${index * 180}ms` }}
            >
              <Icon size={21} />
            </div>
          )
        })}
      </div>

      <div>
        <p className="text-sm font-black text-white">{text}</p>
        <p className="mt-1 text-xs text-slate-500">
          FERSYS priprema sadržaj
        </p>
      </div>

      <style>{`
        @keyframes fersysToolPulse {
          0%, 100% {
            opacity: 0.42;
            transform: translateY(0) scale(0.96);
          }

          40% {
            opacity: 1;
            transform: translateY(-3px) scale(1);
          }
        }

        .fersys-tool {
          animation: fersysToolPulse 1.35s ease-in-out infinite;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .fersys-tool {
            animation: none;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </div>
  )

  if (!fullScreen) {
    return content
  }

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/90 p-5 backdrop-blur-sm">
      {content}
    </div>
  )
}

