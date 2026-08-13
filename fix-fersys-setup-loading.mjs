import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-setup-fix-backup', stamp)

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8')
}

function write(rel, content) {
  const target = path.join(root, rel)
  if (!fs.existsSync(target)) {
    throw new Error(`Nedostaje ${rel}`)
  }

  const backup = path.join(backupRoot, rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(target, backup)
  fs.writeFileSync(target, content, 'utf8')
  console.log(`✓ ${rel}`)
}

function replaceRequired(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) {
    throw new Error(`Nisam pronašao očekivani kod za: ${label}`)
  }
  return text.replace(oldText, newText)
}

function patchOnboardingService() {
  const rel = 'src/services/onboarding.service.ts'
  let text = read(rel)

  const oldBlock = `  const {
    error,
  } = await supabase
    .from('user_onboarding')
    .upsert(
      {
        user_id: userId,
        tutorial_version:
          ONBOARDING_VERSION,
        current_step: safeStep,
        completed: false,
        skipped: false,
        completed_at: null,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      },
    )

  if (error) {
    throw error
  }`

  const newBlock = `  const {
    error,
  } = await supabase
    .from('user_onboarding')
    .update({
      tutorial_version:
        ONBOARDING_VERSION,
      current_step: safeStep,
      updated_at:
        new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    throw error
  }`

  text = replaceRequired(
    text,
    oldBlock,
    newBlock,
    'onboarding race condition'
  )

  write(rel, text)
}

function patchAppLayout() {
  const rel = 'src/layouts/AppLayout.tsx'
  let text = read(rel)

  const oldClose = `            onClose={() => {
              setIsOnboardingOpen(
                false,
              )

              void getOnboardingProgress()
                .then(
                  (progress) => {
                    setOnboardingProgress(
                      progress,
                    )
                  },
                )
                .catch(
                  (error) => {
                    console.error(
                      'Onboarding status nije osvježen:',
                      error,
                    )
                  },
                )
            }}`

  const newClose = `            onClose={() => {
              setIsOnboardingOpen(
                false,
              )

              // Tutorijal poziva onClose tek nakon uspješnog
              // finish/skip spremanja. Lokalno odmah označimo
              // završetak kako bi Module Setup bio prikazan
              // bez čekanja dodatnog Supabase requesta.
              setOnboardingProgress(
                (current) =>
                  current
                    ? {
                        ...current,
                        completed: true,
                      }
                    : current,
              )

              void getOnboardingProgress()
                .then(
                  (progress) => {
                    setOnboardingProgress(
                      progress,
                    )
                  },
                )
                .catch(
                  (error) => {
                    console.error(
                      'Onboarding status nije osvježen:',
                      error,
                    )
                  },
                )
            }}`

  text = replaceRequired(text, oldClose, newClose, 'instant module setup opening')

  write(rel, text)
}

function patchModuleSetupModal() {
  const rel = 'src/components/onboarding/ModuleSetupModal.tsx'
  let text = read(rel)

  text = text.replace(
    'className="fixed inset-0 z-[205] overflow-y-auto bg-slate-950/96 p-3 backdrop-blur-xl sm:p-5"',
    'className="fixed inset-0 z-[205] flex bg-slate-950/96 p-3 backdrop-blur-xl sm:p-5"'
  )

  text = text.replace(
    'className="mx-auto flex min-h-full w-full max-w-5xl items-center"',
    'className="mx-auto flex min-h-0 w-full max-w-5xl items-center"'
  )

  text = text.replace(
    'className="w-full overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60"',
    'className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-2.5rem)]"'
  )

  text = text.replace(
    'className="border-b border-slate-800 bg-gradient-to-br from-blue-600/20 via-slate-900 to-violet-600/15 px-5 py-6 sm:px-8"',
    'className="shrink-0 border-b border-slate-800 bg-gradient-to-br from-blue-600/20 via-slate-900 to-violet-600/15 px-4 py-4 sm:px-8 sm:py-6"'
  )

  text = text.replace(
    'className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"',
    'className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overscroll-contain p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3"'
  )

  text = text.replace(
    'className="border-t border-slate-800 bg-slate-950/25 p-4 sm:px-6 sm:py-5"',
    'className="shrink-0 border-t border-slate-800 bg-slate-950 p-3 sm:px-6 sm:py-5"'
  )

  text = text.replace(
    'className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"',
    'className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"'
  )

  text = text.replace(
    'className="min-h-12 rounded-2xl bg-blue-600 px-7 font-black text-white shadow-lg shadow-blue-950/30 disabled:opacity-50"',
    'className="h-14 w-full rounded-2xl bg-blue-600 px-5 font-black text-white shadow-lg shadow-blue-950/30 active:scale-[0.99] disabled:opacity-50 sm:h-12 sm:w-auto sm:px-7"'
  )

  write(rel, text)
}

function patchCompanyModules() {
  const rel = 'src/services/companyModules.service.ts'
  let text = read(rel)

  const oldNoCompany = `        if (!companyId) {
          setIsLoading(false)
          return
        }`

  const newNoCompany = `        if (!companyId) {
          // Kod odjave/promjene računa ne zadržavaj
          // module prethodne tvrtke u lokalnom stateu.
          setEnabledModules([
            ...allCompanyModuleKeys,
          ])
          setSetupCompleted(true)
          setError('')
          setIsLoading(false)
          return
        }`

  text = replaceRequired(text, oldNoCompany, newNoCompany, 'reset module state without company')

  write(rel, text)
}

try {
  console.log('FERSYS Setup / Onboarding fix')
  console.log(`Backup: ${backupRoot}`)

  patchOnboardingService()
  patchAppLayout()
  patchModuleSetupModal()
  patchCompanyModules()

  console.log('\n✓ Setup fix je primijenjen.')
  console.log('Pokreni: npm run build')
} catch (error) {
  console.error('\n✗ Greška:', error instanceof Error ? error.message : error)
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}

