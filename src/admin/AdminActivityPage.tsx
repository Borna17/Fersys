import {
  Activity,
  BarChart3,
  Clock3,
  Eye,
  ShieldCheck,
} from 'lucide-react'

import AdminTodayActivity from './AdminTodayActivity'

export function AdminActivityPage() {
  return (
    <section className="mx-auto max-w-[1600px] pb-10">
      <header className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-violet-300">
          <ShieldCheck size={15} />
          Admin nadzor
        </div>

        <div className="mt-4 flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-600/15 text-violet-300">
            <Activity size={24} />
          </div>

          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Aktivnost korisnika
            </h1>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
              Pregled prijava, vremena provedenog u FERSYS-u, otvorenih modula i poslovnih radnji po korisniku i tvrtki.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoCard
            icon={<Clock3 size={18} />}
            title="Vrijeme korištenja"
            text="Prati aktivne sesije i ukupno vrijeme u odabranom razdoblju."
          />
          <InfoCard
            icon={<Eye size={18} />}
            title="Otvoreni moduli"
            text="Vidi koje su dijelove FERSYS-a korisnici otvarali."
          />
          <InfoCard
            icon={<BarChart3 size={18} />}
            title="Poslovne radnje"
            text="Odvojeno prikazuje radnje koje FERSYS već zapisuje u activity log."
          />
        </div>
      </header>

      <AdminTodayActivity />
    </section>
  )
}

function InfoCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-center gap-2 text-violet-300">
        {icon}
        <strong className="text-sm text-white">{title}</strong>
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  )
}
