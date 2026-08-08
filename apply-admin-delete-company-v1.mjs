import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, code) {
  fs.writeFileSync(path, code)
}

function replaceOrThrow(code, search, replacement, label) {
  if (!code.includes(search)) {
    throw new Error(`Nije pronađen dio za izmjenu: ${label}`)
  }
  return code.replace(search, replacement)
}

function patchAdminService() {
  const path = 'src/admin/services/admin.service.ts'
  let code = read(path)

  if (!code.includes('export async function deleteAdminCompany')) {
    code += `\n\nexport type DeleteAdminCompanyResult = {\n  success: boolean\n  companyId: string\n  companyName: string\n  deletedAuthUsers: number\n  keptAuthUsers: number\n  authWarnings: string[]\n}\n\nexport async function deleteAdminCompany(\n  input: {\n    companyId: string\n    confirmation: string\n  },\n): Promise<DeleteAdminCompanyResult> {\n  const { data, error } = await supabase.functions.invoke(\n    'admin-delete-company',\n    {\n      body: {\n        companyId: input.companyId,\n        confirmation: input.confirmation,\n      },\n    },\n  )\n\n  if (error) throw error\n\n  if (data?.error) {\n    throw new Error(String(data.error))\n  }\n\n  if (!data?.success) {\n    throw new Error('Tvrtku nije moguće obrisati.')\n  }\n\n  return {\n    success: true,\n    companyId: String(data.companyId ?? ''),\n    companyName: String(data.companyName ?? ''),\n    deletedAuthUsers: Number(data.deletedAuthUsers ?? 0),\n    keptAuthUsers: Number(data.keptAuthUsers ?? 0),\n    authWarnings: Array.isArray(data.authWarnings)\n      ? data.authWarnings.map((value: unknown) => String(value))\n      : [],\n  }\n}\n`
  }

  write(path, code)
}

function patchAdminCompanyDetails() {
  const path = 'src/admin/AdminCompanyDetailsPage.tsx'
  let code = read(path)

  if (!code.includes('  Trash2,')) {
    code = replaceOrThrow(
      code,
      `  Sparkles,\n  UserRound,`,
      `  Sparkles,\n  Trash2,\n  UserRound,`,
      'Trash2 import',
    )
  }

  if (!code.includes('  deleteAdminCompany,')) {
    code = replaceOrThrow(
      code,
      `import {\n  getAdminCompany,\n  getAdminCompanyInsights,\n  updateCompanySubscription,`,
      `import {\n  deleteAdminCompany,\n  getAdminCompany,\n  getAdminCompanyInsights,\n  updateCompanySubscription,`,
      'deleteAdminCompany import',
    )
  }

  if (!code.includes('deleteConfirmation')) {
    code = replaceOrThrow(
      code,
      `  const [note, setNote] =\n    useState('')`,
      `  const [note, setNote] =\n    useState('')\n\n  const [deleteConfirmation, setDeleteConfirmation] =\n    useState('')\n\n  const [deletingCompany, setDeletingCompany] =\n    useState(false)`,
      'delete state',
    )
  }

  if (!code.includes('async function handleDeleteCompany()')) {
    code = replaceOrThrow(
      code,
      `  async function saveChanges() {`,
      `  async function handleDeleteCompany() {\n    if (!company) return\n\n    const expectedName = company.companyName.trim()\n\n    if (!expectedName) {\n      setError('Tvrtka nema naziv i ne može se obrisati kroz ovu kontrolu.')\n      return\n    }\n\n    if (deleteConfirmation.trim() !== expectedName) {\n      setError('Za potvrdu upiši točan naziv tvrtke.')\n      return\n    }\n\n    const confirmed = window.confirm(\n      \`Trajno obrisati tvrtku "\${expectedName}" i sve njezine podatke? Ova radnja se ne može poništiti.\`,\n    )\n\n    if (!confirmed) return\n\n    try {\n      setDeletingCompany(true)\n      setError('')\n      setSuccess('')\n\n      const result = await deleteAdminCompany({\n        companyId: company.companyId,\n        confirmation: deleteConfirmation.trim(),\n      })\n\n      if (result.authWarnings.length > 0) {\n        window.alert(\n          \`Tvrtka je obrisana, ali \${result.authWarnings.length} Auth korisnika nije automatski obrisano. Provjeri Supabase Auth.\`,\n        )\n      }\n\n      navigate('/admin/companies', { replace: true })\n    } catch (value) {\n      setError(\n        value instanceof Error\n          ? value.message\n          : 'Tvrtku nije moguće obrisati.',\n      )\n    } finally {\n      setDeletingCompany(false)\n    }\n  }\n\n  async function saveChanges() {`,
      'delete handler',
    )
  }

  const oldBlock = `          <article className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-6">\n            <div className="flex gap-3">\n              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-300">\n                <ShieldBan\n                  size={21}\n                />\n              </span>\n\n              <div>\n                <h2 className="font-black">\n                  Administrativna kontrola\n                </h2>\n\n                <p className="mt-2 text-sm leading-6 text-slate-400">\n                  Za privremenu zabranu pristupa postavi status na\n                  <strong className="text-amber-200">\n                    {' '}\n                    Blokirano\n                  </strong>\n                  . Brisanje tvrtke i prijava kao korisnik namjerno nisu uključeni.\n                </p>\n              </div>\n            </div>\n          </article>`

  const newBlock = `          <article className="rounded-3xl border border-red-500/25 bg-red-500/5 p-6">\n            <div className="flex gap-3">\n              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500/10 text-red-300">\n                <Trash2 size={21} />\n              </span>\n\n              <div className="min-w-0 flex-1">\n                <h2 className="font-black text-red-200">\n                  Opasna zona\n                </h2>\n\n                <p className="mt-2 text-sm leading-6 text-slate-400">\n                  Koristi samo za testne račune. Brisanjem se trajno uklanja tvrtka, njezini poslovni podaci, članstva i Auth računi korisnika koji nisu članovi drugih tvrtki.\n                </p>\n\n                <div className="mt-5 rounded-2xl border border-red-500/15 bg-slate-950/50 p-4">\n                  <p className="text-xs font-black uppercase tracking-wider text-red-300">\n                    Za potvrdu upiši naziv tvrtke\n                  </p>\n\n                  <p className="mt-2 break-words text-sm font-black text-white">\n                    {company.companyName}\n                  </p>\n\n                  <input\n                    type="text"\n                    value={deleteConfirmation}\n                    onChange={(event) => setDeleteConfirmation(event.target.value)}\n                    autoComplete="off"\n                    placeholder="Upiši točan naziv tvrtke"\n                    className="mt-3 h-12 w-full rounded-xl border border-red-500/20 bg-slate-950 px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-red-500"\n                  />\n\n                  <button\n                    type="button"\n                    onClick={() => void handleDeleteCompany()}\n                    disabled={\n                      deletingCompany ||\n                      deleteConfirmation.trim() !== company.companyName.trim()\n                    }\n                    className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 font-black text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"\n                  >\n                    <Trash2 size={18} />\n                    {deletingCompany\n                      ? 'Brisanje...'\n                      : 'Trajno obriši testnu tvrtku'}\n                  </button>\n                </div>\n\n                <div className="mt-4 flex gap-3 rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4">\n                  <ShieldBan\n                    size={18}\n                    className="mt-0.5 shrink-0 text-amber-300"\n                  />\n                  <p className="text-xs leading-5 text-slate-500">\n                    Ako samo želiš privremeno zaustaviti pristup, nemoj brisati tvrtku. Postavi status pretplate na <strong className="text-amber-200">Blokirano</strong>.\n                  </p>\n                </div>\n              </div>\n            </div>\n          </article>`

  if (!code.includes('Trajno obriši testnu tvrtku')) {
    code = replaceOrThrow(code, oldBlock, newBlock, 'danger zone block')
  }

  write(path, code)
}

patchAdminService()
patchAdminCompanyDetails()

console.log('✅ Super Admin brisanje testne tvrtke je povezano.')
console.log('Sada pokreni: npm run build')
