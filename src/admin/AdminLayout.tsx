import {
  ArrowLeft,
  Building2,
  Gauge,
  Headphones,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from 'lucide-react'
import {
  NavLink,
  Outlet,
  useNavigate,
} from 'react-router'

import { supabase } from '../lib/supabase'

const items = [
  {
    name: 'Pregled',
    path: '/admin',
    icon: Gauge,
  },
  {
    name: 'Tvrtke',
    path: '/admin/companies',
    icon: Building2,
  },
  {
    name: 'Podrška',
    path: '/admin/support',
    icon: Headphones,
  },
]

export default function AdminLayout() {
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login', {
      replace: true,
    })
  }

  function returnToDashboard() {
    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-dvh bg-slate-950 text-white">
      <aside className="hidden w-72 shrink-0 border-r border-slate-800 bg-slate-900 md:flex md:flex-col">
        <div className="flex h-24 items-center gap-3 border-b border-slate-800 px-6">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-600">
            <ShieldCheck size={24} />
          </div>

          <div>
            <p className="text-xl font-black">
              FERSYS Admin
            </p>

            <p className="text-xs text-slate-500">
              Platforma
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {items.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={
                  item.path === '/admin'
                }
                className={({
                  isActive,
                }) =>
                  `flex h-12 items-center gap-3 rounded-xl px-4 text-sm font-bold transition ${
                    isActive
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={20} />
                {item.name}
              </NavLink>
            )
          })}
        </nav>

        <div className="space-y-2 border-t border-slate-800 p-4">
          <button
            type="button"
            onClick={returnToDashboard}
            className="flex h-12 w-full items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 text-sm font-bold text-blue-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-200"
          >
            <LayoutDashboard size={19} />
            Povratak na Dashboard
          </button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="flex h-12 w-full items-center gap-3 rounded-xl px-4 text-sm font-bold text-red-400 transition hover:bg-red-500/10"
          >
            <LogOut size={19} />
            Odjava
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
        <button
          type="button"
          onClick={returnToDashboard}
          className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-slate-300 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-200 md:hidden"
        >
          <ArrowLeft size={18} />
          Povratak na Dashboard
        </button>

        <Outlet />
      </main>
    </div>
  )
}