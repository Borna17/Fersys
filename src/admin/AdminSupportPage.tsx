import { Headphones } from 'lucide-react'

export function AdminSupportPage() {
  return (
    <section className="mx-auto max-w-5xl">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-blue-500/10 text-blue-300"><Headphones size={30} /></div>
        <h1 className="mt-5 text-3xl font-black">FERSYS podrška</h1>
        <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-400">Baza za support tickete sada je pripremljena. Sljedeći korak je obrazac u korisničkoj aplikaciji te prikaz razgovora i odgovaranje unutar ovog admin panela.</p>
      </div>
    </section>
  )
}
