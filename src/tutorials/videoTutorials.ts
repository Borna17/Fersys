export type VideoTutorialStep = {
  time: string
  title: string
  text: string
}

export type VideoTutorial = {
  id: string
  title: string
  shortTitle: string
  description: string
  duration: string
  videoSrc: string
  routes: RegExp[]
  steps: VideoTutorialStep[]
}

export const videoTutorials:
VideoTutorial[] = [
  {
    id: 'fersys-overview',
    title: 'FERSYS u 60 sekundi',
    shortTitle: 'FERSYS pregled',
    description:
      'Brzi pregled najvažnijih dijelova aplikacije i poslovnog toka.',
    duration: '00:60',
    videoSrc:
      '/tutorials/fersys-overview.mp4',
   routes: [
  /^\/fersys-overview(?:\/|$)/,
],
    steps: [
      {
        time: '00–06 s',
        title: 'Dashboard',
        text:
          'Prikaži Dashboard i najvažnije pokazatelje tvrtke.',
      },
      {
        time: '06–15 s',
        title: 'Investitori',
        text:
          'Otvori Investitore i profil jednog investitora.',
      },
      {
        time: '15–27 s',
        title: 'Radni nalog',
        text:
          'Prikaži novi nalog, materijal, fotografije i potpis.',
      },
      {
        time: '27–38 s',
        title: 'Ponuda i račun',
        text:
          'Prikaži izradu dokumenta i profesionalni PDF.',
      },
      {
        time: '38–49 s',
        title: 'Skladište',
        text:
          'Prikaži artikle, QR kodove i stanje zalihe.',
      },
      {
        time: '49–60 s',
        title: 'AI i kalendar',
        text:
          'Završi s AI pomoćnikom, kalendarom i FERSYS logom.',
      },
    ],
  },
  {
    id: 'dashboard',
    title: 'Kako koristiti Dashboard',
    shortTitle: 'Dashboard',
    description:
      'Gdje pronaći najvažnije brojke, aktivnosti i pregled poslovanja.',
    duration: '00:30',
    videoSrc:
      '/tutorials/dashboard.mp4',
    routes: [
      /^\/dashboard(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–05 s',
        title: 'Pregled',
        text:
          'Kratki zoom na glavne kartice i statistiku.',
      },
      {
        time: '05–15 s',
        title: 'Aktivni podaci',
        text:
          'Prikaži radne naloge, investitore i aktualne aktivnosti.',
      },
      {
        time: '15–24 s',
        title: 'Brze akcije',
        text:
          'Pokaži gumb Novo i najčešće akcije.',
      },
      {
        time: '24–30 s',
        title: 'Završetak',
        text:
          'Istakni da se Dashboard automatski puni podacima tvrtke.',
      },
    ],
  },
  {
    id: 'customers',
    title: 'Investitori i profili',
    shortTitle: 'Investitori',
    description:
      'Dodavanje investitora, pretraga i pregled svih povezanih dokumenata.',
    duration: '00:35',
    videoSrc:
      '/tutorials/customers.mp4',
    routes: [
      /^\/customers(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–07 s',
        title: 'Dodaj investitora',
        text:
          'Klikni Novi investitor i pokaži osnovne podatke.',
      },
      {
        time: '07–15 s',
        title: 'Pretraži',
        text:
          'Prikaži pretragu po nazivu ili OIB-u.',
      },
      {
        time: '15–28 s',
        title: 'Profil investitora',
        text:
          'Otvori profil i tabove Nalozi, Ponude, Računi, Fotografije i Napomene.',
      },
      {
        time: '28–35 s',
        title: 'Brze akcije',
        text:
          'Prikaži Novi nalog, Nova ponuda, Novi račun i Otpremnica.',
      },
    ],
  },
  {
    id: 'work-orders',
    title: 'Radni nalozi od početka do PDF-a',
    shortTitle: 'Radni nalozi',
    description:
      'Izrada naloga, radnici, materijal, fotografije, potpis i završni PDF.',
    duration: '00:45',
    videoSrc:
      '/tutorials/work-orders.mp4',
    routes: [
      /^\/work-orders(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–08 s',
        title: 'Novi nalog',
        text:
          'Odaberi investitora, adresu i vrstu posla.',
      },
      {
        time: '08–18 s',
        title: 'Rad i materijal',
        text:
          'Dodaj opis, materijal, radnike i vrijeme.',
      },
      {
        time: '18–28 s',
        title: 'Fotografije',
        text:
          'Prikaži dodavanje fotografija prije i poslije radova.',
      },
      {
        time: '28–37 s',
        title: 'Potpis',
        text:
          'Primatelj potpisuje prstom ili S Penom.',
      },
      {
        time: '37–45 s',
        title: 'PDF',
        text:
          'Spremi nalog i prikaži preuzimanje profesionalnog PDF-a.',
      },
    ],
  },
  {
    id: 'offers',
    title: 'Ponude – izrada, PDF i slanje',
    shortTitle: 'Ponude',
    description:
      'Od investitora i stavki do gotove ponude, skeniranja i PDF-a.',
    duration: '00:40',
    videoSrc:
      '/tutorials/offers.mp4',
    routes: [
      /^\/offers(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–07 s',
        title: 'Nova ponuda',
        text:
          'Klikni Nova ponuda i odaberi investitora.',
      },
      {
        time: '07–18 s',
        title: 'Stavke',
        text:
          'Dodaj naziv, količinu, cijenu, popust i PDV.',
      },
      {
        time: '18–27 s',
        title: 'AI skeniranje',
        text:
          'Prikaži opciju skeniranja dobivene ponude i automatsko prepoznavanje stavki.',
      },
      {
        time: '27–34 s',
        title: 'Pregled',
        text:
          'Prikaži pregled izgleda dokumenta.',
      },
      {
        time: '34–40 s',
        title: 'PDF i slanje',
        text:
          'Preuzmi ili pošalji gotovu ponudu.',
      },
    ],
  },
  {
    id: 'invoices',
    title: 'Izlazni računi',
    shortTitle: 'Računi',
    description:
      'Izrada računa, stavke, kupac, PDF i povezivanje s drugim dokumentima.',
    duration: '00:40',
    videoSrc:
      '/tutorials/invoices.mp4',
    routes: [
      /^\/invoices(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–08 s',
        title: 'Novi račun',
        text:
          'Odaberi kupca ili prenesi podatke iz povezanog dokumenta.',
      },
      {
        time: '08–20 s',
        title: 'Stavke i cijene',
        text:
          'Prikaži količinu, cijenu, PDV i obračun ukupnog iznosa.',
      },
      {
        time: '20–30 s',
        title: 'Podaci plaćanja',
        text:
          'Prikaži IBAN, broj računa i podatke za plaćanje.',
      },
      {
        time: '30–40 s',
        title: 'PDF',
        text:
          'Prikaži profesionalni PDF i preuzimanje.',
      },
    ],
  },
  {
    id: 'incoming-invoices',
    title: 'Ulazni računi i AI skeniranje',
    shortTitle: 'Ulazni računi',
    description:
      'Skeniranje računa, obrezivanje dokumenta i automatski unos podataka.',
    duration: '00:40',
    videoSrc:
      '/tutorials/incoming-invoices.mp4',
    routes: [
      /^\/incoming-invoices(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–08 s',
        title: 'Skeniraj',
        text:
          'Fotografiraj račun ili odaberi postojeću sliku.',
      },
      {
        time: '08–17 s',
        title: '4 kuta + zoom',
        text:
          'Precizno označi kutove računa uz povećani prikaz.',
      },
      {
        time: '17–30 s',
        title: 'AI čitanje',
        text:
          'FERSYS automatski prepoznaje dobavljača, iznose, PDV i ostala polja.',
      },
      {
        time: '30–40 s',
        title: 'Provjeri i spremi',
        text:
          'Korisnik samo provjeri podatke i spremi ulazni račun.',
      },
    ],
  },
  {
    id: 'calendar',
    title: 'Kalendar i planiranje',
    shortTitle: 'Kalendar',
    description:
      'Dodavanje termina, pregledi i povezivanje aktivnosti s poslovanjem.',
    duration: '00:30',
    videoSrc:
      '/tutorials/calendar.mp4',
    routes: [
      /^\/calendar(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–07 s',
        title: 'Pregled kalendara',
        text:
          'Prikaži dnevni/tjedni/mjesečni pregled ako je dostupan.',
      },
      {
        time: '07–17 s',
        title: 'Novi termin',
        text:
          'Dodaj termin, datum, vrijeme i opis.',
      },
      {
        time: '17–25 s',
        title: 'Povezivanje',
        text:
          'Prikaži kako se termin povezuje s poslovnim aktivnostima.',
      },
      {
        time: '25–30 s',
        title: 'Upozorenja',
        text:
          'Istakni upozorenja na preklapanje termina.',
      },
    ],
  },
  {
    id: 'inventory',
    title: 'Skladište i QR kodovi',
    shortTitle: 'Skladište',
    description:
      'Artikli, ulaz/izlaz robe, stanje zalihe, QR kodovi i skeniranje.',
    duration: '00:45',
    videoSrc:
      '/tutorials/inventory.mp4',
    routes: [
      /^\/inventory(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–08 s',
        title: 'Artikli',
        text:
          'Prikaži listu artikala i stanje zalihe.',
      },
      {
        time: '08–18 s',
        title: 'Novi artikl',
        text:
          'Dodaj artikl, šifru, jedinicu mjere i cijene.',
      },
      {
        time: '18–28 s',
        title: 'QR',
        text:
          'Prikaži automatski FERSYS QR i skeniranje artikla.',
      },
      {
        time: '28–38 s',
        title: 'Kretanje',
        text:
          'Prikaži ulaz i izlaz robe te povijest kretanja.',
      },
      {
        time: '38–45 s',
        title: 'Minimalna zaliha',
        text:
          'Istakni upozorenje kada stanje padne ispod minimuma.',
      },
    ],
  },
  {
    id: 'delivery-notes',
    title: 'Otpremnice – izlaz i AI ulaz robe',
    shortTitle: 'Otpremnice',
    description:
      'Izrada otpremnice, potpisi, skladište i skeniranje dobavljačeve otpremnice.',
    duration: '00:50',
    videoSrc:
      '/tutorials/delivery-notes.mp4',
    routes: [
      /^\/inventory\/delivery-notes(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–10 s',
        title: 'Nova otpremnica',
        text:
          'Odaberi investitora, adresu i povezani radni nalog ili ponudu.',
      },
      {
        time: '10–22 s',
        title: 'Stavke',
        text:
          'Dodaj artikle iz skladišta ili ručno.',
      },
      {
        time: '22–31 s',
        title: 'Potpisi',
        text:
          'Predao i preuzeo potpisuju dokument.',
      },
      {
        time: '31–39 s',
        title: 'Skladište',
        text:
          'Izdavanjem se po želji automatski skida roba sa skladišta.',
      },
      {
        time: '39–50 s',
        title: 'AI ulaz robe',
        text:
          'Prikaži skeniranje dobavljačeve otpremnice, postojeći artikl + stanje i novi artikl + QR.',
      },
    ],
  },
  {
    id: 'vehicles',
    title: 'Vozila i servisna evidencija',
    shortTitle: 'Vozila',
    description:
      'Dodavanje vozila, podaci, servis i pregled voznog parka.',
    duration: '00:30',
    videoSrc:
      '/tutorials/vehicles.mp4',
    routes: [
      /^\/vehicles(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–08 s',
        title: 'Dodaj vozilo',
        text:
          'Unesi osnovne podatke i registraciju.',
      },
      {
        time: '08–20 s',
        title: 'Profil vozila',
        text:
          'Prikaži detalje, servisne podatke i povezane informacije.',
      },
      {
        time: '20–30 s',
        title: 'Pregled',
        text:
          'Prikaži kako se prati cijeli vozni park na jednom mjestu.',
      },
    ],
  },
  {
    id: 'ai',
    title: 'FERSYS AI pomoćnik',
    shortTitle: 'AI pomoćnik',
    description:
      'Kako zadati upit i koristiti AI za brže pronalaženje i poslovne akcije.',
    duration: '00:35',
    videoSrc:
      '/tutorials/ai.mp4',
    routes: [
      /^\/ai(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–08 s',
        title: 'Upit',
        text:
          'Upiši ili izgovori jednostavnu naredbu.',
      },
      {
        time: '08–18 s',
        title: 'Razumijevanje',
        text:
          'Prikaži kako AI prepoznaje investitora, dokument ili kalendarsku radnju.',
      },
      {
        time: '18–28 s',
        title: 'Potvrda akcije',
        text:
          'Za promjene prikaži potvrdu prije izvršavanja.',
      },
      {
        time: '28–35 s',
        title: 'Rezultat',
        text:
          'Otvori pronađeni zapis ili izvršenu radnju.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Postavke FERSYS-a',
    shortTitle: 'Postavke',
    description:
      'Tvrtka, dokumenti, moduli, zaposlenici, obavijesti i ostale postavke.',
    duration: '00:40',
    videoSrc:
      '/tutorials/settings.mp4',
    routes: [
      /^\/settings(?:\/|$)/,
    ],
    steps: [
      {
        time: '00–08 s',
        title: 'Tvrtka',
        text:
          'Prikaži logo, podatke tvrtke, pečat i potpis.',
      },
      {
        time: '08–18 s',
        title: 'Dokumenti',
        text:
          'Prikaži izgled radnog naloga, ponude, računa i otpremnice.',
      },
      {
        time: '18–28 s',
        title: 'Moduli',
        text:
          'Uključi ili isključi module koje tvrtka koristi.',
      },
      {
        time: '28–40 s',
        title: 'Korisnici i obavijesti',
        text:
          'Prikaži zaposlenike, dozvole i postavke obavijesti.',
      },
    ],
  },
]

export function findTutorialForPath(
  pathname: string,
) {
  /*
   * Specifičnija ruta mora imati prednost.
   * Otpremnice su npr. unutar /inventory.
   */
  return [
    ...videoTutorials,
  ]
    .sort(
      (a, b) =>
        Math.max(
          ...b.routes.map(
            (route) =>
              route.source.length,
          ),
        ) -
        Math.max(
          ...a.routes.map(
            (route) =>
              route.source.length,
          ),
        ),
    )
    .find(
      (tutorial) =>
        tutorial.routes.some(
          (route) =>
            route.test(
              pathname,
            ),
        ),
    )
}
