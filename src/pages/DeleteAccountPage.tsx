import { ArrowLeft, Mail, ShieldCheck, Trash2 } from 'lucide-react'

const SUPPORT_EMAIL = 'fersysapp@gmail.com'

export default function DeleteAccountPage() {
  const subject = encodeURIComponent('Zahtjev za brisanje FERSYS računa')
  const body = encodeURIComponent(
    'Poštovani,\n\nzahtijevam brisanje svog FERSYS korisničkog računa i povezanih osobnih podataka.\n\nE-mail adresa FERSYS računa: \nNaziv tvrtke/obrta: \n\nSrdačan pozdrav,',
  )

  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-10 text-slate-200">
      <div className="mx-auto w-full max-w-3xl">
        <a href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white">
          <ArrowLeft size={16} /> Povratak na FERSYS
        </a>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-300">
            <Trash2 size={26} />
          </div>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.18em] text-violet-300">FERSYS · PRIVATNOST</p>
          <h1 className="mt-2 text-3xl font-black text-white">Brisanje korisničkog računa i podataka</h1>
          <p className="mt-4 leading-7 text-slate-300">
            Ova javna stranica omogućuje korisnicima FERSYS-a da zatraže brisanje svojeg korisničkog računa i povezanih osobnih podataka, bez potrebe za pristupom aplikaciji.
          </p>

          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
            <h2 className="text-lg font-black text-white">Kako zatražiti brisanje</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-300">
              <li>Pošaljite zahtjev s e-mail adrese povezane s vašim FERSYS računom.</li>
              <li>U zahtjevu navedite e-mail FERSYS računa i, ako je primjenjivo, naziv tvrtke ili obrta.</li>
              <li>Radi zaštite računa možemo zatražiti dodatnu potvrdu identiteta prije izvršenja brisanja.</li>
              <li>Nakon provjere zahtjeva obradit ćemo brisanje računa i podataka koji nisu nužni za ispunjenje zakonskih obveza.</li>
            </ol>

            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white hover:bg-red-500"
            >
              <Mail size={18} /> Zatraži brisanje računa
            </a>
            <p className="mt-3 break-all text-xs text-slate-500">E-mail za zahtjeve: {SUPPORT_EMAIL}</p>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-800 p-5">
            <h2 className="flex items-center gap-2 text-lg font-black text-white"><ShieldCheck size={20} /> Što se briše</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Nakon odobrenog zahtjeva brišu se ili anonimiziraju podaci korisničkog računa i osobni podaci povezani s računom, u opsegu u kojem njihovo daljnje čuvanje nije potrebno radi zakonskih, računovodstvenih, sigurnosnih ili drugih legitimnih obveza.
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Poslovni zapisi tvrtke kojima korisnik pristupa mogu pripadati tvrtki ili drugim korisnicima te se ne moraju automatski izbrisati brisanjem pojedinačnog korisničkog računa. Za zahtjev za brisanje podataka cijele tvrtke navedite to izričito u poruci.
            </p>
          </section>

          <p className="mt-6 text-xs leading-5 text-slate-500">
            Više informacija o obradi osobnih podataka dostupno je u <a href="/privacy" className="font-bold text-violet-300 hover:text-violet-200">Politici privatnosti FERSYS-a</a>.
          </p>
        </div>
      </div>
    </main>
  )
}
