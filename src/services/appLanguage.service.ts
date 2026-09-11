export type AppLanguage = 'hr' | 'en' | 'bs' | 'sr'

const STORAGE_KEY = 'fersys_app_language_v1'

const labels: Record<AppLanguage, string> = {
  hr: 'Hrvatski',
  en: 'English',
  bs: 'Bosanski',
  sr: 'Srpski',
}

const dictionary: Record<AppLanguage, Record<string, string>> = {
  hr: {},
  bs: {
    'Glavni izbornik': 'Glavni meni',
    'Moje postavke': 'Moje postavke',
    'Postavke firme': 'Postavke firme',
    'Investitori': 'Investitori',
    'Radni nalozi': 'Radni nalozi',
    'Ponude': 'Ponude',
    'Izlazni računi': 'Izlazni računi',
    'Ulazni računi': 'Ulazni računi',
    'Kalendar': 'Kalendar',
    'Vozila': 'Vozila',
    'Skladište': 'Skladište',
    'Otpremnice': 'Otpremnice',
    'Zaposlenici': 'Zaposlenici',
    'Podrška': 'Podrška',
    'AI pomoćnik': 'AI pomoćnik',
    'Novi investitor': 'Novi investitor',
    'Ulica i kućni broj': 'Ulica i kućni broj',
    'Grad': 'Grad',
    'Poštanski broj': 'Poštanski broj',
    'Spremi investitora': 'Sačuvaj investitora',
    'Trenutna lokacija': 'Trenutna lokacija',
    'Navigacija': 'Navigacija',
    'Nazovi': 'Pozovi',
    'Krenuo sam': 'Krenuo sam',
    'Otvori nalog': 'Otvori nalog',
    'Današnji posao': 'Današnji posao',
  },
  sr: {
    'Glavni izbornik': 'Glavni meni',
    'Moje postavke': 'Moja podešavanja',
    'Postavke firme': 'Podešavanja firme',
    'Investitori': 'Investitori',
    'Radni nalozi': 'Radni nalozi',
    'Ponude': 'Ponude',
    'Izlazni računi': 'Izlazni računi',
    'Ulazni računi': 'Ulazni računi',
    'Kalendar': 'Kalendar',
    'Vozila': 'Vozila',
    'Skladište': 'Skladište',
    'Otpremnice': 'Otpremnice',
    'Zaposlenici': 'Zaposleni',
    'Podrška': 'Podrška',
    'AI pomoćnik': 'AI pomoćnik',
    'Novi investitor': 'Novi investitor',
    'Ulica i kućni broj': 'Ulica i kućni broj',
    'Grad': 'Grad',
    'Poštanski broj': 'Poštanski broj',
    'Spremi investitora': 'Sačuvaj investitora',
    'Trenutna lokacija': 'Trenutna lokacija',
    'Navigacija': 'Navigacija',
    'Nazovi': 'Pozovi',
    'Krenuo sam': 'Krenuo sam',
    'Otvori nalog': 'Otvori nalog',
    'Današnji posao': 'Današnji posao',
  },
  en: {
    'Glavni izbornik': 'Main menu',
    'Moje postavke': 'My settings',
    'Postavke firme': 'Company settings',
    'Dashboard': 'Dashboard',
    'Investitori': 'Customers',
    'Radni nalozi': 'Work orders',
    'Ponude': 'Quotes',
    'Izlazni računi': 'Sales invoices',
    'Ulazni računi': 'Purchase invoices',
    'Kalendar': 'Calendar',
    'Vozila': 'Vehicles',
    'Skladište': 'Inventory',
    'Otpremnice': 'Delivery notes',
    'Zaposlenici': 'Employees',
    'Podrška': 'Support',
    'AI pomoćnik': 'AI assistant',
    'Svi investitori': 'All customers',
    'Osobe, tvrtke, obrti i zgrade na jednom mjestu.': 'People, companies, trades and buildings in one place.',
    'Novi investitor': 'New customer',
    'Unos podataka': 'Customer details',
    'Vrsta investitora': 'Customer type',
    'Osoba': 'Person',
    'Tvrtka': 'Company',
    'Zgrada': 'Building',
    'Ime i prezime': 'Full name',
    'Kontakt osoba': 'Contact person',
    'Telefon': 'Phone',
    'E-mail': 'Email',
    'Ulica i kućni broj': 'Street and house number',
    'Grad': 'City',
    'Poštanski broj': 'Postal code',
    'Napomena': 'Note',
    'Odustani': 'Cancel',
    'Spremi investitora': 'Save customer',
    'Trenutna lokacija': 'Current location',
    'Pretraži naziv, OIB, telefon, grad...': 'Search name, tax ID, phone, city...',
    'Pokušaj ponovno': 'Try again',
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
  return dictionary[language][value] ?? value
}

export const appLanguages: AppLanguage[] = ['hr', 'en', 'bs', 'sr']
