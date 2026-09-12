export type AppLanguage = 'hr' | 'en' | 'bs' | 'sr'

const STORAGE_KEY = 'fersys_app_language_v1'

const labels: Record<AppLanguage, string> = {
  hr: 'Hrvatski',
  en: 'English',
  bs: 'Bosanski',
  sr: 'Srpski',
}

const sharedBalkan: Record<string, string> = {
  'Glavni izbornik': 'Glavni meni',
  'Investitori': 'Investitori',
  'Radni nalozi': 'Radni nalozi',
  'Ponude': 'Ponude',
  'Izlazni računi': 'Izlazni računi',
  'Ulazni računi': 'Ulazni računi',
  'Kalendar': 'Kalendar',
  'Vozila': 'Vozila',
  'Skladište': 'Skladište',
  'Otpremnice': 'Otpremnice',
  'Podrška': 'Podrška',
  'AI pomoćnik': 'AI pomoćnik',
  'Trenutna lokacija': 'Trenutna lokacija',
  'Navigacija': 'Navigacija',
  'Otvori nalog': 'Otvori nalog',
  'Današnji posao': 'Današnji posao',
}

const dictionary: Record<AppLanguage, Record<string, string>> = {
  hr: {},
  bs: {
    ...sharedBalkan,
    'Moje postavke': 'Moje postavke',
    'Postavke firme': 'Postavke firme',
    'Zaposlenici': 'Zaposlenici',
    'Novi investitor': 'Novi investitor',
    'Ulica i kućni broj': 'Ulica i kućni broj',
    'Grad': 'Grad',
    'Poštanski broj': 'Poštanski broj',
    'Spremi investitora': 'Sačuvaj investitora',
    'Nazovi': 'Pozovi',
    'Krenuo sam': 'Krenuo sam',
  },
  sr: {
    ...sharedBalkan,
    'Moje postavke': 'Moja podešavanja',
    'Postavke firme': 'Podešavanja firme',
    'Zaposlenici': 'Zaposleni',
    'Novi investitor': 'Novi investitor',
    'Ulica i kućni broj': 'Ulica i kućni broj',
    'Grad': 'Grad',
    'Poštanski broj': 'Poštanski broj',
    'Spremi investitora': 'Sačuvaj investitora',
    'Nazovi': 'Pozovi',
    'Krenuo sam': 'Krenuo sam',
  },
  en: {
    'Početna': 'Home',
    'Glavni izbornik': 'Main menu',
    'Moje postavke': 'My settings',
    'Postavke': 'Settings',
    'Postavke firme': 'Company settings',
    'Dashboard': 'Dashboard',
    'Investitori': 'Customers',
    'Investitor': 'Customer',
    'Svi investitori': 'All customers',
    'Radni nalozi': 'Work orders',
    'Radni nalog': 'Work order',
    'Novi radni nalog': 'New work order',
    'Ponude': 'Quotes',
    'Ponuda': 'Quote',
    'Nova ponuda': 'New quote',
    'Izlazni računi': 'Sales invoices',
    'Ulazni računi': 'Purchase invoices',
    'Novi račun': 'New invoice',
    'Kalendar': 'Calendar',
    'Vozila': 'Vehicles',
    'Novo vozilo': 'New vehicle',
    'Skladište': 'Inventory',
    'Otpremnice': 'Delivery notes',
    'Zaposlenici': 'Employees',
    'Podrška': 'Support',
    'AI pomoćnik': 'AI assistant',
    'Paketi i pretplata': 'Plans and subscription',
    'Moj FERSYS': 'My FERSYS',
    'Korisnik': 'User',
    'Odjava': 'Sign out',
    'Odjavi se': 'Sign out',
    'Novi investitor': 'New customer',
    'Unos podataka': 'Customer details',
    'Vrsta investitora': 'Customer type',
    'Osoba': 'Person',
    'Fizička osoba': 'Person',
    'Tvrtka': 'Company',
    'Zgrada': 'Building',
    'Ime i prezime': 'Full name',
    'Kontakt osoba': 'Contact person',
    'Telefon': 'Phone',
    'E-mail': 'Email',
    'Ulica i kućni broj': 'Street and house number',
    'Adresa': 'Address',
    'Grad': 'City',
    'Poštanski broj': 'Postal code',
    'OIB': 'Tax ID',
    'Napomena': 'Note',
    'Opis': 'Description',
    'Naziv': 'Name',
    'Datum': 'Date',
    'Vrijeme': 'Time',
    'Trajanje': 'Duration',
    'Status': 'Status',
    'Prioritet': 'Priority',
    'Ukupno': 'Total',
    'Cijena': 'Price',
    'Količina': 'Quantity',
    'Jedinica': 'Unit',
    'Materijal': 'Material',
    'Materijali': 'Materials',
    'Radnici': 'Workers',
    'Fotografije': 'Photos',
    'Potpis': 'Signature',
    'Spremi': 'Save',
    'Spremanje...': 'Saving...',
    'Odustani': 'Cancel',
    'Zatvori': 'Close',
    'Obriši': 'Delete',
    'Uredi': 'Edit',
    'Dodaj': 'Add',
    'Nastavi': 'Continue',
    'Povratak': 'Back',
    'Preuzmi': 'Download',
    'Preuzmi PDF': 'Download PDF',
    'Dijeli': 'Share',
    'Pošalji': 'Send',
    'Pošalji e-mail': 'Send email',
    'Pokušaj ponovno': 'Try again',
    'Učitavanje...': 'Loading...',
    'Učitavanje podataka...': 'Loading data...',
    'Učitavanje radnog naloga...': 'Loading work order...',
    'FERSYS priprema sadržaj': 'FERSYS is preparing content',
    'Aktivan': 'Active',
    'Neaktivan': 'Inactive',
    'Završen': 'Completed',
    'U tijeku': 'In progress',
    'Zakazan': 'Scheduled',
    'Otkazan': 'Cancelled',
    'Hitno': 'Urgent',
    'Visok': 'High',
    'Nizak': 'Low',
    'Normalan': 'Normal',
    'Danas': 'Today',
    'Sutra': 'Tomorrow',
    'Nema podataka': 'No data',
    'Nema rezultata': 'No results',
    'Nema novih obavijesti': 'No new notifications',
    'Obavijesti': 'Notifications',
    'Centar obavijesti': 'Notification center',
    'Sve važno na jednom mjestu': 'Everything important in one place',
    'Uključi obavijesti na telefonu': 'Enable phone notifications',
    'Push obavijesti su uključene na ovom uređaju.': 'Push notifications are enabled on this device.',
    'Traži pažnju': 'Needs attention',
    'Što traži pažnju': 'What needs attention',
    'Trenutno nema stavki koje zahtijevaju tvoju pažnju.': 'Nothing currently needs your attention.',
    'Osobe, tvrtke, obrti i zgrade na jednom mjestu.': 'People, companies, trades and buildings in one place.',
    'Spremi investitora': 'Save customer',
    'Trenutna lokacija': 'Current location',
    'Pretraži naziv, OIB, telefon, grad...': 'Search name, tax ID, phone, city...',
    'Današnji posao': "Today's work",
    'Sljedeći posao': 'Next job',
    'Navigacija': 'Navigation',
    'Nazovi': 'Call',
    'Krenuo sam': 'On my way',
    'Stigao sam': 'Arrived',
    'Otvori nalog': 'Open work order',
    'Nema više zakazanih poslova za danas.': 'No more scheduled jobs for today.',
    'Aplikacija je offline': 'App is offline',
    'Promjene se čuvaju lokalno i sinkronizirat će se kada se internet vrati.': 'Changes are stored locally and will sync when the connection returns.',
    'Jezik aplikacije': 'App language',
    'Odaberi jezik sučelja za svoj korisnički račun.': 'Choose the interface language for your account.',
    'Dostupna je nova verzija FERSYS-a': 'A new FERSYS version is available',
    'Ažuriraj FERSYS za najnovije funkcije i ispravke.': 'Update FERSYS for the latest features and fixes.',
    'Ažuriraj na App Storeu': 'Update on the App Store',
    'Ažuriraj na Trgovini Play': 'Update on Google Play',
    'Kasnije': 'Later',
    'Otvori korisnički izbornik': 'Open user menu',
    'Otvori izbornik': 'Open menu',
    'Zatvori izbornik': 'Close menu',
    'Smanji izbornik': 'Collapse menu',
    'Proširi izbornik': 'Expand menu',
    'Otvori moje postavke': 'Open my settings',
  },
}

export function getAppLanguage(): AppLanguage {
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'en' || stored === 'bs' || stored === 'sr' || stored === 'hr'
    ? stored
    : 'hr'
}

export function setAppLanguage(language: AppLanguage) {
  window.localStorage.setItem(STORAGE_KEY, language)
  document.documentElement.lang = language
  window.dispatchEvent(new CustomEvent('fersys:language-changed', { detail: language }))
}

export function getAppLanguageLabel(language: AppLanguage) {
  return labels[language]
}

export function translateUiText(value: string, language = getAppLanguage()) {
  if (language === 'hr') return value

  const table = dictionary[language]
  const exact = table[value]
  if (exact) return exact

  // Translate common UI phrases inside dynamic labels such as counts/status messages,
  // while leaving customer names, numbers and business data untouched.
  let translated = value
  const phrases = Object.entries(table)
    .filter(([source]) => source.length >= 5)
    .sort(([a], [b]) => b.length - a.length)

  for (const [source, target] of phrases) {
    if (translated.includes(source)) translated = translated.split(source).join(target)
  }

  return translated
}

export const appLanguages: AppLanguage[] = ['hr', 'en', 'bs', 'sr']
