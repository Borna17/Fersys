export const LEGAL_VERSION = 'draft-2026-08-16'

export const legalConfig = {
  draft: true,
  productName: 'FERSYS',
  serviceUrl: 'https://fersys.app',
  appUrl: 'https://app.fersys.app',
  providerName: '[UPISATI REGISTRIRANI NAZIV OBRTA / DRUŠTVA]',
  providerOib: '[UPISATI OIB]',
  providerAddress: '[UPISATI SJEDIŠTE I ADRESU]',
  supportEmail: '[UPISATI EMAIL ZA PODRŠKU]',
  privacyEmail: '[UPISATI EMAIL ZA PRIVATNOST / GDPR]',
  country: 'Republika Hrvatska',
  audience: 'Poslovni korisnici (B2B) – radna postavka do konačne odluke',
  billingProvider: 'Stripe ili drugi ovlašteni pružatelj platnih usluga',
  trialDays: 7,
  plans: {
    starter: '19,99 € mjesečno',
    business: '29,99 € mjesečno',
    pro: '49,99 € mjesečno',
  },
} as const
