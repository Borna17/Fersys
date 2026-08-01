import { Clock3, MapPin, UserRound } from 'lucide-react'

const appointments = [
  {
    time: '08:00',
    title: 'Servis klima uređaja',
    customer: 'Marko Horvat',
    location: 'Slavonski Brod',
    status: 'U tijeku',
  },
  {
    time: '10:30',
    title: 'Montaža bojlera',
    customer: 'Ivana Kovač',
    location: 'Sibinj',
    status: 'Zakazano',
  },
  {
    time: '13:00',
    title: 'Pregled instalacija',
    customer: 'Adriatic d.o.o.',
    location: 'Đakovo',
    status: 'Zakazano',
  },
]

export default function TodaySchedule() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">
            Današnji raspored
          </h3>

          <p className="mt-1 text-sm text-slate-400">
            Pregled zakazanih poslova za danas.
          </p>
        </div>

        <button
          type="button"
          className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700 hover:text-white"
        >
          Otvori kalendar
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {appointments.map((appointment) => (
          <article
            key={`${appointment.time}-${appointment.title}`}
            className="flex flex-col gap-4 rounded-2xl bg-slate-800/70 p-4 transition hover:bg-slate-800 lg:flex-row lg:items-center"
          >
            <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 font-bold text-blue-400">
              {appointment.time}
            </div>

            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-white">
                {appointment.title}
              </h4>

              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                <span className="flex items-center gap-2">
                  <UserRound size={16} />
                  {appointment.customer}
                </span>

                <span className="flex items-center gap-2">
                  <MapPin size={16} />
                  {appointment.location}
                </span>

                <span className="flex items-center gap-2">
                  <Clock3 size={16} />
                  Danas
                </span>
              </div>
            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                appointment.status === 'U tijeku'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {appointment.status}
            </span>
          </article>
        ))}
      </div>
    </section>
  )
}
