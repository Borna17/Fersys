import type { LucideIcon } from 'lucide-react'
import {
  Bot,
  Box,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  PenLine,
  Sparkles,
  UserPlus,
  UsersRound,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { getCustomers } from '../services/customers.service'
import { getEmployees } from '../services/employees.service'
import { getOffers } from '../services/offers.service'
import { getWorkOrders } from '../services/workOrders.service'
import {
  getCalendarEventCount,
  getInventoryItemCount,
  getMissionFlags,
  markAiMissionOpened,
} from '../services/missionCenter.service'

type Task = {
  id: string
  title: string
  description: string
  icon: LucideIcon
  completed: boolean
  route: string
  action: string
  animation:
    | 'customer'
    | 'order'
    | 'offer'
    | 'employee'
    | 'calendar'
    | 'inventory'
    | 'ai'
}

type Data = {
  customers: number
  orders: number
  offers: number
  employees: number
  calendar: number
  inventory: number
  aiOpened: boolean
}

const emptyData: Data = {
  customers: 0,
  orders: 0,
  offers: 0,
  employees: 0,
  calendar: 0,
  inventory: 0,
  aiOpened: false,
}

export default function MissionCenter() {
  const navigate = useNavigate()
  const [data, setData] = useState<Data>(emptyData)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 768px)').matches
      : false,
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const results = await Promise.allSettled([
          getCustomers(),
          getWorkOrders(),
          getOffers(),
          getEmployees(),
          getCalendarEventCount(),
          getInventoryItemCount(),
          getMissionFlags(),
        ])

        if (cancelled) return

        function readResult<T>(
          index: number,
          fallback: T,
        ): T {
          const result = results[index]

          if (result?.status === 'fulfilled') {
            return result.value as T
          }

          if (result?.status === 'rejected') {
            console.error(
              'Mission Center task load:',
              result.reason,
            )
          }

          return fallback
        }

        const customers = readResult(0, [] as unknown[])
        const orders = readResult(1, [] as unknown[])
        const offers = readResult(2, [] as unknown[])
        const employees = readResult(3, [] as unknown[])
        const calendar = readResult(4, 0)
        const inventory = readResult(5, 0)
        const flags = readResult(6, {
          aiOpened: false,
        })

        setData({
          customers: Array.isArray(customers)
            ? customers.length
            : 0,
          orders: Array.isArray(orders)
            ? orders.length
            : 0,
          offers: Array.isArray(offers)
            ? offers.length
            : 0,
          employees: Array.isArray(employees)
            ? employees.length
            : 0,
          calendar: Number(calendar) || 0,
          inventory: Number(inventory) || 0,
          aiOpened: Boolean(flags?.aiOpened),
        })
      } catch (error) {
        console.error('Mission Center:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    const refresh = () => {
      void load()
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('pageshow', refresh)
    window.addEventListener('storage', refresh)
    window.addEventListener(
      'fersys:mission-refresh',
      refresh,
    )

    return () => {
      cancelled = true
      window.removeEventListener('focus', refresh)
      window.removeEventListener('pageshow', refresh)
      window.removeEventListener('storage', refresh)
      window.removeEventListener(
        'fersys:mission-refresh',
        refresh,
      )
    }
  }, [])

  const tasks = useMemo<Task[]>(
    () => [
      {
        id: 'customer',
        title: 'Dodaj prvog investitora',
        description: 'Unesi osobu, tvrtku ili zgradu.',
        icon: UserPlus,
        completed: data.customers > 0,
        route: '/customers',
        action: 'Dodaj investitora',
        animation: 'customer',
      },
      {
        id: 'order',
        title: 'Napravi prvi radni nalog',
        description:
          'Poveži investitora, opis posla i radnike.',
        icon: ClipboardList,
        completed: data.orders > 0,
        route: '/work-orders/new',
        action: 'Novi nalog',
        animation: 'order',
      },
      {
        id: 'offer',
        title: 'Izradi prvu ponudu',
        description:
          'Dodaj stavke i pripremi dokument.',
        icon: FileText,
        completed: data.offers > 0,
        route: '/offers/new',
        action: 'Nova ponuda',
        animation: 'offer',
      },
      {
        id: 'employee',
        title: 'Dodaj zaposlenika',
        description: 'Pozovi prvog člana tima.',
        icon: UsersRound,
        completed: data.employees > 1,
        route: '/settings/employees',
        action: 'Zaposlenici',
        animation: 'employee',
      },
      {
        id: 'calendar',
        title: 'Dodaj prvi termin',
        description: 'Isplaniraj posao u kalendaru.',
        icon: CalendarDays,
        completed: data.calendar > 0,
        route: '/calendar',
        action: 'Otvori kalendar',
        animation: 'calendar',
      },
      {
        id: 'inventory',
        title: 'Dodaj prvi artikl',
        description:
          'Postavi početno stanje skladišta.',
        icon: Box,
        completed: data.inventory > 0,
        route: '/inventory/items/new',
        action: 'Dodaj artikl',
        animation: 'inventory',
      },
      {
        id: 'ai',
        title: 'Isprobaj AI pomoćnika',
        description:
          'Postavi pitanje ili pripremi termin.',
        icon: Bot,
        completed: data.aiOpened,
        route: '/ai',
        action: 'Pokreni AI',
        animation: 'ai',
      },
    ],
    [data],
  )

  const completed = tasks.filter(
    (task) => task.completed,
  ).length
  const progress = Math.round(
    (completed / tasks.length) * 100,
  )
  const allDone = completed === tasks.length

  async function openTask(task: Task) {
    if (task.id === 'ai' && !task.completed) {
      try {
        await markAiMissionOpened()
        setData((current) => ({
          ...current,
          aiOpened: true,
        }))
      } catch (error) {
        console.error(error)
      }
    }

    navigate(task.route)
  }

  if (loading) {
    return (
      <div className="h-20 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 sm:h-32 sm:rounded-3xl" />
    )
  }

  // Kad su svi početni koraci završeni, setup više ne zauzima
  // prostor na Početnoj. Korisnik ga ne mora ručno zatvarati.
  if (allDone) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-violet-500/10 sm:rounded-3xl">
      <header className="flex items-center gap-3 p-3 sm:p-6 lg:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-400 sm:h-13 sm:w-13 sm:rounded-2xl">
            <BriefcaseBusiness size={22} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-blue-400 sm:text-xs sm:tracking-[0.18em]">
                FERSYS SETUP
              </p>
              <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-1 text-[9px] font-black text-blue-300 sm:text-[10px]">
                {completed}/{tasks.length}
              </span>
            </div>

            <p className="mt-1 truncate text-sm font-black text-white sm:text-xl">
              Dovrši postavljanje tvrtke
            </p>
            <p className="mt-0.5 hidden text-sm text-slate-400 sm:block">
              Završi stvarne zadatke i upoznaj FERSYS kroz rad.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="hidden min-w-32 sm:block">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">
                Napredak
              </span>
              <span className="font-black text-blue-400">
                {progress}%
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setExpanded((value) => !value)
            }
            className="grid h-10 w-10 place-items-center rounded-xl border border-slate-700 bg-slate-800 text-slate-300 sm:h-11 sm:w-11"
            aria-label={
              expanded
                ? 'Smanji FERSYS setup'
                : 'Otvori FERSYS setup'
            }
          >
            {expanded ? (
              <ChevronUp size={19} />
            ) : (
              <ChevronDown size={19} />
            )}
          </button>
        </div>
      </header>

      {!expanded && (
        <div className="h-1 bg-slate-800/70">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-blue-500 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {expanded && (
        <div className="border-t border-slate-800/80 p-3 sm:p-6">
          <div className="grid gap-2 sm:gap-3 md:grid-cols-2 xl:grid-cols-4">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() =>
                  void openTask(task)
                }
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes missionWrite { 50% { transform: translate(-7px,-5px) rotate(-20deg); } }
        @keyframes missionPulse { 50% { transform: scale(1.15); opacity: 1; } }
        @keyframes missionLine { 50% { transform: scaleX(1); } }
        .mission-pen { animation: missionWrite 1.6s ease-in-out infinite; }
        .mission-pulse { animation: missionPulse 1.6s ease-in-out infinite; opacity:.7; }
        .mission-line { transform:scaleX(.25); transform-origin:left; animation:missionLine 1.7s ease-in-out infinite; }
      `}</style>
    </section>
  )
}

function TaskCard({
  task,
  onClick,
}: {
  task: Task
  onClick: () => void
}) {
  const Icon = task.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group min-h-36 rounded-2xl border p-3 text-left transition duration-300 sm:min-h-52 sm:p-4 ${
        task.completed
          ? 'border-emerald-500/25 bg-emerald-500/[0.07]'
          : 'border-slate-800 bg-slate-950/55 hover:-translate-y-1 hover:border-blue-500/35'
      }`}
    >
      <div className="flex items-start justify-between">
        <div
          className={`relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border sm:h-16 sm:w-16 sm:rounded-2xl ${
            task.completed
              ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
              : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
          }`}
        >
          <Icon size={22} />
          {!task.completed &&
            task.animation === 'order' && (
              <PenLine
                size={13}
                className="mission-pen absolute bottom-1.5 right-1.5 text-violet-300"
              />
            )}
          {!task.completed &&
            task.animation === 'offer' && (
              <span className="mission-line absolute bottom-2 left-3 right-3 h-1 rounded bg-blue-400/70" />
            )}
          {!task.completed &&
            [
              'customer',
              'employee',
              'calendar',
              'inventory',
              'ai',
            ].includes(task.animation) && (
              <Sparkles
                size={12}
                className="mission-pulse absolute right-1.5 top-1.5 text-violet-300"
              />
            )}
        </div>

        <span
          className={`grid h-7 w-7 place-items-center rounded-full border sm:h-8 sm:w-8 ${
            task.completed
              ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
              : 'border-slate-700 bg-slate-800 text-slate-600'
          }`}
        >
          {task.completed ? (
            <Check size={15} />
          ) : (
            <span className="h-2 w-2 rounded-full bg-slate-600" />
          )}
        </span>
      </div>

      <h3
        className={`mt-3 text-sm font-black sm:mt-5 sm:text-base ${
          task.completed
            ? 'text-emerald-300'
            : 'text-white'
        }`}
      >
        {task.title}
      </h3>
      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 sm:mt-2">
        {task.description}
      </p>
      <div
        className={`mt-3 inline-flex items-center gap-2 text-xs font-black sm:mt-5 ${
          task.completed
            ? 'text-emerald-400'
            : 'text-blue-400'
        }`}
      >
        {task.completed ? (
          <>
            <CheckCircle2 size={14} />
            Završeno
          </>
        ) : (
          <>
            <Sparkles size={14} />
            {task.action}
          </>
        )}
      </div>
    </button>
  )
}
