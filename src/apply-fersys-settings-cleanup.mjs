import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

const files = {
  settings: path.join(root, 'src/pages/SettingsPage.tsx'),
  modules: path.join(root, 'src/components/settings/ModulesSettingsTab.tsx'),
  firstSteps: path.join(root, 'src/components/FirstStepsControlCenter.tsx'),
  firstTen: path.join(root, 'src/components/FirstTenMinutes.tsx'),
  main: path.join(root, 'src/main.tsx'),
}

function read(file) {
  if (!fs.existsSync(file)) {
    throw new Error(`Nedostaje datoteka: ${file}`)
  }
  return fs.readFileSync(file, 'utf8')
}

function write(file, content) {
  fs.writeFileSync(file, content, 'utf8')
}

function replaceOnce(content, from, to, label) {
  if (!content.includes(from)) {
    if (content.includes(to)) {
      console.log(`✓ ${label} je već primijenjen`)
      return content
    }
    throw new Error(`Nisam pronašao očekivani dio za: ${label}`)
  }
  console.log(`✓ ${label}`)
  return content.replace(from, to)
}

console.log('\nFERSYS — Settings / onboarding / video cleanup\n')

// 1) SETTINGS
{
  let s = read(files.settings)

  // Hide the large company setup block once setup reaches 100%.
  s = replaceOnce(
    s,
`  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-violet-500/10 p-6 sm:p-8">`,
`  return (
    <div className="space-y-4 sm:space-y-6">
      {completion.percentage < 100 && (
      <section className="relative overflow-hidden rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-slate-900 to-violet-500/10 p-4 sm:p-6">`,
    'Veliko "Postavljanje tvrtke" nestaje na 100%',
  )

  s = replaceOnce(
    s,
`      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">`,
`      </section>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">`,
    'Kartice u Pregledu su 2 u redu na mobitelu',
  )

  // Compact overview cards.
  s = replaceOnce(
    s,
`      className="group rounded-3xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:-translate-y-1 hover:border-blue-500/30"`,
`      className="group rounded-2xl border border-slate-800 bg-slate-900 p-3 text-left transition hover:-translate-y-0.5 hover:border-blue-500/30 sm:p-4"`,
    'Smanjene kartice Pregleda',
  )

  s = replaceOnce(
    s,
`      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/10 text-blue-400">`,
`      <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-500/10 text-blue-400 sm:h-10 sm:w-10">`,
    'Smanjene ikone kartica',
  )

  s = replaceOnce(
    s,
`      <h3 className="mt-5 font-black text-white">`,
`      <h3 className="mt-3 text-sm font-black leading-5 text-white sm:text-base">`,
    'Kompaktniji naslovi kartica',
  )

  s = replaceOnce(
    s,
`      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">`,
`      <p className="mt-1 hidden text-xs leading-5 text-slate-500 sm:block">`,
    'Opis kartice skriven na malom mobitelu',
  )

  s = replaceOnce(
    s,
`      <p className="mt-4 text-xs font-black text-blue-400">`,
`      <p className="mt-2 text-[10px] font-black text-blue-400 sm:text-xs">`,
    'Smanjena akcija kartice',
  )

  write(files.settings, s)
}

// 2) MODULES
{
  let s = read(files.modules)

  s = replaceOnce(
    s,
`      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">`,
`      <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">`,
    'Moduli su 2 u redu na mobitelu',
  )

  s = replaceOnce(
    s,
`                className={\`relative min-h-[132px] rounded-2xl border p-4 text-left transition sm:min-h-[145px] sm:p-5 \${`,
`                className={\`relative min-h-[108px] rounded-2xl border p-3 text-left transition sm:min-h-[132px] sm:p-4 \${`,
    'Smanjene kartice modula',
  )

  s = replaceOnce(
    s,
`                    className={\`grid h-11 w-11 place-items-center rounded-2xl \${`,
`                    className={\`grid h-9 w-9 place-items-center rounded-xl sm:h-10 sm:w-10 \${`,
    'Smanjene ikone modula',
  )

  s = replaceOnce(
    s,
`                    <Icon size={22} />`,
`                    <Icon size={18} />`,
    'Smanjena veličina ikone modula',
  )

  s = replaceOnce(
    s,
`                <p className="mt-4 font-black text-white">`,
`                <p className="mt-3 text-sm font-black leading-5 text-white sm:text-base">`,
    'Kompaktniji naziv modula',
  )

  s = replaceOnce(
    s,
`                <p className="mt-1 pr-5 text-xs leading-5 text-slate-400">`,
`                <p className="mt-1 hidden pr-5 text-xs leading-5 text-slate-400 sm:block">`,
    'Opis modula skriven na malom mobitelu',
  )

  write(files.modules, s)
}

// 3) FLOATING "POČETNI VODIČ" U SETTINGS
{
  let s = read(files.firstSteps)

  s = replaceOnce(
    s,
`  const isUserSettings =
    location.pathname ===
      '/settings'`,
`  // Korisničke Postavke više nemaju plutajući gumb "Početni vodič".
  // Kontrola ostaje samo u FERSYS Adminu za odabranu tvrtku.
  const isUserSettings = false`,
    'Maknut plutajući Početni vodič iz Postavki',
  )

  write(files.firstSteps, s)
}

// 4) FIRST TEN MINUTES ON DASHBOARD
{
  let s = read(files.firstTen)

  s = replaceOnce(
    s,
`  if (
    state.hidden
  ) {
    return (
      <button
        type="button"
        onClick={() =>
          updateState({
            hidden: false,
            collapsed:
              false,
          })
        }
        className="fixed right-4 top-20 z-[82] inline-flex min-h-11 items-center gap-2 rounded-2xl border border-blue-500/25 bg-slate-900/95 px-4 text-xs font-black text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-blue-400/50 active:scale-[0.98] sm:top-24"
      >
        <RotateCcw
          size={16}
          className="text-blue-300"
        />
        Prvi koraci
      </button>
    )
  }`,
`  if (
    state.hidden ||
    completed === steps.length
  ) {
    return null
  }`,
    'Prvi koraci više ne ostavljaju floating button i nestaju kad su završeni',
  )

  write(files.firstTen, s)
}

// 5) VIDEO TUTORIAL FLOATING UI
{
  let s = read(files.main)

  s = replaceOnce(
    s,
`const VideoTutorialCenter =
  lazy(
    () =>
      import(
        './components/VideoTutorialCenter'
      ),
  )

`,
``,
    'VideoTutorialCenter uklonjen iz globalnog lazy loada',
  )

  s = replaceOnce(
    s,
`      <FirstStepsControlCenter />
      <VideoTutorialCenter />`,
`      <FirstStepsControlCenter />`,
    'Maknuti plutajući video gumbi iz cijele aplikacije',
  )

  write(files.main, s)
}

console.log('\n✅ FERSYS UX cleanup je primijenjen.')
console.log('Sada pokreni: npm run build')
console.log('Ako build prođe: git add . && git commit -m "Improve settings onboarding and mobile layout" && git push\n')
