from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/pages/RegisterPage.tsx',
    "  const [\n    companyName,\n    setCompanyName,\n  ] = useState('')\n",
    "  const [\n    companyName,\n    setCompanyName,\n  ] = useState('')\n\n  const [\n    companyOib,\n    setCompanyOib,\n  ] = useState('')\n",
)

replace_once(
    'src/pages/RegisterPage.tsx',
    "      !companyName.trim() ||\n      !normalizedEmail ||",
    "      !companyName.trim() ||\n      !companyOib.trim() ||\n      !normalizedEmail ||",
)

replace_once(
    'src/pages/RegisterPage.tsx',
    "    const currentPasswordError =\n      getPasswordError(\n        password,\n      )\n",
    "    const normalizedCompanyOib =\n      companyOib.replace(/\\D/g, '')\n\n    if (!/^\\d{11}$/.test(normalizedCompanyOib)) {\n      setError(\n        'OIB tvrtke ili obrta mora sadržavati točno 11 znamenki.',\n      )\n      return\n    }\n\n    const currentPasswordError =\n      getPasswordError(\n        password,\n      )\n",
)

replace_once(
    'src/pages/RegisterPage.tsx',
    "                company_name:\n                  companyName.trim(),\n                account_type:",
    "                company_name:\n                  companyName.trim(),\n                company_oib:\n                  normalizedCompanyOib,\n                account_type:",
)

replace_once(
    'src/pages/RegisterPage.tsx',
    "                </div>\n\n                <Field\n                  label=\"E-mail adresa\"",
    "                </div>\n\n                <Field\n                  label=\"OIB tvrtke ili obrta\"\n                  icon={\n                    <Building2\n                      size={19}\n                    />\n                  }\n                >\n                  <input\n                    type=\"text\"\n                    inputMode=\"numeric\"\n                    autoComplete=\"off\"\n                    value={companyOib}\n                    onChange={(event) =>\n                      setCompanyOib(\n                        event.target.value\n                          .replace(/\\D/g, '')\n                          .slice(0, 11),\n                      )\n                    }\n                    placeholder=\"11 znamenki OIB-a\"\n                    maxLength={11}\n                    className=\"auth-input\"\n                  />\n                </Field>\n\n                <Field\n                  label=\"E-mail adresa\"",
)

replace_once(
    'src/pages/RegisterPage.tsx',
    '              Prvi korisnik automatski postaje vlasnik tvrtke.',
    '              Nova tvrtka postaje aktivna nakon provjere FERSYS administratora.',
)

replace_once(
    'src/pages/RegisterPage.tsx',
    "        'Registracija je uspješna. Provjeri e-mail i potvrdi račun, a zatim se prijavi.',",
    "        'Registracija je zaprimljena. Provjeri e-mail i potvrdi račun. Nakon potvrde FERSYS administrator će pregledati prijavu i aktivirati tvrtku.',",
)

p = Path('src/auth/AuthProvider.tsx')
text = p.read_text(encoding='utf-8')
needle = "        await ensureCompanyForCurrentUser()\n\n        const nextMembership ="
replacement = "        await ensureCompanyForCurrentUser()\n\n        void supabase.functions\n          .invoke('company-registration-notify')\n          .catch(() => undefined)\n\n        const nextMembership ="
if needle not in text:
    raise SystemExit('AuthProvider prepareCompany pattern not found')
text = text.replace(needle, replacement, 1)
needle = "      await ensureCompanyForCurrentUser()\n      const nextMembership ="
replacement = "      await ensureCompanyForCurrentUser()\n      void supabase.functions\n        .invoke('company-registration-notify')\n        .catch(() => undefined)\n      const nextMembership ="
if needle not in text:
    raise SystemExit('AuthProvider retry pattern not found')
text = text.replace(needle, replacement, 1)
p.write_text(text, encoding='utf-8')

replace_once(
    'src/router/AppRouter.tsx',
    "  if (!membership || membership.status !== 'active') {\n    return <AccessDeniedPage title=\"Račun nema aktivan pristup\" description=\"Obrati se vlasniku ili administratoru tvrtke.\" />\n  }",
    "  if (membership?.role === 'owner' && membership.status === 'inactive') {\n    return <AccessDeniedPage title=\"Registracija čeka potvrdu\" description=\"Tvoja prijava je zaprimljena. FERSYS administrator mora potvrditi tvrtku prije prvog korištenja. Dobit ćeš pristup čim prijava bude odobrena.\" />\n  }\n  if (membership?.role === 'owner' && membership.status === 'blocked') {\n    return <AccessDeniedPage title=\"Registracija nije odobrena\" description=\"Za dodatne informacije obrati se FERSYS podršci.\" />\n  }\n  if (!membership || membership.status !== 'active') {\n    return <AccessDeniedPage title=\"Račun nema aktivan pristup\" description=\"Obrati se vlasniku ili administratoru tvrtke.\" />\n  }",
)

Path('src/admin/services/companyVerification.service.ts').write_text("""import { supabase } from '../../lib/supabase'\n\nexport type CompanyRegistrationRequest = {\n  companyId: string\n  companyName: string\n  companyOib: string\n  companyCode: string\n  ownerId: string\n  ownerName: string\n  ownerEmail: string\n  submittedAt: string\n  verificationStatus: 'pending' | 'rejected'\n  rejectionReason: string\n}\n\nexport async function getCompanyRegistrationRequests(): Promise<CompanyRegistrationRequest[]> {\n  const { data, error } = await supabase.rpc('admin_get_pending_company_registrations_v1')\n  if (error) throw error\n  return (data ?? []).map((row: Record<string, unknown>) => ({\n    companyId: String(row.company_id ?? ''),\n    companyName: String(row.company_name ?? ''),\n    companyOib: String(row.company_oib ?? ''),\n    companyCode: String(row.company_code ?? ''),\n    ownerId: String(row.owner_id ?? ''),\n    ownerName: String(row.owner_name ?? ''),\n    ownerEmail: String(row.owner_email ?? ''),\n    submittedAt: String(row.submitted_at ?? ''),\n    verificationStatus: String(row.verification_status ?? 'pending') as 'pending' | 'rejected',\n    rejectionReason: String(row.rejection_reason ?? ''),\n  }))\n}\n\nexport async function approveCompanyRegistration(companyId: string): Promise<void> {\n  const { error } = await supabase.rpc('admin_approve_company_registration_v1', { requested_company_id: companyId })\n  if (error) throw error\n}\n\nexport async function rejectCompanyRegistration(companyId: string, reason: string): Promise<void> {\n  const { error } = await supabase.rpc('admin_reject_company_registration_v1', {\n    requested_company_id: companyId,\n    requested_reason: reason.trim() || null,\n  })\n  if (error) throw error\n}\n""", encoding='utf-8')

Path('src/admin/AdminCompanyVerificationPanel.tsx').write_text("""import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, XCircle } from 'lucide-react'\nimport { useCallback, useEffect, useMemo, useState } from 'react'\n\nimport {\n  approveCompanyRegistration,\n  getCompanyRegistrationRequests,\n  rejectCompanyRegistration,\n  type CompanyRegistrationRequest,\n} from './services/companyVerification.service'\n\nexport default function AdminCompanyVerificationPanel() {\n  const [items, setItems] = useState<CompanyRegistrationRequest[]>([])\n  const [loading, setLoading] = useState(true)\n  const [workingId, setWorkingId] = useState('')\n  const [error, setError] = useState('')\n\n  const load = useCallback(async () => {\n    try {\n      setLoading(true)\n      setError('')\n      setItems(await getCompanyRegistrationRequests())\n    } catch (value) {\n      setError(value instanceof Error ? value.message : 'Zahtjeve nije moguće učitati.')\n    } finally {\n      setLoading(false)\n    }\n  }, [])\n\n  useEffect(() => { void load() }, [load])\n\n  const pending = useMemo(() => items.filter((item) => item.verificationStatus === 'pending'), [items])\n\n  async function approve(item: CompanyRegistrationRequest) {\n    if (!window.confirm(`Potvrditi tvrtku ${item.companyName} (OIB ${item.companyOib})?`)) return\n    try {\n      setWorkingId(item.companyId)\n      setError('')\n      await approveCompanyRegistration(item.companyId)\n      await load()\n    } catch (value) {\n      setError(value instanceof Error ? value.message : 'Tvrtku nije moguće potvrditi.')\n    } finally {\n      setWorkingId('')\n    }\n  }\n\n  async function reject(item: CompanyRegistrationRequest) {\n    const reason = window.prompt('Razlog odbijanja (opcionalno):', '')\n    if (reason === null) return\n    if (!window.confirm(`Odbiti prijavu za ${item.companyName}?`)) return\n    try {\n      setWorkingId(item.companyId)\n      setError('')\n      await rejectCompanyRegistration(item.companyId, reason)\n      await load()\n    } catch (value) {\n      setError(value instanceof Error ? value.message : 'Prijavu nije moguće odbiti.')\n    } finally {\n      setWorkingId('')\n    }\n  }\n\n  return (\n    <section className=\"mt-7 overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-slate-900 to-violet-500/[0.06]\">\n      <div className=\"flex flex-col gap-4 border-b border-slate-800 p-5 sm:flex-row sm:items-center sm:justify-between\">\n        <div className=\"flex items-start gap-3\">\n          <div className=\"grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-300\"><ShieldCheck size={22} /></div>\n          <div>\n            <div className=\"flex flex-wrap items-center gap-2\">\n              <h2 className=\"text-xl font-black text-white\">Zahtjevi za registraciju</h2>\n              {pending.length > 0 && <span className=\"rounded-full bg-amber-500 px-2.5 py-1 text-xs font-black text-slate-950\">{pending.length} čeka</span>}\n            </div>\n            <p className=\"mt-1 max-w-3xl text-sm leading-6 text-slate-400\">Nova tvrtka ne može koristiti FERSYS dok je ovdje ne potvrdiš. Provjeri naziv, OIB, vlasnika i e-mail prije odobravanja.</p>\n          </div>\n        </div>\n        <button type=\"button\" onClick={() => void load()} disabled={loading} className=\"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-black text-slate-300 disabled:opacity-50\"><RefreshCw size={17} className={loading ? 'animate-spin' : ''} />Osvježi</button>\n      </div>\n\n      {error && <div className=\"m-4 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300\"><AlertTriangle size={18} className=\"mt-0.5 shrink-0\" />{error}</div>}\n\n      {loading ? (\n        <div className=\"p-8 text-center text-sm text-slate-500\">Učitavanje zahtjeva...</div>\n      ) : pending.length === 0 ? (\n        <div className=\"flex items-center gap-3 p-5 text-sm text-slate-400\"><CheckCircle2 size={20} className=\"text-emerald-400\" />Trenutno nema novih prijava koje čekaju potvrdu.</div>\n      ) : (\n        <div className=\"divide-y divide-slate-800\">\n          {pending.map((item) => (\n            <article key={item.companyId} className=\"grid gap-4 p-5 xl:grid-cols-[1.2fr_1fr_auto] xl:items-center\">\n              <div className=\"min-w-0\">\n                <p className=\"font-black text-white\">{item.companyName}</p>\n                <div className=\"mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400\"><span>OIB <strong className=\"text-slate-200\">{item.companyOib || '—'}</strong></span><span>Kod <strong className=\"text-slate-200\">{item.companyCode || '—'}</strong></span></div>\n              </div>\n              <div className=\"text-sm\">\n                <p className=\"font-bold text-slate-200\">{item.ownerName || 'Vlasnik nije naveden'}</p>\n                <p className=\"mt-1 text-xs text-slate-500\">{item.ownerEmail || 'Nema e-maila'}</p>\n                <p className=\"mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500\"><Clock3 size={14} />{item.submittedAt ? new Date(item.submittedAt).toLocaleString('hr-HR') : '—'}</p>\n              </div>\n              <div className=\"grid grid-cols-2 gap-2 xl:w-[230px]\">\n                <button type=\"button\" disabled={workingId === item.companyId} onClick={() => void approve(item)} className=\"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-black text-white hover:bg-emerald-500 disabled:opacity-50\"><CheckCircle2 size={17} />Potvrdi</button>\n                <button type=\"button\" disabled={workingId === item.companyId} onClick={() => void reject(item)} className=\"inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 text-sm font-black text-red-300 hover:bg-red-500/15 disabled:opacity-50\"><XCircle size={17} />Odbij</button>\n              </div>\n            </article>\n          ))}\n        </div>\n      )}\n    </section>\n  )\n}\n""", encoding='utf-8')

replace_once(
    'src/admin/AdminCompaniesPage.tsx',
    "import { Link } from 'react-router'\n\nimport {",
    "import { Link } from 'react-router'\n\nimport AdminCompanyVerificationPanel from './AdminCompanyVerificationPanel'\n\nimport {",
)

replace_once(
    'src/admin/AdminCompaniesPage.tsx',
    "      </div>\n\n      <div className=\"mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">",
    "      </div>\n\n      <AdminCompanyVerificationPanel />\n\n      <div className=\"mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4\">",
)
