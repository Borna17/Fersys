import type { LucideIcon } from 'lucide-react'
import {
  Bot, Box, BriefcaseBusiness, CalendarDays, Check, CheckCircle2,
  ChevronDown, ChevronUp, ClipboardList, FileText, PartyPopper,
  PenLine, Sparkles, UserPlus, UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { getCustomers } from '../services/customers.service'
import { getEmployees } from '../services/employees.service'
import { getOffers } from '../services/offers.service'
import { getWorkOrders } from '../services/workOrders.service'
import {
  getCalendarEventCount, getInventoryItemCount, getMissionFlags,
  markAiMissionOpened, markMissionCelebrationSeen,
} from '../services/missionCenter.service'

type Task = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  completed: boolean
  route: string
  action: string
  animation: 'customer'|'order'|'offer'|'employee'|'calendar'|'inventory'|'ai'
}

type Data = {
  customers: number
  orders: number
  offers: number
  employees: number
  calendar: number
  inventory: number
  aiOpened: boolean
  celebrationSeen: boolean
}

const emptyData: Data = {
  customers: 0, orders: 0, offers: 0, employees: 0,
  calendar: 0, inventory: 0, aiOpened: false, celebrationSeen: false,
}

export default function MissionCenter() {
  const navigate = useNavigate()
  const [data, setData] = useState<Data>(emptyData)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [customers, orders, offers, employees, calendar, inventory, flags] =
          await Promise.all([
            getCustomers(), getWorkOrders(), getOffers(), getEmployees(),
            getCalendarEventCount(), getInventoryItemCount(), getMissionFlags(),
          ])

        if (!cancelled) {
          setData({
            customers: customers.length,
            orders: orders.length,
            offers: offers.length,
            employees: employees.length,
            calendar,
            inventory,
            aiOpened: flags.aiOpened,
            celebrationSeen: flags.celebrationSeen,
          })
        }
      } catch (error) {
        console.error('Mission Center:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    window.addEventListener('focus', load)
    window.addEventListener('fersys:mission-refresh', load)

    return () => {
      cancelled = true
      window.removeEventListener('focus', load)
      window.removeEventListener('fersys:mission-refresh', load)
    }
  }, [])

  const tasks = useMemo<Task[]>(() => [
    {
      id: 'customer', title: 'Dodaj prvog investitora',
      description: 'Unesi osobu, tvrtku ili zgradu.',
      icon: UserPlus, completed: data.customers > 0,
      route: '/customers', action: 'Dodaj investitora', animation: 'customer',
    },
    {
      id: 'order', title: 'Napravi prvi radni nalog',
      description: 'Poveži investitora, opis posla i radnike.',
      icon: ClipboardList, completed: data.orders > 0,
      route: '/work-orders/new', action: 'Novi nalog', animation: 'order',
    },
    {
      id: 'offer', title: 'Izradi prvu ponudu',
      description: 'Dodaj stavke i pripremi dokument.',
      icon: FileText, completed: data.offers > 0,
      route: '/offers/new', action: 'Nova ponuda', animation: 'offer',
    },
    {
      id: 'employee', title: 'Dodaj zaposlenika',
      description: 'Pozovi prvog člana tima.',
      icon: UsersRound, completed: data.employees > 1,
      route: '/settings/employees', action: 'Zaposlenici', animation: 'employee',
    },
    {
      id: 'calendar', title: 'Dodaj prvi termin',
      description: 'Isplaniraj posao u kalendaru.',
      icon: CalendarDays, completed: data.calendar > 0,
      route: '/calendar', action: 'Otvori kalendar', animation: 'calendar',
    },
    {
      id: 'inventory', title: 'Dodaj prvi artikl',
      description: 'Postavi početno stanje skladišta.',
      icon: Box, completed: data.inventory > 0,
      route: '/inventory/items/new', action: 'Dodaj artikl', animation: 'inventory',
    },
    {
      id: 'ai', title: 'Isprobaj AI pomoćnika',
      description: 'Postavi pitanje ili pripremi termin.',
      icon: Bot, completed: data.aiOpened,
      route: '/ai', action: 'Pokreni AI', animation: 'ai',
    },
  ], [data])

  const completed = tasks.filter(task => task.completed).length
  const progress = Math.round((completed / tasks.length) * 100)
  const allDone = completed === tasks.length

  async function openTask(task: Task) {
    if (task.id === 'ai' && !task.completed) {
      try {
        await markAiMissionOpened()
        setData(current => ({ ...current, aiOpened: true }))
      } catch (error) {
        console.error(error)
      }
    }
    navigate(task.route)
  }

  async function finishCelebration() {
    try {
      await markMissionCelebrationSeen()
      setData(current => ({ ...current, celebrationSeen: true }))
    } catch (error) {
      console.error(error)
    }
  }

  if (loading) {
    return <div className="h-32 animate-pulse rounded-3xl border border-slate-800 bg-slate-900" />
  }

  if (allDone && data.celebrationSeen) return null

  if (allDone) {
    return (
      <section className="relative overflow-hidden rounded-3xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-blue-500/10 p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-5">
            <div className="mission-bounce grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-400">
              <PartyPopper size={31} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-400">FERSYS SETUP ZAVRŠEN</p>
              <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">Tvoja tvrtka je spremna za rad.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">Završio si sve prve korake i upoznao glavne funkcije aplikacije.</p>
            </div>
          </div>
          <button type="button" onClick={() => void finishCelebration()}
            className="min-h-12 rounded-xl bg-emerald-500 px-5 font-black text-slate-950">
            Nastavi u FERSYS
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-violet-500/10">
      <header className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-4">
          <div className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-400">
            <BriefcaseBusiness size={25} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-400">FERSYS SETUP</p>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-black text-blue-300">
                {completed}/{tasks.length} završeno
              </span>
            </div>
            <h2 className="mt-2 text-xl font-black text-white sm:text-2xl">Pokreni svoju tvrtku</h2>
            <p className="mt-1 text-sm text-slate-400">Završi stvarne zadatke i upoznaj FERSYS kroz rad.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="min-w-32">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Napredak</span>
              <span className="font-black text-blue-400">{progress}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-700"
                style={{ width: `${progress}%` }} />
            </div>
          </div>
          <button type="button" onClick={() => setExpanded(value => !value)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300">
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </header>

      {expanded && (
        <div className="border-t border-slate-800/80 p-4 sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {tasks.map(task => (
              <TaskCard key={task.id} task={task} onClick={() => void openTask(task)} />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes missionBounce { 50% { transform: translateY(-5px); } }
        @keyframes missionWrite { 50% { transform: translate(-7px,-5px) rotate(-20deg); } }
        @keyframes missionPulse { 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes missionLine { 50% { transform: scaleX(1); } }
        .mission-bounce { animation: missionBounce 1.5s ease-in-out infinite; }
        .mission-pen { animation: missionWrite 1.6s ease-in-out infinite; }
        .mission-pulse { animation: missionPulse 1.6s ease-in-out infinite; opacity:.7; }
        .mission-line { transform:scaleX(.25); transform-origin:left; animation:missionLine 1.7s ease-in-out infinite; }
      `}</style>
    </section>
  )
}

function TaskCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const Icon = task.icon

  return (
    <button type="button" onClick={onClick}
      className={`group min-h-52 rounded-2xl border p-4 text-left transition duration-300 ${
        task.completed
          ? 'border-emerald-500/25 bg-emerald-500/[0.07]'
          : 'border-slate-800 bg-slate-950/55 hover:-translate-y-1 hover:border-blue-500/35'
      }`}>
      <div className="flex items-start justify-between">
        <div className={`relative grid h-16 w-16 place-items-center overflow-hidden rounded-2xl border ${
          task.completed
            ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
            : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
        }`}>
          <Icon size={28} />
          {!task.completed && task.animation === 'order' && <PenLine size={15} className="mission-pen absolute bottom-2 right-2 text-violet-300" />}
          {!task.completed && task.animation === 'offer' && <span className="mission-line absolute bottom-2 left-3 right-3 h-1 rounded bg-blue-400/70" />}
          {!task.completed && ['customer','employee','calendar','inventory','ai'].includes(task.animation) && <Sparkles size={14} className="mission-pulse absolute right-2 top-2 text-violet-300" />}
        </div>
        <span className={`grid h-8 w-8 place-items-center rounded-full border ${
          task.completed
            ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
            : 'border-slate-700 bg-slate-800 text-slate-600'
        }`}>
          {task.completed ? <Check size={17} /> : <span className="h-2 w-2 rounded-full bg-slate-600" />}
        </span>
      </div>

      <h3 className={`mt-5 font-black ${task.completed ? 'text-emerald-300' : 'text-white'}`}>
        {task.title}
      </h3>
      <p className="mt-2 text-xs leading-5 text-slate-500">{task.description}</p>
      <div className={`mt-5 inline-flex items-center gap-2 text-xs font-black ${
        task.completed ? 'text-emerald-400' : 'text-blue-400'
      }`}>
        {task.completed ? <><CheckCircle2 size={15} /> Završeno</> : <><Sparkles size={15} /> {task.action}</>}
      </div>
    </button>
  )
}

