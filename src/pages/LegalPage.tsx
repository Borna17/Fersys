import {
  AlertTriangle,
  ArrowLeft,
  Cookie,
  CreditCard,
  FileCheck2,
  Scale,
  ShieldCheck,
} from 'lucide-react'
import {
  Link,
  useLocation,
} from 'react-router'
import type { ReactNode } from 'react'

import {
  LEGAL_VERSION,
  legalConfig,
} from '../legal/legalConfig'

type Section = {
  title: string
  body: ReactNode
}

type LegalDocument = {
  title: string
  eyebrow: string
  intro: string
  icon: ReactNode
  sections: Section[]
}

function ProviderBlock() {
  return (
    <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">
        Radna verzija — podaci pružatelja još nisu konačni
      </p>
      <div className="mt-3 grid gap-2 text-sm text-slate-300">
        <p><strong className="text-white">Pružatelj:</strong> {legalConfig.providerName}</p>
        <p><strong className="text-white">OIB:</strong> {legalConfig.providerOib}</p>
        <p><strong className="text-white">Sjedište:</strong> {legalConfig.providerAddress}</p>
        <p><strong className="text-white">Podrška:</strong> {legalConfig.supportEmail}</p>
      </div>
    </div>
  )
}

const terms: LegalDocument = {
  title: 'Uvjeti korištenja',
  eyebrow: 'PRAVILA KORIŠTENJA',
  intro:
    'Ovi Uvjeti uređuju pristup i korištenje FERSYS usluge. Ovo je radna verzija prije registracije pružatelja i konačnog pravnog pregleda.',
  icon: <Scale size={22} />,
  sections: [
    {
      title: '1. Usluga i primjena Uvjeta',
      body: (
        <>
          <p>
            FERSYS je poslovna softverska usluga za organizaciju rada, uključujući module poput investitora, radnih naloga, ponuda, računa, ulaznih računa, skladišta, kalendara, vozila, dokumenata, AI funkcija i drugih funkcionalnosti koje se mogu mijenjati tijekom razvoja proizvoda.
          </p>
          <p className="mt-3">
            Korištenjem ili registracijom korisnik prihvaća važeću verziju Uvjeta, Politike privatnosti i drugih pravila na koja se Uvjeti izričito pozivaju. Ako korisnik koristi FERSYS u ime tvrtke, obrta ili druge organizacije, potvrđuje da je ovlašten prihvatiti Uvjete u njezino ime.
          </p>
        </>
      ),
    },
    {
      title: '2. Korisnički račun i sigurnost',
      body: (
        <>
          Korisnik je odgovoran za točnost podataka računa, čuvanje pristupnih podataka, kontrolu korisnika koje pozove u svoju tvrtku te aktivnosti izvršene preko njegova računa, osim u mjeri u kojoj je problem nastao krivnjom FERSYS-a. Sumnju na neovlašten pristup korisnik treba prijaviti bez nepotrebnog odgađanja.
        </>
      ),
    },
    {
      title: '3. Zabranjena uporaba i prijevare',
      body: (
        <>
          FERSYS se ne smije koristiti za prijevaru, krivotvorenje dokumenata, lažne račune ili ponude, prikrivanje nezakonitih transakcija, neovlašteno korištenje tuđih osobnih ili poslovnih podataka, pokušaje pristupa tuđim računima, distribuciju zlonamjernog sadržaja, manipulaciju referral bodovima ili nagradama, automatizirane lažne registracije, zloupotrebu kartičnog plaćanja niti drugo nezakonito ili obmanjujuće ponašanje. Kod opravdane sumnje FERSYS može privremeno ograničiti račun radi sigurnosne provjere, u okviru primjenjivog prava.
        </>
      ),
    },
    {
      title: '4. Poslovni dokumenti',
      body: (
        <>
          Korisnik je odgovoran za zakonitost, računovodstvenu i poreznu ispravnost sadržaja koji izrađuje, unosi, izdaje ili pohranjuje kroz FERSYS. FERSYS je alat i ne zamjenjuje računovođu, poreznog savjetnika, odvjetnika ili drugog stručnjaka. Korisnik mora provjeriti dokument prije izdavanja, knjiženja, plaćanja ili slanja trećoj osobi.
        </>
      ),
    },
    {
      title: '5. FERSYS AI',
      body: (
        <>
          AI funkcije mogu pogrešno razumjeti naredbu, tekst, sliku, račun, OIB, datum, iznos, PDV, IBAN, stavku ili drugi podatak. AI rezultat je prijedlog, a ne jamstvo točnosti. Korisnik je dužan pregledati rezultat prije potvrde. Funkcije koje mijenjaju poslovne podatke mogu zahtijevati dodatnu potvrdu korisnika.
        </>
      ),
    },
    {
      title: '6. Dostupnost i vanjski pružatelji',
      body: (
        <>
          FERSYS može ovisiti o internetu i uslugama trećih strana, primjerice pružateljima hostinga, baze podataka, e-pošte, AI-a, platnih usluga ili autentikacije. Ne jamči se apsolutno neprekidan rad. Planirano održavanje i sigurnosne intervencije mogu privremeno ograničiti dostupnost.
        </>
      ),
    },
    {
      title: '7. Ograničenje odgovornosti',
      body: (
        <>
          U najvećoj mjeri dopuštenoj primjenjivim pravom, FERSYS ne odgovara za posredne ili posljedične poslovne gubitke koji proizlaze isključivo iz korisnikova pogrešnog unosa, neprovjerenog AI rezultata, gubitka internetske veze ili kvara vanjskog pružatelja. Ništa u ovim Uvjetima ne isključuje odgovornost koja se prema prisilnim propisima ne može isključiti ili ograničiti.
        </>
      ),
    },
    {
      title: '8. Suspenzija i prestanak',
      body: (
        <>
          Pristup može biti privremeno ograničen kod ozbiljne sigurnosne prijetnje, očite zloupotrebe, prijevare, pravnog zahtjeva ili trajnog neplaćanja. Kad je razumno moguće, korisniku će se omogućiti uklanjanje problema ili preuzimanje podataka prije konačnog prestanka, osim ako bi to ugrozilo sigurnost, druge korisnike ili bilo protivno zakonu.
        </>
      ),
    },
    {
      title: '9. Izmjene Uvjeta',
      body: (
        <>
          Materijalne izmjene pravila ili obrade podataka trebaju biti objavljene uz novu verziju dokumenta. FERSYS može zahtijevati novo prihvaćanje kada je promjena značajna.
        </>
      ),
    },
  ],
}

const privacy: LegalDocument = {
  title: 'Politika privatnosti',
  eyebrow: 'PRIVATNOST I GDPR',
  intro:
    'Ova politika objašnjava koje osobne podatke FERSYS može obrađivati, zašto ih obrađuje i koja prava korisnici imaju.',
  icon: <ShieldCheck size={22} />,
  sections: [
    { title: '1. Voditelj obrade', body: <ProviderBlock /> },
    {
      title: '2. Koje podatke možemo obrađivati',
      body: (
        <>
          To može uključivati identifikacijske i kontakt podatke korisnika, podatke o tvrtki i članovima tima, podatke o prijavama i sigurnosnim događajima, podatke o pretplati i statusu plaćanja, sadržaj poslovnih zapisa koje korisnik unese te tehničke podatke nužne za rad i sigurnost aplikacije. Podaci kartice u pravilu se trebaju obrađivati preko ovlaštenog pružatelja plaćanja, a FERSYS ne bi trebao pohranjivati puni broj kartice.
        </>
      ),
    },
    {
      title: '3. Svrhe obrade',
      body: (
        <>
          Podaci se mogu obrađivati radi registracije i autentikacije, pružanja usluge, izvršavanja ugovora, naplate, korisničke podrške, sigurnosti i sprječavanja prijevara, poštovanja pravnih obveza, poboljšanja proizvoda te, kada je potrebna privola, za opcionalne analitičke ili marketinške svrhe.
        </>
      ),
    },
    {
      title: '4. Podaci poslovnog korisnika o trećim osobama',
      body: (
        <>
          Kada poslovni korisnik u FERSYS unosi podatke svojih investitora, kupaca, zaposlenika ili drugih osoba, taj korisnik može biti voditelj obrade za te podatke, dok FERSYS u odgovarajućim situacijama djeluje kao izvršitelj obrade prema njegovim dokumentiranim uputama. Prije produkcije potrebno je dovršiti zaseban DPA / ugovorni dodatak o obradi podataka.
        </>
      ),
    },
    {
      title: '5. Primatelji i izvršitelji obrade',
      body: (
        <>
          Podaci se mogu povjeriti provjerenim pružateljima hostinga, baze podataka, autentikacije, e-pošte, zaštite od zloupotrebe, AI obrade, podrške i naplate, samo u opsegu potrebnom za pružanje usluge i uz odgovarajuće ugovorne i sigurnosne mjere.
        </>
      ),
    },
    {
      title: '6. Međunarodni prijenosi',
      body: (
        <>
          Ako pružatelj usluge obrađuje podatke izvan Europskog gospodarskog prostora, potrebno je koristiti pravno dopušten mehanizam prijenosa i odgovarajuće zaštitne mjere.
        </>
      ),
    },
    {
      title: '7. Rokovi čuvanja',
      body: (
        <>
          Podaci se čuvaju samo koliko je potrebno za svrhu obrade, trajanje računa, zakonske obveze, rješavanje sporova, sigurnosne evidencije i razumno razdoblje za oporavak ili izvoz podataka nakon prestanka usluge. Konačni rokovi trebaju biti definirani prije produkcije.
        </>
      ),
    },
    {
      title: '8. Prava ispitanika',
      body: (
        <>
          Ovisno o pravnoj osnovi i okolnostima, osoba može imati pravo na pristup, ispravak, brisanje, ograničenje obrade, prenosivost podataka, prigovor te povlačenje privole kada se obrada temelji na privoli. Zahtjevi će se slati na <strong className="text-white">{legalConfig.privacyEmail}</strong>.
        </>
      ),
    },
    {
      title: '9. Sigurnost',
      body: (
        <>
          Primjenjuju se organizacijske i tehničke mjere primjerene riziku, poput autentikacije, kontrole pristupa, zaštite aplikacije, sigurnih veza, odvajanja korisničkih podataka i nadzora sigurnosnih događaja. Nijedna internetska usluga ne može jamčiti apsolutnu sigurnost.
        </>
      ),
    },
  ],
}

const refund: LegalDocument = {
  title: 'Pretplate, otkazivanje i povrati',
  eyebrow: 'NAPLATA I PRETPLATE',
  intro:
    'Ova pravila opisuju probno razdoblje, automatsku obnovu, neuspjelu naplatu, otkazivanje i zahtjeve za povrat.',
  icon: <CreditCard size={22} />,
  sections: [
    {
      title: '1. Paketi i probno razdoblje',
      body: (
        <>
          FERSYS trenutačno planira Starter ({legalConfig.plans.starter}), Business ({legalConfig.plans.business}) i FERSYS Pro ({legalConfig.plans.pro}). Novi račun može dobiti {legalConfig.trialDays} dana probnog Business paketa, prema pravilima prikazanim pri registraciji ili checkoutu.
        </>
      ),
    },
    {
      title: '2. Automatska obnova',
      body: (
        <>
          Plaćena pretplata može se automatski obnavljati za sljedeće obračunsko razdoblje dok je korisnik ne otkaže. Prije potvrđivanja naplate korisniku moraju biti jasno prikazani paket, cijena, obračunsko razdoblje i činjenica da se radi o ponavljajućoj naplati.
        </>
      ),
    },
    {
      title: '3. Otkazivanje',
      body: (
        <>
          Standardno pravilo FERSYS-a je da korisnik može isključiti buduću obnovu, a već plaćeni paket ostaje dostupan do kraja tekućeg obračunskog razdoblja, osim kada checkout, poseban dogovor ili primjenjivo pravo nalažu drugačije. Nakon isteka razdoblja nove automatske naplate se ne provode.
        </>
      ),
    },
    {
      title: '4. Neuspjela naplata ili otkazana kartica',
      body: (
        <>
          Naplata može biti odbijena zbog isteka ili blokade kartice, nedostatka sredstava, zahtjeva za dodatnom autentikacijom, odluke banke ili drugog razloga. FERSYS i pružatelj plaćanja mogu ponovno pokušati naplatu i obavijestiti korisnika da ažurira način plaćanja. Tijekom statusa neplaćanja pristup plaćenim funkcijama može biti privremeno ograničen. Podaci se ne trebaju automatski brisati odmah nakon prvog neuspjelog pokušaja naplate.
        </>
      ),
    },
    {
      title: '5. Povrat novca',
      body: (
        <>
          Za već započeto plaćeno razdoblje povrat se ne daje automatski samo zato što korisnik više ne želi koristiti uslugu. Zahtjevi za povrat mogu se razmotriti u slučaju pogrešne ili dvostruke naplate, dokazane tehničke greške, neovlaštene transakcije ili drugog opravdanog razloga. Obvezna prava na povrat, raskid ili pravni lijek koja proizlaze iz primjenjivog prava imaju prednost pred ovim pravilom.
        </>
      ),
    },
    {
      title: '6. Chargeback i sporovi oko kartice',
      body: (
        <>
          Ako korisnik ospori transakciju kod banke ili kartične kuće, FERSYS može privremeno ograničiti povezanu pretplatu dok traje provjera. Namjerno lažno prijavljivanje uredno autorizirane transakcije kao prijevare može predstavljati kršenje Uvjeta. FERSYS zadržava pravo dostaviti pružatelju plaćanja relevantnu evidenciju pretplate, prihvaćanja uvjeta i korištenja usluge, u skladu s propisima o zaštiti podataka.
        </>
      ),
    },
    {
      title: '7. Promjena paketa',
      body: (
        <>
          Nadogradnja ili smanjenje paketa može izazvati trenutačnu ili buduću promjenu cijene i eventualni razmjerni obračun, ovisno o pravilima checkouta i platnog sustava. Točan iznos mora biti prikazan prije potvrde promjene.
        </>
      ),
    },
    {
      title: '8. Potrošačka prava',
      body: (
        <>
          FERSYS se trenutačno projektira prvenstveno kao B2B usluga. Ako se kasnije omogući sklapanje ugovora s potrošačima, checkout, raskid i refund pravila moraju se dodatno uskladiti s obveznim pravilima zaštite potrošača i pravom na jednostrani raskid kada je primjenjivo.
        </>
      ),
    },
  ],
}

const cookies: LegalDocument = {
  title: 'Politika kolačića',
  eyebrow: 'KOLAČIĆI I LOKALNA POHRANA',
  intro:
    'Ova politika opisuje nužne tehnologije pohrane i buduće opcionalne analitičke ili marketinške kolačiće.',
  icon: <Cookie size={22} />,
  sections: [
    {
      title: '1. Nužne tehnologije',
      body: (
        <>
          FERSYS može koristiti nužne kolačiće, session podatke, localStorage ili slične tehnologije radi prijave, sigurnosti, održavanja sesije, zaštite od botova, spremanja osnovnih postavki i tehničkog rada aplikacije.
        </>
      ),
    },
    {
      title: '2. Analitika',
      body: (
        <>
          Ako se uvede analitika koja nije nužna za rad usluge, prije produkcijskog korištenja treba procijeniti pravnu osnovu i, kada je potrebna privola, omogućiti odbijanje prije postavljanja opcionalnih kolačića.
        </>
      ),
    },
    {
      title: '3. Marketing',
      body: (
        <>
          Marketinški ili tracking kolačići neće se smatrati nužnima. Ako se uvedu, korisniku treba jasno objasniti svrhu, pružatelja i trajanje te omogućiti upravljanje privolom.
        </>
      ),
    },
    {
      title: '4. Promjena postavki',
      body: (
        <>
          Prije javnog lansiranja treba dodati upravljanje privolama ako landing stranica počne koristiti opcionalne analitičke ili marketinške tehnologije.
        </>
      ),
    },
  ],
}

const documents: Record<string, LegalDocument> = {
  '/terms': terms,
  '/privacy': privacy,
  '/refund-policy': refund,
  '/cookies': cookies,
}

export function LegalPage() {
  const location = useLocation()
  const document = documents[location.pathname] ?? terms

  return (
    <main className="min-h-dvh bg-slate-950 text-white">
      <div className="border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-black text-slate-300 transition hover:text-white"
          >
            <ArrowLeft size={17} />
            FERSYS
          </Link>

          <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
            verzija {LEGAL_VERSION}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        {legalConfig.draft && (
          <div className="mb-6 flex gap-3 rounded-3xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-100">
            <AlertTriangle size={22} className="mt-0.5 shrink-0 text-amber-300" />
            <div>
              <p className="font-black">Predprodukcijska pravna verzija</p>
              <p className="mt-1 text-sm leading-6 text-amber-100/75">
                FERSYS još nema upisanog konačnog registriranog pružatelja. Ovaj tekst služi za razvoj i testiranje. Prije prve stvarne naplate treba unijeti registrirane podatke pružatelja, provjeriti porezni i potrošački model te napraviti završni pravni pregled.
              </p>
            </div>
          </div>
        )}

        <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-6 sm:p-8">
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
              {document.icon}
              {document.eyebrow}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">
              {document.title}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
              {document.intro}
            </p>
          </div>
        </section>

        <nav className="mt-5 grid gap-2 sm:grid-cols-4">
          {[
            ['/terms', 'Uvjeti'],
            ['/privacy', 'Privatnost'],
            ['/refund-policy', 'Pretplate i povrati'],
            ['/cookies', 'Kolačići'],
          ].map(([path, label]) => (
            <Link
              key={path}
              to={path}
              className={`rounded-2xl border px-4 py-3 text-center text-xs font-black transition ${
                location.pathname === path
                  ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mt-6 space-y-4">
          {document.sections.map((section, index) => (
            <section
              key={section.title}
              className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-7"
            >
              <div className="flex items-start gap-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-xs font-black text-violet-300">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white sm:text-xl">
                    {section.title}
                  </h2>
                  <div className="mt-3 text-sm leading-7 text-slate-400">
                    {section.body}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-blue-500/15 bg-blue-500/[0.06] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <FileCheck2 size={22} className="mt-0.5 shrink-0 text-blue-300" />
            <div>
              <p className="font-black text-white">Evidencija verzija</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Konačna produkcijska verzija treba imati jedinstveni broj verzije i datum stupanja na snagu. Kada se bitno promijene pravila, FERSYS može zatražiti novo prihvaćanje korisnika.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-800 pt-6 text-xs leading-6 text-slate-600">
          <p>{legalConfig.productName} · {legalConfig.country}</p>
          <p className="mt-1">
            Ovo nije zamjena za individualni pravni savjet. Konačnu verziju treba prilagoditi stvarnom registriranom pružatelju, načinu naplate, poreznom statusu i ciljanim korisnicima.
          </p>
        </footer>
      </div>
    </main>
  )
}
