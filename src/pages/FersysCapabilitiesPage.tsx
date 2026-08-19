import {
  ArrowRight,
  Bot,
  CalendarDays,
  Camera,
  CarFront,
  Check,
  ChevronRight,
  ClipboardList,
  FileInput,
  FileText,
  Gauge,
  Layers3,
  Package,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Users,
  UsersRound,
  Workflow,
  Wrench,
  Zap,
} from 'lucide-react'
import {
  useMemo,
  useState,
} from 'react'
import { useNavigate } from 'react-router'

type Capability = {
  id: string
  title: string
  eyebrow: string
  description: string
  href: string
  icon: typeof Gauge
  features: string[]
  keywords: string[]
}

const capabilities: Capability[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    eyebrow: 'Kontrolni centar',
    description:
      'Najvažnije informacije o poslovanju na jednom mjestu, bez otvaranja svakog modula pojedinačno.',
    href: '/dashboard',
    icon: Gauge,
    features: [
      'Pregled aktivnih radnih naloga',
      'Brzi uvid u investitore i aktualne aktivnosti',
      'Ključne poslovne brojke i upozorenja',
      'Brze akcije za najčešće poslove',
      'Polazište za svakodnevni rad',
    ],
    keywords: [
      'dashboard',
      'pregled',
      'statistika',
      'početna',
    ],
  },
  {
    id: 'customers',
    title: 'Investitori',
    eyebrow: 'CRM i povijest klijenta',
    description:
      'Jedan profil investitora povezuje kontakte, dokumente i povijest poslovnog odnosa.',
    href: '/customers',
    icon: Users,
    features: [
      'Osobe, tvrtke i poslovni kontakti',
      'OIB, adrese, telefoni i e-mail',
      'Povijest povezanih radnih naloga i ponuda',
      'Brzo otvaranje svih podataka investitora',
      'Podloga za automatsko popunjavanje novih dokumenata',
    ],
    keywords: [
      'investitori',
      'kupci',
      'crm',
      'klijenti',
    ],
  },
  {
    id: 'work-orders',
    title: 'Radni nalozi',
    eyebrow: 'Od terena do evidencije',
    description:
      'Planiranje, izvođenje i dokumentiranje terenskog posla s jasnim statusom i profesionalnim PDF-om.',
    href: '/work-orders',
    icon: Wrench,
    features: [
      'Termin dolaska i odlaska te trajanje rada',
      'Radnici, lokacija, opis radova i materijal',
      'Fotografije i potpis investitora',
      'Brza promjena statusa izravno na popisu',
      'PDF dokument i povezivanje s drugim FERSYS dokumentima',
    ],
    keywords: [
      'radni nalozi',
      'teren',
      'radovi',
      'servis',
    ],
  },
  {
    id: 'offers',
    title: 'Ponude',
    eyebrow: 'Prodaja i priprema posla',
    description:
      'Profesionalne ponude koje ostaju uređive, prate status i mogu postati dio cijelog poslovnog toka.',
    href: '/offers',
    icon: FileText,
    features: [
      'Stavke, količine, cijene, popusti i PDV',
      'Predlošci za ponavljajuće ponude',
      'Status ponude bez otvaranja dokumenta',
      'Profesionalni PDF i brendirani izgled',
      'Skeniranje postojeće ponude u uređivi FERSYS nacrt',
    ],
    keywords: [
      'ponude',
      'prodaja',
      'cijene',
      'predračun',
    ],
  },
  {
    id: 'invoices',
    title: 'Izlazni računi',
    eyebrow: 'Od izvedenog rada do naplate',
    description:
      'Izrada računa u istom sustavu u kojem već postoje investitor, ponuda i obavljeni posao.',
    href: '/invoices',
    icon: ReceiptText,
    features: [
      'Automatsko preuzimanje podataka iz povezanih dokumenata',
      'Stavke, porezi, dospijeće i način plaćanja',
      'Profesionalni PDF',
      'HUB3 / 2D barkod za podatke plaćanja',
      'Povezivanje računa s poslovnim tijekom',
    ],
    keywords: [
      'računi',
      'izlazni račun',
      'naplata',
      'hub3',
    ],
  },
  {
    id: 'incoming',
    title: 'Ulazni računi',
    eyebrow: 'Dokumenti bez ručnog prepisivanja',
    description:
      'Digitalna evidencija dobavljačkih računa s AI podrškom za prepoznavanje podataka sa skena ili fotografije.',
    href: '/incoming-invoices',
    icon: FileInput,
    features: [
      'Skeniranje ili fotografiranje računa',
      'Obrezivanje dokumenta po kutovima',
      'AI prepoznavanje podataka za unos',
      'Digitalna evidencija ulaznih dokumenata',
      'Manje ručnog prepisivanja podataka',
    ],
    keywords: [
      'ulazni računi',
      'ocr',
      'skeniranje',
      'dobavljači',
    ],
  },
  {
    id: 'calendar',
    title: 'Kalendar',
    eyebrow: 'Raspored cijele tvrtke',
    description:
      'Termini tvrtke, raspored radnika i Google Kalendar u jednom organizacijskom prikazu.',
    href: '/calendar',
    icon: CalendarDays,
    features: [
      'Mjesečni pregled termina',
      'Novi termini i organizacija posla',
      'Povezivanje s Google Kalendarom',
      'Planiranje servisa i intervencija',
      'Jedno mjesto za ured i teren',
    ],
    keywords: [
      'kalendar',
      'raspored',
      'termin',
      'google',
    ],
  },
  {
    id: 'inventory',
    title: 'Skladište',
    eyebrow: 'Materijal pod kontrolom',
    description:
      'Evidencija artikala, zaliha i kretanja materijala povezana s operativnim radom tvrtke.',
    href: '/inventory',
    icon: Package,
    features: [
      'Artikli i stanje zaliha',
      'Kretanje materijala',
      'QR podrška za brži rad',
      'Povezivanje materijala s poslovnim procesima',
      'Pregled dostupnosti prije terenskog posla',
    ],
    keywords: [
      'skladište',
      'zaliha',
      'artikli',
      'materijal',
    ],
  },
  {
    id: 'delivery-notes',
    title: 'Otpremnice',
    eyebrow: 'Isporuka bez ponovnog unosa',
    description:
      'Otpremnice se mogu izraditi iz postojećeg radnog naloga ili ponude, bez ponovnog upisivanja svega.',
    href: '/inventory/delivery-notes',
    icon: Truck,
    features: [
      'Izrada iz radnog naloga',
      'Izrada iz ponude',
      'Automatski prijenos investitora i stavki',
      'Povezivanje s FERSYS Flowom',
      'Podloga za izradu računa',
    ],
    keywords: [
      'otpremnice',
      'isporuka',
      'materijal',
    ],
  },
  {
    id: 'vehicles',
    title: 'Vozni park',
    eyebrow: 'Operativa na cesti',
    description:
      'Evidencija vozila tvrtke, kilometraže i servisnih podataka uz ostale poslovne module.',
    href: '/vehicles',
    icon: CarFront,
    features: [
      'Popis vozila tvrtke',
      'Kilometraža',
      'Servisna evidencija',
      'Brži pregled operativnog stanja vozila',
      'Povezivanje s AI naredbama',
    ],
    keywords: [
      'vozila',
      'vozni park',
      'kilometraža',
      'servis',
    ],
  },
  {
    id: 'employees',
    title: 'Zaposlenici i pristupi',
    eyebrow: 'Tim bez dijeljenja jednog računa',
    description:
      'Višekorisnički rad s ulogama i dozvolama kako svatko vidi i radi ono što mu treba.',
    href: '/settings/employees',
    icon: UsersRound,
    features: [
      'Više korisnika unutar tvrtke',
      'Uloge i dozvole',
      'Odvajanje vlasnika, voditelja i radnika',
      'Sigurniji pristup poslovnim podacima',
      'Priprema za rast tima',
    ],
    keywords: [
      'zaposlenici',
      'tim',
      'uloge',
      'dozvole',
    ],
  },
  {
    id: 'ai',
    title: 'FERSYS AI',
    eyebrow: 'AI koji izvršava posao',
    description:
      'Nije samo chat. Cilj FERSYS AI-a je razumjeti naredbu, pripremiti poslovnu radnju i tražiti potvrdu prije spremanja.',
    href: '/ai',
    icon: Bot,
    features: [
      'Tekstualne i glasovne naredbe',
      'Pronalaženje i otvaranje podataka',
      'Priprema investitora, ponuda i radnih naloga',
      'Radnje s potvrdom prije zapisivanja',
      'Prirodniji rad na hrvatskom jeziku',
    ],
    keywords: [
      'ai',
      'umjetna inteligencija',
      'glas',
      'pomoćnik',
    ],
  },
]

const differentiators = [
  {
    icon: Workflow,
    title: 'FERSYS Flow',
    text:
      'Dokumenti nisu otoci. Ponuda, radni nalog, otpremnica i račun mogu biti dio jednog poslovnog toka s jasnim sljedećim korakom.',
  },
  {
    icon: Bot,
    title: 'AI koji radi, ne samo odgovara',
    text:
      'FERSYS AI je zamišljen kao operativni pomoćnik: pronađi podatak, pripremi dokument ili radnju, pokaži pregled i tek onda spremi uz potvrdu.',
  },
  {
    icon: Camera,
    title: 'Od fotografije do poslovnih podataka',
    text:
      'Sken računa ili vanjske ponude nije samo privitak. FERSYS ga pretvara u podatke i uređivi nacrt kako bi se smanjilo ručno prepisivanje.',
  },
  {
    icon: ShieldCheck,
    title: 'Hrvatski poslovni kontekst',
    text:
      'OIB, EUR, hrvatski jezik, HUB3 barkod i način rada domaćih obrta i servisnih tvrtki nisu naknadni dodatak nego dio proizvoda.',
  },
  {
    icon: Layers3,
    title: 'Jedan sustav, jedan kontekst',
    text:
      'Investitor, teren, materijal, dokumenti, raspored, vozila i naplata ostaju povezani. Manje kopiranja između programa i tablica.',
  },
  {
    icon: Sparkles,
    title: 'Učenje unutar aplikacije',
    text:
      'Video pomoć, primjeri naredbi, onboarding i ovaj centar mogućnosti ostaju dostupni korisniku dok radi.',
  },
]

const flow = [
  {
    label: 'Investitor',
    icon: Users,
  },
  {
    label: 'Ponuda',
    icon: FileText,
  },
  {
    label: 'Radni nalog',
    icon: ClipboardList,
  },
  {
    label: 'Otpremnica',
    icon: Truck,
  },
  {
    label: 'Račun',
    icon: ReceiptText,
  },
]

export function FersysCapabilitiesPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const normalized = query
      .trim()
      .toLocaleLowerCase('hr-HR')

    if (!normalized) {
      return capabilities
    }

    return capabilities.filter((item) =>
      [
        item.title,
        item.eyebrow,
        item.description,
        ...item.features,
        ...item.keywords,
      ]
        .join(' ')
        .toLocaleLowerCase('hr-HR')
        .includes(normalized),
    )
  }, [query])

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-6 pb-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/45 p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="relative max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
            <Sparkles size={14} />
            FERSYS CENTAR MOGUĆNOSTI
          </div>

          <h1 className="mt-5 text-3xl font-black tracking-tight text-white sm:text-5xl">
            Sve što možeš napraviti u FERSYS-u — na jednom mjestu.
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Ovaj centar objašnjava čemu služi svaki modul, kako se moduli povezuju
            i koji je najbrži način da od investitora dođeš do završenog i
            naplaćenog posla bez ponavljanja istog unosa.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-black text-white"
            >
              Otvori Dashboard
              <ArrowRight size={17} />
            </button>

            <button
              type="button"
              onClick={() => navigate('/ai')}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-violet-500/20 bg-violet-500/10 px-5 text-sm font-black text-violet-200"
            >
              <Bot size={17} />
              Isprobaj AI pomoćnika
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              JEDAN POSLOVNI TOK
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">
              Podatak unesi jednom. Koristi ga kroz cijeli posao.
            </h2>
          </div>

          <div className="flex max-w-full items-center gap-1 overflow-x-auto pb-1">
            {flow.map((step, index) => {
              const Icon = step.icon

              return (
                <div key={step.label} className="flex shrink-0 items-center">
                  <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-3">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-500/10 text-blue-300">
                      <Icon size={16} />
                    </span>
                    <span className="text-xs font-black text-white">
                      {step.label}
                    </span>
                  </div>

                  {index < flow.length - 1 && (
                    <ChevronRight
                      size={17}
                      className="mx-1 text-slate-600"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              MODUL PO MODUL
            </p>
            <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
              Što se gdje radi?
            </h2>
          </div>

          <label className="relative w-full md:max-w-md">
            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Npr. skeniranje, račun, teren, AI..."
              className="h-12 w-full rounded-2xl border border-slate-800 bg-slate-900 pl-11 pr-4 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10"
            />
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.id}
                className="group flex min-h-[330px] flex-col rounded-[1.6rem] border border-slate-800 bg-slate-900 p-5 transition hover:-translate-y-0.5 hover:border-blue-500/25"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-600/20 to-violet-600/20 text-blue-300">
                    <Icon size={20} />
                  </span>

                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {item.eyebrow}
                    </p>
                    <h3 className="mt-1 text-xl font-black text-white">
                      {item.title}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {item.description}
                </p>

                <div className="mt-5 space-y-2.5">
                  {item.features.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-start gap-2 text-xs leading-5 text-slate-300"
                    >
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {feature}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="mt-auto flex min-h-11 items-center justify-between border-t border-slate-800 pt-4 text-left text-xs font-black text-blue-300"
                >
                  Otvori {item.title}
                  <ArrowRight
                    size={16}
                    className="transition group-hover:translate-x-1"
                  />
                </button>
              </article>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="rounded-[1.6rem] border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center">
            <Search size={28} className="mx-auto text-slate-600" />
            <p className="mt-3 font-black text-white">
              Nema rezultata za taj pojam.
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Pokušaj npr. “račun”, “AI”, “teren” ili “skladište”.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-[1.9rem] border border-violet-500/20 bg-slate-900 p-5 sm:p-7">
        <div className="max-w-3xl">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400">
            ZAŠTO FERSYS
          </p>
          <h2 className="mt-2 text-2xl font-black text-white sm:text-3xl">
            Razlika nije u još jednom modulu. Razlika je u načinu na koji sve radi zajedno.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-400">
            FERSYS se ne treba natjecati brojem izbornika. Prednost treba biti
            manje ručnog rada, manje prepisivanja i jasniji prijelaz od jednog
            poslovnog koraka do drugog.
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {differentiators.map((item) => {
            const Icon = item.icon

            return (
              <article
                key={item.title}
                className="rounded-2xl border border-white/5 bg-slate-950/45 p-4"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
                  <Icon size={18} />
                </span>
                <h3 className="mt-4 font-black text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-6 text-slate-400">
                  {item.text}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.9rem] border border-blue-500/20 bg-gradient-to-r from-blue-950/50 via-slate-900 to-violet-950/50 p-6 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-blue-300">
              <Zap size={18} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                FERSYS PRINCIP
              </span>
            </div>
            <h2 className="mt-3 max-w-3xl text-2xl font-black text-white sm:text-3xl">
              Ne traži gdje se nešto radi. Reci što želiš napraviti — FERSYS te treba dovesti do sljedećeg koraka.
            </h2>
          </div>

          <button
            type="button"
            onClick={() => navigate('/ai')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-950"
          >
            Otvori FERSYS AI
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </section>
  )
}
