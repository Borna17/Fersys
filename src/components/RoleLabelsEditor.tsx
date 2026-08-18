import {
  Pencil,
  RotateCcw,
  Save,
  Tags,
  X,
} from 'lucide-react'
import {
  useEffect,
  useState,
} from 'react'

import {
  roleLabels as defaultRoleLabels,
  type CompanyRole,
} from '../auth/permissions'
import { useAuth } from '../auth/AuthProvider'
import {
  resetCompanyRoleLabels,
  saveCompanyRoleLabels,
  useCompanyRoleLabelsSync,
} from '../services/companyRoleLabels.service'

const editableRoles: Exclude<CompanyRole, 'owner'>[] = [
  'admin',
  'manager',
  'worker',
  'assistant',
  'intern',
  'accounting',
  'viewer',
]

export default function RoleLabelsEditor() {
  const { role } = useAuth()
  const { labels } = useCompanyRoleLabelsSync()

  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState(labels)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDraft(labels)
  }, [labels])

  if (role !== 'owner') {
    return null
  }

  async function save() {
    try {
      setIsSaving(true)
      setError('')
      await saveCompanyRoleLabels(draft)
      setIsOpen(false)
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Nazive rankova nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function reset() {
    if (
      !window.confirm(
        'Vratiti sve nazive rankova na zadane FERSYS nazive?',
      )
    ) {
      return
    }

    try {
      setIsSaving(true)
      setError('')
      await resetCompanyRoleLabels()
      setDraft({ ...defaultRoleLabels })
    } catch (value) {
      setError(
        value instanceof Error
          ? value.message
          : 'Nazive rankova nije moguće vratiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-5 font-bold text-violet-300 transition hover:bg-violet-500/15"
      >
        <Tags size={18} />
        Nazivi rankova
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <section className="max-h-[92dvh] w-full overflow-hidden rounded-t-[2rem] border border-slate-700 bg-slate-900 shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-800 p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-500/10 text-violet-300">
                  <Pencil size={20} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-white">
                    Nazivi rankova
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Interna prava ostaju ista — mijenja se samo naziv koji vaša tvrtka vidi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-slate-400"
              >
                <X size={18} />
              </button>
            </header>

            <div className="max-h-[62dvh] space-y-3 overflow-y-auto p-5 sm:p-6">
              {error && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              {editableRoles.map((rank) => (
                <label
                  key={rank}
                  className="block rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
                >
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {defaultRoleLabels[rank]}
                  </span>

                  <input
                    value={draft[rank] ?? ''}
                    maxLength={40}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        [rank]: event.target.value,
                      }))
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-bold text-white outline-none focus:border-violet-500"
                  />
                </label>
              ))}
            </div>

            <footer className="flex flex-col-reverse gap-3 border-t border-slate-800 p-5 sm:flex-row sm:justify-between sm:p-6">
              <button
                type="button"
                onClick={() => void reset()}
                disabled={isSaving}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-bold text-slate-300"
              >
                <RotateCcw size={16} />
                Vrati zadane nazive
              </button>

              <button
                type="button"
                onClick={() => void save()}
                disabled={isSaving}
                className="flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white disabled:opacity-50"
              >
                <Save size={16} />
                {isSaving
                  ? 'Spremanje...'
                  : 'Spremi nazive'}
              </button>
            </footer>
          </section>
        </div>
      )}
    </>
  )
}
