import {
  Ban,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation } from 'react-router'

import {
  getAdminCompany,
  updateCompanySubscription,
  type AdminCompany,
} from './services/admin.service'
import {
  getAdminControlInsights,
  updateAdminCompanyMember,
  updateAdminCompanyModules,
  type AdminControlInsights,
  type AdminMemberRole,
  type AdminMemberStatus,
} from './services/adminControl.service'

const moduleOptions = [
  ['work_orders', 'Radni nalozi'],
  ['customers', 'Investitori'],
  ['offers', 'Ponude'],
  ['invoices', 'Izlazni računi'],
  ['incoming_invoices', 'Ulazni računi'],
  ['calendar', 'Kalendar'],
  ['inventory', 'Skladište'],
  ['vehicles', 'Vozila'],
  ['employees', 'Zaposlenici'],
  ['ai', 'AI pomoćnik'],
] as const

const roleLabels: Record<AdminMemberRole, string> = {
  owner: 'Vlasnik',
  admin: 'Admin',
  manager: 'Voditelj',
  worker: 'Radnik',
  assistant: 'Pomoćni',
  intern: 'Praktikant',
  accounting: 'Računovodstvo',
  viewer: 'Pregled',
}

const statusLabels: Record<AdminMemberStatus, string> = {
  active: 'Aktivan',
  inactive: 'Neaktivan',
  blocked: 'Blokiran',
}

const emptyInsights: AdminControlInsights = {
  users: [],
  enabledModules: [],
  moduleSetupCompleted: false,
}

export default function AdminCompanyControlCenter() {
  const location = useLocation()

  const companyId = useMemo(() => {
    const match = location.pathname.match(
      /^\/admin\/companies\/([^/]+)$/,
    )

    return match?.[1] ?? ''
  }, [location.pathname])

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [company, setCompany] = useState<AdminCompany | null>(null)
  const [insights, setInsights] = useState<AdminControlInsights>(emptyInsights)
  const [modules, setModules] = useState<string[]>([])

  useEffect(() => {
    setOpen(false)
    setError('')
    setSuccess('')
  }, [companyId])

  if (!companyId) return null

  async function load() {
    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const [nextCompany, nextInsights] = await Promise.all([
        getAdminCompany(companyId),
        getAdminControlInsights(companyId),
      ])

      if (!nextCompany) {
        throw new Error('Tvrtka nije pronađena.')
      }

      setCompany(nextCompany)
      setInsights(nextInsights)
      setModules(nextInsights.enabledModules)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Kontrole nije moguće učitati.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function openPanel() {
    setOpen(true)
    await load()
  }

  async function updateSubscription(
    status: string,
    trialDays?: number,
  ) {
    if (!company) return

    try {
      setSaving(`subscription:${status}:${trialDays ?? 0}`)
      setError('')
      setSuccess('')

      await updateCompanySubscription({
        companyId,
        planId: company.planId,
        status,
        trialDays,
        note: `Admin Control Center: ${status}${trialDays ? ` +${trialDays} dana` : ''}`,
      })

      setSuccess(
        status === 'blocked'
          ? 'Pristup tvrtki je blokiran.'
          : status === 'active'
            ? 'Tvrtka je aktivirana.'
            : `Trial je produžen za ${trialDays ?? 7} dana.`,
      )

      await load()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Promjenu nije moguće spremiti.',
      )
    } finally {
      setSaving('')
    }
  }

  async function saveModules() {
    try {
      setSaving('modules')
      setError('')
      setSuccess('')

      const saved = await updateAdminCompanyModules(
        companyId,
        modules,
      )

      setModules(saved)
      setInsights((current) => ({
        ...current,
        enabledModules: saved,
        moduleSetupCompleted: true,
      }))
      setSuccess('Moduli tvrtke su spremljeni.')
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Module nije moguće spremiti.',
      )
    } finally {
      setSaving('')
    }
  }

  async function saveMember(
    membershipId: string,
    role: AdminMemberRole,
    status: AdminMemberStatus,
  ) {
    try {
      setSaving(`member:${membershipId}`)
      setError('')
      setSuccess('')

      await updateAdminCompanyMember({
        companyId,
        membershipId,
        role,
        status,
      })

      setSuccess('Korisnik je ažuriran.')
      await load()
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Korisnika nije moguće ažurirati.',
      )
    } finally {
      setSaving('')
    }
  }

  function toggleModule(key: string) {
    setModules((current) =>
      current.includes(key)
        ? current.filter((value) => value !== key)
        : [...current, key],
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void openPanel()}
        className="fixed bottom-5 right-5 z-[120] inline-flex min-h-12 items-center gap-2 rounded-2xl border border-violet-500/30 bg-violet-600 px-4 text-sm font-black text-white shadow-2xl shadow-black/50 transition active:scale-[0.98]"
      >
        <Settings2 size={18} />
        Kontrole
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] bg-slate-950/75 backdrop-blur-sm">
          <div
            className="absolute inset-0"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-2xl flex-col border-l border-slate-800 bg-slate-950 shadow-2xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-violet-400">
                  FERSYS ADMIN V2
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Kontrolni centar
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  {company?.companyName || 'Tvrtka'}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void load()}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-slate-300"
                  aria-label="Osvježi"
                >
                  <RefreshCw size={17} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 text-slate-300"
                  aria-label="Zatvori"
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loading ? (
                <div className="grid min-h-[50vh] place-items-center text-sm font-bold text-slate-500">
                  Učitavanje admin kontrola...
                </div>
              ) : (
                <div className="space-y-5">
                  {error && (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-300">
                      {success}
                    </div>
                  )}

                  <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="text-violet-300" size={20} />
                      <div>
                        <h3 className="font-black text-white">Pristup i pretplata</h3>
                        <p className="text-xs text-slate-500">
                          Paket: {company?.planName ?? '—'} · status: {company?.subscriptionStatus ?? '—'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <ActionButton
                        icon={<CheckCircle2 size={16} />}
                        label="Aktiviraj"
                        disabled={Boolean(saving)}
                        onClick={() => void updateSubscription('active')}
                      />
                      <ActionButton
                        icon={<Ban size={16} />}
                        label="Blokiraj"
                        danger
                        disabled={Boolean(saving)}
                        onClick={() => void updateSubscription('blocked')}
                      />
                      {[7, 14, 30].map((days) => (
                        <ActionButton
                          key={days}
                          icon={<Clock3 size={16} />}
                          label={`Trial +${days}`}
                          disabled={Boolean(saving)}
                          onClick={() => void updateSubscription('trialing', days)}
                        />
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <SlidersHorizontal className="text-blue-300" size={20} />
                        <div>
                          <h3 className="font-black text-white">Moduli tvrtke</h3>
                          <p className="text-xs text-slate-500">
                            Admin može uključiti ili isključiti module ove tvrtke.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={saving === 'modules'}
                        onClick={() => void saveModules()}
                        className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-50"
                      >
                        Spremi
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {moduleOptions.map(([key, label]) => {
                        const active = modules.includes(key)
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleModule(key)}
                            className={`min-h-12 rounded-xl border px-3 text-left text-xs font-black transition ${
                              active
                                ? 'border-blue-500/40 bg-blue-500/15 text-blue-100'
                                : 'border-slate-700 bg-slate-950/50 text-slate-500'
                            }`}
                          >
                            {active ? '✓ ' : ''}{label}
                          </button>
                        )
                      })}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex items-center gap-3">
                      <Users className="text-emerald-300" size={20} />
                      <div>
                        <h3 className="font-black text-white">Korisnici tvrtke</h3>
                        <p className="text-xs text-slate-500">
                          {insights.users.length} korisnika · uloga i status pristupa
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {insights.users.map((member) => (
                        <MemberEditor
                          key={member.id}
                          member={member}
                          saving={saving === `member:${member.id}`}
                          onSave={(role, status) =>
                            void saveMember(member.id, role, status)
                          }
                        />
                      ))}

                      {insights.users.length === 0 && (
                        <div className="rounded-2xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
                          Nema pronađenih članova tvrtke.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-violet-500/15 bg-violet-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="mt-0.5 shrink-0 text-violet-300" size={19} />
                      <p className="text-xs leading-5 text-slate-400">
                        Sve promjene iz ovog kontrolnog centra evidentiraju se u admin aktivnosti. Blokiranje tvrtke radi preko pretplate i ne briše njezine podatke.
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}

function ActionButton({
  icon,
  label,
  danger = false,
  disabled,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  danger?: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-black disabled:opacity-50 ${
        danger
          ? 'border-red-500/25 bg-red-500/10 text-red-300'
          : 'border-slate-700 bg-slate-950/60 text-slate-200'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function MemberEditor({
  member,
  saving,
  onSave,
}: {
  member: AdminControlInsights['users'][number]
  saving: boolean
  onSave: (role: AdminMemberRole, status: AdminMemberStatus) => void
}) {
  const [role, setRole] = useState<AdminMemberRole>(member.role)
  const [status, setStatus] = useState<AdminMemberStatus>(member.status)
  const isOwner = member.role === 'owner'

  useEffect(() => {
    setRole(member.role)
    setStatus(member.status)
  }, [member.role, member.status])

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{member.name}</p>
        <p className="truncate text-xs text-slate-500">{member.email || 'Nema e-maila'}</p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <select
          value={role}
          disabled={isOwner}
          onChange={(event) => setRole(event.target.value as AdminMemberRole)}
          className="min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-60"
        >
          {(Object.keys(roleLabels) as AdminMemberRole[]).map((value) => (
            <option key={value} value={value}>{roleLabels[value]}</option>
          ))}
        </select>

        <select
          value={status}
          disabled={isOwner}
          onChange={(event) => setStatus(event.target.value as AdminMemberStatus)}
          className="min-h-10 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white disabled:opacity-60"
        >
          {(Object.keys(statusLabels) as AdminMemberStatus[]).map((value) => (
            <option key={value} value={value}>{statusLabels[value]}</option>
          ))}
        </select>

        <button
          type="button"
          disabled={saving || isOwner || (role === member.role && status === member.status)}
          onClick={() => onSave(role, status)}
          className="min-h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white disabled:opacity-40"
        >
          {saving ? 'Spremanje...' : 'Spremi'}
        </button>
      </div>
    </div>
  )
}
