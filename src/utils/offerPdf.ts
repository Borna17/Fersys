import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

import {
  notifyDownloadError,
  notifyDownloadPreparing,
  saveBlobDownload,
} from './downloadFeedback'
import {
  getCompanySettings,
} from '../services/companySettings.service'
import {
  getDocumentAppearanceSettings,
} from '../services/documentAppearance.service'
import {
  createPresetAppearance,
  type DocumentAppearance,
} from '../types/documentAppearance'
import {
  createHub3Pdf417DataUrl,
} from './hub3Barcode'

export type OfferPdfItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
  imageDataUrl?: string
  imageName?: string
}

export type OfferPdfData = {
  id: string
  offerNumber: string
  customerName: string
  customerType:
    | 'Fizička osoba'
    | 'Tvrtka'
    | 'Zgrada'
  oib: string
  email: string
  phone: string
  address: string
  city: string
  date: string
  validUntil: string
  status: string
  responsiblePerson: string
  description: string
  internalNote: string
  paymentTerms: string
  items: OfferPdfItem[]
  createdAt: string
  updatedAt: string
  version: number

  /**
   * Opcionalna polja za buduće proširenje ponude.
   * Postojeći pozivi ne moraju ih slati.
   */
  deliveryPlace?: string
  deliveryMethod?: string
  deliveryPeriod?: string
}

export type OfferPdfSettings = {
  companyName: string
  companySubtitle: string
  companyAddress: string
  companyStreetAddress: string
  companyPostalCity: string
  companyOib: string
  companyIban: string
  companyBankName: string
  companyEmail: string
  companyPhone: string
  companyWebsite: string
  logoDataUrl?: string
  stampDataUrl?: string
  signatureDataUrl?: string
  quickPayBarcodeDataUrl?: string

  preset: DocumentAppearance['preset']
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  borderColor: string
  backgroundColor: string

  headerAlignment:
    | 'left'
    | 'center'
    | 'right'
  density:
    | 'comfortable'
    | 'compact'
  infoStyle:
    | 'cards'
    | 'lines'
  tableStyle:
    | 'solid'
    | 'soft'
    | 'minimal'
  sectionStyle:
    | 'bar'
    | 'line'
    | 'plain'

  showLogo: boolean
  showItemImages: boolean
  showSignature: boolean
  showStamp: boolean
  showFooter: boolean
  showWatermark: boolean

  documentTitle: string
  footerText: string
  watermarkText: string
}

const DEFAULT_APPEARANCE =
  createPresetAppearance('offer', 'modern')

const DEFAULT_SETTINGS: OfferPdfSettings = {
  companyName: 'Tvrtka',
  companySubtitle: '',
  companyAddress: '',
  companyStreetAddress: '',
  companyPostalCity: '',
  companyOib: '',
  companyIban: '',
  companyBankName: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  logoDataUrl: undefined,
  stampDataUrl: undefined,
  signatureDataUrl: undefined,
  quickPayBarcodeDataUrl: undefined,

  preset: DEFAULT_APPEARANCE.preset,
  primaryColor: DEFAULT_APPEARANCE.primaryColor,
  secondaryColor: DEFAULT_APPEARANCE.secondaryColor,
  accentColor: DEFAULT_APPEARANCE.accentColor,
  textColor: DEFAULT_APPEARANCE.textColor,
  borderColor: DEFAULT_APPEARANCE.borderColor,
  backgroundColor: DEFAULT_APPEARANCE.backgroundColor,

  headerAlignment:
    DEFAULT_APPEARANCE.headerAlignment,
  density: DEFAULT_APPEARANCE.density,
  infoStyle: DEFAULT_APPEARANCE.infoStyle,
  tableStyle: DEFAULT_APPEARANCE.tableStyle,
  sectionStyle: DEFAULT_APPEARANCE.sectionStyle,

  showLogo: DEFAULT_APPEARANCE.showLogo,
  showItemImages:
    DEFAULT_APPEARANCE.showItemImages,
  showSignature:
    DEFAULT_APPEARANCE.showSignature,
  showStamp: DEFAULT_APPEARANCE.showStamp,
  showFooter: DEFAULT_APPEARANCE.showFooter,
  showWatermark:
    DEFAULT_APPEARANCE.showWatermark,

  documentTitle:
    DEFAULT_APPEARANCE.documentTitle,
  footerText:
    DEFAULT_APPEARANCE.footerText,
  watermarkText:
    DEFAULT_APPEARANCE.watermarkText,
}

const esc = (
  value:
    | string
    | number
    | null
    | undefined,
) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const multi = (value: string) =>
  esc(value).replace(
    /\r?\n/g,
    '<br />',
  )

function alpha(
  color: string,
  opacity: string,
) {
  return /^#[0-9A-Fa-f]{6}$/.test(
    color,
  )
    ? `${color}${opacity}`
    : color
}

function currency(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
    },
  ).format(
    Number.isFinite(value)
      ? value
      : 0,
  )
}

function number(value: number) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      maximumFractionDigits: 2,
    },
  ).format(value)
}

function date(value: string) {
  if (!value) return '—'

  const parsed = new Date(
    `${value}T12:00:00`,
  )

  return Number.isNaN(
    parsed.getTime(),
  )
    ? value
    : parsed.toLocaleDateString(
        'hr-HR',
      )
}

function itemBase(
  item: OfferPdfItem,
) {
  return (
    item.quantity *
    item.price
  )
}

function itemNet(
  item: OfferPdfItem,
) {
  return (
    itemBase(item) *
    (1 - item.discount / 100)
  )
}

function itemVat(
  item: OfferPdfItem,
) {
  return (
    itemNet(item) *
    (item.vat / 100)
  )
}

function itemTotal(
  item: OfferPdfItem,
) {
  return (
    itemNet(item) +
    itemVat(item)
  )
}

function safeFileName(
  value: string,
) {
  return value
    .replace(
      /[\\/:*?"<>|]+/g,
      '-',
    )
    .replace(/\s+/g, '-')
}

function companySettingsFromCurrent(
  settings: Awaited<
    ReturnType<
      typeof getCompanySettings
    >
  >,
): Partial<OfferPdfSettings> {
  return {
    companyName: settings.name,
    companySubtitle:
      settings.documentWatermark,
    companyAddress: [
      settings.address,
      [
        settings.postalCode,
        settings.city,
      ]
        .filter(Boolean)
        .join(' '),
      settings.country,
    ]
      .filter(Boolean)
      .join(', '),
    companyStreetAddress:
      settings.address,
    companyPostalCity:
      [
        settings.postalCode,
        settings.city,
      ]
        .filter(Boolean)
        .join(' '),
    companyOib: settings.oib,
    companyIban: settings.iban,
    companyBankName:
      settings.bankName,
    companyEmail: settings.email,
    companyPhone: settings.phone,
    companyWebsite:
      settings.website,
    logoDataUrl:
      settings.logoUrl ||
      undefined,
    stampDataUrl:
      settings.stampUrl ||
      undefined,
    signatureDataUrl:
      settings.signatureUrl ||
      undefined,
  }
}

function appearanceToPdfSettings(
  appearance: DocumentAppearance,
): Partial<OfferPdfSettings> {
  return {
    preset: appearance.preset,
    primaryColor:
      appearance.primaryColor,
    secondaryColor:
      appearance.secondaryColor,
    accentColor:
      appearance.accentColor,
    textColor:
      appearance.textColor,
    borderColor:
      appearance.borderColor,
    backgroundColor:
      appearance.backgroundColor,

    headerAlignment:
      appearance.headerAlignment,
    density: appearance.density,
    infoStyle:
      appearance.infoStyle,
    tableStyle:
      appearance.tableStyle,
    sectionStyle:
      appearance.sectionStyle,

    showLogo:
      appearance.showLogo,
    showStamp:
      appearance.showStamp,
    showSignature:
      appearance.showSignature,
    showFooter:
      appearance.showFooter,
    showWatermark:
      appearance.showWatermark,
    showItemImages:
      appearance.showItemImages,

    documentTitle:
      appearance.documentTitle ||
      'PONUDA',

    footerText:
      /fersys/i.test(
        appearance.footerText ||
          '',
      )
        ? 'Hvala na povjerenju.'
        : appearance.footerText,

    watermarkText:
      appearance.watermarkText,
  }
}

type OfferPage = {
  items: OfferPdfItem[]
  first: boolean
  final: boolean
}

function estimatedRowUnits(
  item: OfferPdfItem,
  settings: OfferPdfSettings,
) {
  const descriptionUnits =
    item.description.trim()
      ? Math.min(
          1.1,
          item.description.length /
            135,
        )
      : 0

  const imageUnits =
    settings.showItemImages &&
    item.imageDataUrl
      ? 1.75
      : 0

  return (
    1 +
    descriptionUnits +
    imageUnits
  )
}

/**
 * Pravilo stranica za FERSYS ponude:
 *
 * - maksimalno 10 stavki po stranici
 * - prva stranica se puni do 10 stavki prije nego se radi nastavak
 * - završni blok (napomene, ukupno, potpisi, plaćanje i HUB3)
 *   pokušava ostati na zadnjoj stranici zajedno s preostalim stavkama
 * - ako zadnja stranica ima previše sadržaja za završni blok,
 *   završni blok ide na novu čistu stranicu
 * - slike i vrlo dugi opisi dodatno smanjuju siguran broj stavki
 */
function paginateItems(
  items: OfferPdfItem[],
  settings: OfferPdfSettings,
): OfferPage[] {
  if (!items.length) {
    return [
      {
        items: [],
        first: true,
        final: true,
      },
    ]
  }

  const MAX_ITEMS_PER_PAGE = 10

  const hasImages =
    settings.showItemImages &&
    items.some((item) =>
      Boolean(item.imageDataUrl),
    )

  const unitsOf = (
    list: OfferPdfItem[],
  ) =>
    list.reduce(
      (sum, item) =>
        sum +
        estimatedRowUnits(
          item,
          settings,
        ),
      0,
    )

  /*
   * Završni blok zauzima dosta visine.
   * Bez slika na continuation stranici sigurno ga držimo
   * uz otprilike 6 normalnih stavki. U compact modu može malo više.
   */
  const finalUnitsCapacity =
    hasImages
      ? 5.4
      : settings.density ===
          'compact'
        ? 8.2
        : 7.2

  const pages: OfferPage[] = []

  for (
    let index = 0;
    index < items.length;
    index += MAX_ITEMS_PER_PAGE
  ) {
    pages.push({
      items: items.slice(
        index,
        index +
          MAX_ITEMS_PER_PAGE,
      ),
      first:
        index === 0,
      final: false,
    })
  }

  const lastPage =
    pages[
      pages.length - 1
    ]

  const lastPageUnits =
    unitsOf(
      lastPage.items,
    )

  /*
   * Ako na zadnjoj stranici ima dovoljno mjesta,
   * završni blok ostaje odmah ispod zadnjih stavki.
   * Primjer: 12 stavki => 10 na prvoj, 2 + završni blok na drugoj.
   */
  if (
    lastPage.items.length <
      MAX_ITEMS_PER_PAGE &&
    lastPageUnits <=
      finalUnitsCapacity
  ) {
    lastPage.final = true
  } else {
    /*
     * Ako je zadnja stranica puna ili su stavke previsoke,
     * ne stišćemo sadržaj. Dodajemo posebnu završnu stranicu
     * samo za napomene, iznose, potpise i plaćanje.
     */
    pages.push({
      items: [],
      first: false,
      final: true,
    })
  }

  pages.forEach(
    (page, index) => {
      page.first =
        index === 0

      page.final =
        index ===
        pages.length - 1
    },
  )

  return pages
}

function companyHtml(
  settings: OfferPdfSettings,
) {
  const logo =
    settings.showLogo &&
    settings.logoDataUrl
      ? `
        <img
          class="company-logo"
          src="${esc(
            settings.logoDataUrl,
          )}"
          alt="Logo tvrtke"
        />
      `
      : ''

  const contactLine = [
    settings.companyPhone,
    settings.companyEmail,
    settings.companyWebsite,
  ]
    .filter(Boolean)
    .join(' • ')

  return `
    <div class="company">
      ${logo}

      <div class="company-copy">
        <div class="company-name">
          ${esc(
            settings.companyName,
          )}
        </div>

        ${
          settings.companySubtitle
            ? `
              <div class="company-subtitle">
                ${esc(
                  settings.companySubtitle,
                )}
              </div>
            `
            : ''
        }

        ${
          settings.companyAddress
            ? `
              <div class="company-line">
                ${esc(
                  settings.companyAddress,
                )}
              </div>
            `
            : ''
        }

        ${
          settings.companyOib
            ? `
              <div class="company-line">
                OIB: ${esc(
                  settings.companyOib,
                )}
              </div>
            `
            : ''
        }

        ${
          contactLine
            ? `
              <div class="company-line">
                ${esc(
                  contactLine,
                )}
              </div>
            `
            : ''
        }
      </div>
    </div>
  `
}

function headingHtml(
  offer: OfferPdfData,
  settings: OfferPdfSettings,
) {
  return `
    <section class="top-head">
      <div class="brand-side">
        ${companyHtml(
          settings,
        )}
      </div>

      <div class="title-side">
        <div class="offer-title">
          ${esc(
            settings.documentTitle ||
              'PONUDA',
          )}
        </div>

        <div class="offer-kicker">
          KOMERCIJALNA PONUDA
        </div>

        <div class="head-metrics">
          <div class="metric">
            <span>Ponuda br.</span>
            <strong>
              ${esc(
                offer.offerNumber,
              )}
            </strong>
          </div>

          <div class="metric">
            <span>Datum</span>
            <strong>
              ${date(
                offer.date,
              )}
            </strong>
          </div>

          <div class="metric">
            <span>Vrijedi do</span>
            <strong>
              ${date(
                offer.validUntil,
              )}
            </strong>
          </div>
        </div>
      </div>
    </section>
  `
}

function clientHtml(
  offer: OfferPdfData,
) {
  const address = [
    offer.address,
    offer.city,
  ]
    .filter(Boolean)
    .join(', ')

  const deliveryPlace =
    offer.deliveryPlace ||
    address ||
    '—'

  const deliveryPeriod =
    offer.deliveryPeriod ||
    'Prema dogovoru'

  const deliveryMethod =
    offer.deliveryMethod ||
    'Dostava / usluga'

  return `
    <section class="info-grid">
      <article class="info-card">
        <div class="block-title">
          PODACI O KLIJENTU
        </div>

        <div class="client-name">
          ${esc(
            offer.customerName,
          )}
        </div>

        <div class="client-lines">
          ${
            address
              ? `<div>${esc(
                  address,
                )}</div>`
              : ''
          }

          ${
            offer.oib
              ? `<div>OIB: ${esc(
                  offer.oib,
                )}</div>`
              : ''
          }

          ${
            offer.email
              ? `<div>${esc(
                  offer.email,
                )}</div>`
              : ''
          }

          ${
            offer.phone
              ? `<div>${esc(
                  offer.phone,
                )}</div>`
              : ''
          }
        </div>
      </article>

      <article class="info-card">
        <div class="block-title">
          PODACI O PONUDI
        </div>

        <div class="info-line">
          <span>Izradio/la</span>
          <strong>
            ${esc(
              offer.responsiblePerson ||
                '—',
            )}
          </strong>
        </div>

        <div class="info-line">
          <span>Mjesto isporuke</span>
          <strong>
            ${esc(
              deliveryPlace,
            )}
          </strong>
        </div>

        <div class="info-line">
          <span>Razdoblje isporuke</span>
          <strong>
            ${esc(
              deliveryPeriod,
            )}
          </strong>
        </div>

        <div class="info-line">
          <span>Način isporuke</span>
          <strong>
            ${esc(
              deliveryMethod,
            )}
          </strong>
        </div>

        <div class="info-line">
          <span>Valuta</span>
          <strong>EUR</strong>
        </div>
      </article>
    </section>
  `
}

function tableHeaderHtml(
  settings: OfferPdfSettings,
) {
  return `
    <div
      class="items-head table-${esc(
        settings.tableStyle,
      )}"
    >
      <div>RBR.</div>
      <div>OPIS STAVKE</div>
      <div>KOL.</div>
      <div>JED.</div>
      <div>JED. CIJENA</div>
      <div>POPUST</div>
      <div>PDV</div>
      <div>UKUPNO</div>
    </div>
  `
}

function itemRows(
  items: OfferPdfItem[],
  start: number,
  settings: OfferPdfSettings,
) {
  return items
    .map(
      (
        item,
        index,
      ) => {
        const image =
          settings.showItemImages &&
          item.imageDataUrl
            ? `
              <div class="item-image-wrap">
                <img
                  class="item-image"
                  src="${esc(
                    item.imageDataUrl,
                  )}"
                  alt="${esc(
                    item.imageName ||
                      item.name,
                  )}"
                />
              </div>
            `
            : ''

        return `
          <article
            class="item-row ${
              image
                ? 'has-image'
                : ''
            }"
          >
            <div class="item-index">
              ${String(
                start +
                  index +
                  1,
              ).padStart(
                2,
                '0',
              )}
            </div>

            <div class="item-main">
              ${
                image
                  ? `
                    <div class="item-main-grid">
                      ${image}
                      <div>
                  `
                  : ''
              }

              <div class="item-name">
                ${esc(
                  item.name,
                )}
              </div>

              ${
                item.description
                  ? `
                    <div class="item-description">
                      ${multi(
                        item.description,
                      )}
                    </div>
                  `
                  : ''
              }

              ${
                image
                  ? `
                      </div>
                    </div>
                  `
                  : ''
              }
            </div>

            <div class="item-cell">
              ${number(
                item.quantity,
              )}
            </div>

            <div class="item-cell">
              ${esc(
                item.unit,
              )}
            </div>

            <div class="item-cell price">
              ${currency(
                item.price,
              )}
            </div>

            <div class="item-cell">
              ${
                item.discount
                  ? `${number(
                      item.discount,
                    )}%`
                  : '0%'
              }
            </div>

            <div class="item-cell">
              ${number(
                item.vat,
              )}%
            </div>

            <div class="item-cell total">
              ${currency(
                itemTotal(item),
              )}
            </div>
          </article>
        `
      },
    )
    .join('')
}

function notesAndTotalsHtml(
  offer: OfferPdfData,
  base: number,
  net: number,
  vat: number,
  discount: number,
  total: number,
) {
  const notes = [
    offer.description,
    offer.paymentTerms,
  ].filter(
    (value) =>
      value?.trim(),
  )

  return `
    <section class="summary-grid">
      <div class="notes-card">
        <div class="block-title">
          NAPOMENE I UVJETI
        </div>

        ${
          notes.length
            ? notes
                .map(
                  (value) =>
                    `<div class="note-line">${multi(
                      value,
                    )}</div>`,
                )
                .join('')
            : `
              <div class="note-line">
                Ponuda vrijedi do navedenog datuma.
              </div>
            `
        }
      </div>

      <div class="totals">
        <div class="total-line">
          <span>
            Ukupno prije popusta
          </span>
          <strong>
            ${currency(
              base,
            )}
          </strong>
        </div>

        ${
          discount > 0
            ? `
              <div class="total-line">
                <span>Popust</span>
                <strong>
                  − ${currency(
                    discount,
                  )}
                </strong>
              </div>
            `
            : ''
        }

        <div class="total-line">
          <span>Osnovica</span>
          <strong>
            ${currency(
              net,
            )}
          </strong>
        </div>

        <div class="total-line">
          <span>PDV</span>
          <strong>
            ${currency(
              vat,
            )}
          </strong>
        </div>

        <div class="grand-total">
          <span>
            UKUPNO ZA PLATITI
          </span>
          <strong>
            ${currency(
              total,
            )}
          </strong>
        </div>
      </div>
    </section>
  `
}

function signatureAndPaymentHtml(
  offer: OfferPdfData,
  settings: OfferPdfSettings,
) {
  const signature =
    settings.showSignature &&
    settings.signatureDataUrl
      ? `
        <img
          class="signature-image"
          src="${esc(
            settings.signatureDataUrl,
          )}"
          alt="Potpis"
        />
      `
      : ''

  const stamp =
    settings.showStamp &&
    settings.stampDataUrl
      ? `
        <img
          class="stamp-image"
          src="${esc(
            settings.stampDataUrl,
          )}"
          alt="Pečat"
        />
      `
      : ''

  const showSignatures =
    settings.showSignature ||
    settings.showStamp

  const paymentLines = [
    [
      'Primatelj',
      settings.companyName,
    ],
    [
      'IBAN',
      settings.companyIban,
    ],
    [
      'Banka',
      settings.companyBankName,
    ],
    [
      'Poziv / opis',
      offer.offerNumber,
    ],
  ].filter(
    ([, value]) =>
      Boolean(value),
  )

  const quickPay =
    settings.quickPayBarcodeDataUrl
      ? `
        <div class="offer-quick-pay">
          <div class="quick-pay-label">
            BRZO PLAĆANJE
          </div>

          <div class="quick-pay-copy">
            Skeniraj 2D barkod mobilnim bankarstvom
          </div>

          <div class="quick-pay-barcode-wrap">
            <img
              class="quick-pay-barcode"
              src="${esc(
                settings.quickPayBarcodeDataUrl,
              )}"
              alt="HUB3 PDF417 barkod za brzo plaćanje"
            />
          </div>
        </div>
      `
      : ''

  return `
    <section class="closing-grid">
      <div class="signature-area">
        ${
          showSignatures
            ? `
              <div class="signature-card">
                <div class="signature-label">
                  Ponudu izradio
                </div>

                <div class="signature-media">
                  ${signature}
                  ${stamp}
                </div>

                <div class="signature-name">
                  ${esc(
                    offer.responsiblePerson ||
                      settings.companyName,
                  )}
                </div>
              </div>

              <div class="signature-card">
                <div class="signature-label">
                  Prihvat ponude / klijent
                </div>

                <div class="signature-media"></div>

                <div class="signature-name">
                  ${esc(
                    offer.customerName,
                  )}
                </div>
              </div>
            `
            : ''
        }
      </div>

      ${
        paymentLines.length
          ? `
            <div class="payment-card">
              <div class="block-title">
                PODACI ZA PLAĆANJE
              </div>

              ${paymentLines
                .map(
                  ([
                    label,
                    value,
                  ]) => `
                    <div class="payment-line">
                      <span>${esc(
                        label,
                      )}</span>
                      <strong>${esc(
                        value,
                      )}</strong>
                    </div>
                  `,
                )
                .join('')}

              ${quickPay}
            </div>
          `
          : ''
      }
    </section>
  `
}

function footerHtml(
  settings: OfferPdfSettings,
  pageIndex: number,
  totalPages: number,
) {
  if (!settings.showFooter) {
    return ''
  }

  const business = [
    settings.companyName,
    settings.companyAddress,
    settings.companyOib
      ? `OIB: ${settings.companyOib}`
      : '',
    settings.companyEmail,
    settings.companyWebsite,
  ]
    .filter(Boolean)
    .join(' • ')

  return `
    <footer class="footer">
      <span>
        ${esc(
          settings.footerText ||
            business ||
            'Hvala na povjerenju.',
        )}
      </span>

      <strong>
        ${pageIndex + 1} / ${totalPages}
      </strong>
    </footer>
  `
}

function css(
  settings: OfferPdfSettings,
) {
  const p =
    settings.primaryColor
  const s =
    settings.secondaryColor
  const a =
    settings.accentColor
  const t =
    settings.textColor
  const b =
    settings.borderColor
  const bg =
    settings.backgroundColor
  const preset =
    settings.preset

  const compact =
    settings.density ===
    'compact'

  const headerFill =
    settings.tableStyle ===
    'minimal'
      ? s
      : p

  const cardRadius =
    preset === 'minimal'
      ? 4
      : 10

  return `
    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      background: #dfe5ec;
      color: ${t};
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      background: rgba(15,23,42,.97);
    }

    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-weight: 800;
      cursor: pointer;
    }

    .toolbar .primary {
      background: ${p};
      color: #fff;
    }

    .toolbar .secondary {
      background: #1e293b;
      color: #fff;
    }

    .pages {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      padding: 20px 0 36px;
    }

    .page {
      position: relative;
      width: 794px;
      height: 1123px;
      overflow: hidden;
      background: ${bg};
      box-shadow:
        0 18px 60px
        rgba(15,23,42,.18);
    }

    .page-content {
      position: relative;
      z-index: 2;
      display: flex;
      min-height: 1123px;
      flex-direction: column;
      padding:
        ${compact
          ? '42px 46px 35px'
          : '46px 48px 36px'};
    }

    .watermark {
      position: absolute;
      left: 50%;
      top: 50%;
      z-index: 1;
      transform:
        translate(-50%, -50%)
        rotate(-28deg);
      color: ${alpha(
        p,
        '0D',
      )};
      font-size: 80px;
      font-weight: 950;
      letter-spacing: .12em;
      white-space: nowrap;
      pointer-events: none;
    }

    .top-head {
      display: grid;
      grid-template-columns:
        minmax(0, .94fr)
        minmax(0, 1.06fr);
      gap: 30px;
      align-items: start;
      padding-bottom: 17px;
      border-bottom:
        2px solid ${p};
    }

    .brand-side {
      min-width: 0;
    }

    .company {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }

    .company-logo {
      width: 76px;
      height: 63px;
      flex: 0 0 auto;
      object-fit: contain;
    }

    .company-copy {
      min-width: 0;
      padding-top: 1px;
    }

    .company-name {
      font-size: 17px;
      line-height: 1.08;
      font-weight: 950;
      letter-spacing: -.02em;
    }

    .company-subtitle {
      margin-top: 3px;
      color: ${p};
      font-size: 8.5px;
      line-height: 1.3;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .company-line {
      margin-top: 3px;
      color: ${alpha(
        t,
        'A8',
      )};
      font-size: 8px;
      line-height: 1.35;
    }

    .title-side {
      min-width: 0;
      padding-left: 24px;
      border-left:
        1px solid ${alpha(
          p,
          '55',
        )};
    }

    .offer-title {
      font-size: 34px;
      line-height: .95;
      font-weight: 950;
      letter-spacing: -.035em;
    }

    .offer-kicker {
      margin-top: 7px;
      color: ${p};
      font-size: 9px;
      font-weight: 950;
      letter-spacing: .22em;
    }

    .head-metrics {
      display: grid;
      grid-template-columns:
        repeat(3, 1fr);
      gap: 7px;
      margin-top: 15px;
    }

    .metric {
      min-height: 48px;
      padding:
        7px 8px 6px;
      border:
        1px solid ${alpha(
          b,
          'CC',
        )};
      border-radius:
        ${cardRadius}px;
      background:
        ${alpha(
          p,
          preset ===
          'classic'
            ? '07'
            : '05',
        )};
    }

    .metric span {
      display: block;
      color: ${p};
      font-size: 6.5px;
      font-weight: 950;
      text-transform: uppercase;
    }

    .metric strong {
      display: block;
      margin-top: 5px;
      font-size: 9px;
      line-height: 1.15;
      font-weight: 950;
    }

    .info-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 18px;
      margin-top: 16px;
    }

    .info-card {
      min-height: 94px;
      padding:
        ${compact
          ? '10px 12px'
          : '12px 14px'};
      border:
        1px solid ${alpha(
          b,
          'D6',
        )};
      border-radius:
        ${cardRadius}px;
      background:
        ${
          settings.infoStyle ===
          'cards'
            ? alpha(
                p,
                '04',
              )
            : 'transparent'
        };
    }

    .info-lines .info-card,
    .info-minimal .info-card {
      border-left: 0;
      border-right: 0;
      border-radius: 0;
      background: transparent;
    }

    .block-title {
      color: ${p};
      font-size: 8px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: .04em;
    }

    .client-name {
      margin-top: 7px;
      font-size: 11.5px;
      line-height: 1.2;
      font-weight: 950;
    }

    .client-lines {
      margin-top: 5px;
      color: ${alpha(
        t,
        'A6',
      )};
      font-size: 8px;
      line-height: 1.45;
    }

    .info-line {
      display: grid;
      grid-template-columns:
        43% 57%;
      gap: 8px;
      padding:
        3.5px 0;
      border-bottom:
        1px solid ${alpha(
          b,
          '99',
        )};
      font-size: 7.7px;
      line-height: 1.25;
    }

    .info-line:last-child {
      border-bottom: 0;
    }

    .info-line span {
      color: ${alpha(
        t,
        '8A',
      )};
    }

    .info-line strong {
      text-align: right;
      font-weight: 900;
    }

    .items-wrap {
      margin-top: 15px;
      border:
        1px solid ${alpha(
          b,
          'DD',
        )};
      border-radius:
        ${cardRadius}px;
      overflow: hidden;
    }

    .items-head {
      display: grid;
      grid-template-columns:
        38px minmax(0, 1fr)
        53px 47px 76px
        55px 45px 82px;
      gap: 0;
      align-items: center;
      min-height: 29px;
      padding: 0 8px;
      background:
        ${headerFill};
      color: #fff;
      font-size: 6.2px;
      font-weight: 950;
      text-transform: uppercase;
      letter-spacing: .025em;
    }

    .table-soft.items-head {
      background:
        linear-gradient(
          90deg,
          ${p},
          ${a}
        );
    }

    .table-minimal.items-head {
      background:
        ${s};
    }

    .item-row {
      display: grid;
      grid-template-columns:
        38px minmax(0, 1fr)
        53px 47px 76px
        55px 45px 82px;
      gap: 0;
      align-items: center;
      min-height:
        ${compact
          ? 48
          : 54}px;
      padding: 5px 8px;
      border-top:
        1px solid ${alpha(
          b,
          'AA',
        )};
      background: #fff;
    }

    .item-row:nth-child(even) {
      background:
        ${settings.tableStyle ===
        'soft'
          ? alpha(
              p,
              '04',
            )
          : '#FFFFFF'};
    }

    .item-index {
      color: ${p};
      font-size: 9px;
      font-weight: 950;
    }

    .item-main {
      min-width: 0;
      padding-right: 8px;
    }

    .item-main-grid {
      display: grid;
      grid-template-columns:
        58px minmax(0,1fr);
      gap: 8px;
      align-items: center;
    }

    .item-image-wrap {
      width: 58px;
      height: 42px;
      display: grid;
      place-items: center;
      overflow: hidden;
      border:
        1px solid ${alpha(
          b,
          'B8',
        )};
      border-radius: 6px;
      background: #fff;
    }

    .item-image {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .item-name {
      font-size: 9.4px;
      line-height: 1.18;
      font-weight: 950;
    }

    .item-description {
      margin-top: 3px;
      color: ${alpha(
        t,
        '8A',
      )};
      font-size: 7px;
      line-height: 1.25;
    }

    .item-cell {
      padding: 0 3px;
      font-size: 7.5px;
      line-height: 1.2;
      text-align: center;
    }

    .item-cell.price {
      text-align: right;
    }

    .item-cell.total {
      font-size: 8.1px;
      font-weight: 950;
      text-align: right;
    }

    .summary-grid {
      display: grid;
      grid-template-columns:
        minmax(0, 1fr)
        285px;
      gap: 22px;
      align-items: start;
      margin-top: 14px;
      break-inside: avoid;
    }

    .notes-card {
      min-height: 86px;
      padding: 10px 12px;
      border:
        1px solid ${alpha(
          b,
          'C4',
        )};
      border-radius:
        ${cardRadius}px;
      background:
        ${alpha(
          p,
          '035',
        )};
    }

    .note-line {
      margin-top: 6px;
      color: ${alpha(
        t,
        'A4',
      )};
      font-size: 7.6px;
      line-height: 1.38;
    }

    .totals {
      min-width: 0;
    }

    .total-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 5px 8px;
      border-bottom:
        1px solid ${alpha(
          b,
          'AA',
        )};
      font-size: 8px;
    }

    .total-line strong {
      font-weight: 950;
    }

    .grand-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      margin-top: 6px;
      padding: 10px 12px;
      border-radius:
        ${cardRadius}px;
      background:
        ${
          preset ===
          'minimal'
            ? s
            : `linear-gradient(90deg, ${p}, ${a})`
        };
      color: #fff;
      font-size: 10.5px;
      font-weight: 950;
    }

    .grand-total strong {
      font-size: 15px;
      white-space: nowrap;
    }

    .closing-grid {
      display: grid;
      grid-template-columns:
        minmax(0, 1.1fr)
        minmax(0, .9fr);
      gap: 18px;
      margin-top: 13px;
      align-items: start;
      break-inside: avoid;
    }

    .signature-area {
      display: grid;
      grid-template-columns:
        repeat(2, minmax(0,1fr));
      gap: 9px;
      align-self: start;
    }

    .signature-card {
      height: 112px;
      min-height: 112px;
      padding: 9px 11px;
      border:
        1px solid ${alpha(
          p,
          '66',
        )};
      border-radius:
        ${cardRadius}px;
    }

    .signature-label {
      color: ${p};
      font-size: 6.8px;
      font-weight: 850;
    }

    .signature-media {
      display: flex;
      height: 51px;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .signature-image {
      max-width: 205px;
      max-height: 68px;
      object-fit: contain;
    }

    .stamp-image {
      max-width: 185px;
      max-height: 98px;
      object-fit: contain;
    }

    .signature-name {
      font-size: 7.4px;
      font-weight: 950;
    }

    .payment-card {
      min-height: 112px;
      padding: 9px 11px;
      align-self: start;
      break-inside: avoid;
      border:
        1px solid ${alpha(
          p,
          '66',
        )};
      border-radius:
        ${cardRadius}px;
    }

    .offer-quick-pay {
      margin-top: 8px;
      padding-top: 7px;
      border-top:
        1px solid ${alpha(
          b,
          'AA',
        )};
    }

    .quick-pay-label {
      color: ${p};
      font-size: 6.6px;
      font-weight: 950;
      letter-spacing: .05em;
    }

    .quick-pay-copy {
      margin-top: 2px;
      color: ${alpha(
        t,
        '82',
      )};
      font-size: 5.8px;
      line-height: 1.25;
    }

    .quick-pay-barcode-wrap {
      display: grid;
      place-items: center;
      margin-top: 5px;
      padding: 3px;
      background: #fff;
    }

    .quick-pay-barcode {
      display: block;
      width: 55mm;
      max-width: 100%;
      max-height: 25mm;
      height: auto;
      object-fit: contain;
      image-rendering: auto;
    }

    .payment-line {
      display: grid;
      grid-template-columns:
        36% 64%;
      gap: 8px;
      margin-top: 5px;
      font-size: 7px;
      line-height: 1.25;
    }

    .payment-line span {
      color: ${alpha(
        t,
        '88',
      )};
    }

    .payment-line strong {
      overflow-wrap: anywhere;
      font-weight: 900;
    }

    .continuation-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      padding-bottom: 14px;
      border-bottom:
        2px solid ${p};
    }

    .continuation-title {
      font-size: 20px;
      font-weight: 950;
    }

    .continuation-copy {
      margin-top: 3px;
      color: ${alpha(
        t,
        '88',
      )};
      font-size: 8px;
    }

    .footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-top: auto;
      padding-top: 9px;
      border-top:
        1px solid ${alpha(
          p,
          '55',
        )};
      color: ${alpha(
        t,
        '7F',
      )};
      font-size: 6.5px;
      line-height: 1.3;
    }

    .footer strong {
      color: ${t};
      font-size: 7.5px;
    }

    @media print {
      @page {
        size: A4;
        margin: 0;
      }

      html,
      body {
        background: #fff;
      }

      .toolbar {
        display: none !important;
      }

      .pages {
        padding: 0;
      }

      .page {
        margin: 0;
        box-shadow: none;
      }
    }
  `
}

function buildFirstOrOnlyPage(
  page: OfferPage,
  pageIndex: number,
  totalPages: number,
  startIndex: number,
  offer: OfferPdfData,
  settings: OfferPdfSettings,
  totals: {
    base: number
    net: number
    vat: number
    discount: number
    total: number
  },
) {
  return `
    <section class="page">
      ${
        settings.showWatermark &&
        settings.watermarkText
          ? `
            <div class="watermark">
              ${esc(
                settings.watermarkText,
              )}
            </div>
          `
          : ''
      }

      <div class="page-content">
        ${
          page.first
            ? `
              ${headingHtml(
                offer,
                settings,
              )}

              <div class="info-${esc(
                settings.infoStyle,
              )}">
                ${clientHtml(
                  offer,
                )}
              </div>
            `
            : `
              <header class="continuation-head">
                ${companyHtml(
                  settings,
                )}

                <div>
                  <div class="continuation-title">
                    ${esc(
                      settings.documentTitle ||
                        'PONUDA',
                    )}
                  </div>

                  <div class="continuation-copy">
                    Nastavak ·
                    ${esc(
                      offer.offerNumber,
                    )}
                  </div>
                </div>
              </header>
            `
        }

        <section
          class="items-wrap"
        >
          ${tableHeaderHtml(
            settings,
          )}

          ${itemRows(
            page.items,
            startIndex,
            settings,
          )}
        </section>

        ${
          page.final
            ? `
              ${notesAndTotalsHtml(
                offer,
                totals.base,
                totals.net,
                totals.vat,
                totals.discount,
                totals.total,
              )}

              ${signatureAndPaymentHtml(
                offer,
                settings,
              )}
            `
            : ''
        }

        ${footerHtml(
          settings,
          pageIndex,
          totalPages,
        )}
      </div>
    </section>
  `
}

export function buildOfferPdfHtml(
  offer: OfferPdfData,
  customSettings:
    Partial<OfferPdfSettings> = {},
) {
  const settings: OfferPdfSettings =
    {
      ...DEFAULT_SETTINGS,
      ...customSettings,
    }

  const items =
    offer.items.filter(
      (item) =>
        item.name.trim(),
    )

  const base =
    items.reduce(
      (sum, item) =>
        sum +
        itemBase(item),
      0,
    )

  const net =
    items.reduce(
      (sum, item) =>
        sum +
        itemNet(item),
      0,
    )

  const vat =
    items.reduce(
      (sum, item) =>
        sum +
        itemVat(item),
      0,
    )

  const discount =
    base - net

  const total =
    net + vat

  const pages =
    paginateItems(
      items,
      settings,
    )

  let itemIndex = 0

  const pagesHtml =
    pages
      .map(
        (
          page,
          pageIndex,
        ) => {
          const startIndex =
            itemIndex

          itemIndex +=
            page.items.length

          return buildFirstOrOnlyPage(
            page,
            pageIndex,
            pages.length,
            startIndex,
            offer,
            settings,
            {
              base,
              net,
              vat,
              discount,
              total,
            },
          )
        },
      )
      .join('')

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />
  <meta
    name="viewport"
    content="width=device-width,initial-scale=1"
  />
  <title>
    ${esc(
      offer.offerNumber,
    )}
  </title>
  <style>
    ${css(settings)}
  </style>
</head>

<body>
  <div class="toolbar">
    <button
      class="primary"
      onclick="window.print()"
    >
      Ispis / spremi kao PDF
    </button>

    <button
      class="secondary"
      onclick="window.close()"
    >
      Zatvori
    </button>
  </div>

  <main class="pages">
    ${pagesHtml}
  </main>
</body>
</html>`
}

async function resolvedPdfSettings(
  customSettings:
    Partial<OfferPdfSettings>,
) {
  const [
    company,
    appearanceResult,
  ] =
    await Promise.all([
      getCompanySettings(),
      getDocumentAppearanceSettings(),
    ])

  return {
    ...DEFAULT_SETTINGS,
    ...companySettingsFromCurrent(
      company,
    ),
    ...appearanceToPdfSettings(
      appearanceResult
        .settings.offer,
    ),
    ...customSettings,
  } satisfies OfferPdfSettings
}

async function prepareOfferPdfSettings(
  offer: OfferPdfData,
  customSettings:
    Partial<OfferPdfSettings>,
) {
  const settings =
    await resolvedPdfSettings(
      customSettings,
    )

  const items =
    offer.items.filter(
      (item) =>
        item.name.trim(),
    )

  const total =
    items.reduce(
      (sum, item) =>
        sum +
        itemTotal(item),
      0,
    )

  const iban =
    settings.companyIban
      .replace(
        /\s+/g,
        '',
      )
      .toUpperCase()

  if (
    !iban ||
    total <= 0
  ) {
    return settings
  }

  try {
    const paymentReference =
      offer.offerNumber
        .replace(
          /\D/g,
          '',
        )
        .slice(0, 22)

    const barcode =
      createHub3Pdf417DataUrl(
        {
          amount: total,

          payerName:
            offer.customerName,

          payerStreet:
            offer.address,

          payerPostalCity:
            offer.city,

          recipientName:
            settings.companyName,

          recipientStreet:
            settings.companyStreetAddress,

          recipientPostalCity:
            settings.companyPostalCity,

          iban,

          model:
            'HR00',

          reference:
            paymentReference,

          purposeCode:
            'OTHR',

          description:
            `Ponuda ${offer.offerNumber}`,
        },
      )

    return {
      ...settings,
      quickPayBarcodeDataUrl:
        barcode,
    }
  } catch (error) {
    console.warn(
      'HUB3 barkod ponude nije generiran:',
      error,
    )

    return {
      ...settings,
      quickPayBarcodeDataUrl:
        undefined,
    }
  }
}

async function waitForImages(
  doc: Document,
) {
  const images =
    Array.from(
      doc.querySelectorAll(
        'img',
      ),
    )

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>(
          (resolve) => {
            if (
              image.complete
            ) {
              resolve()
              return
            }

            image.onload =
              () => resolve()

            image.onerror =
              () => resolve()
          },
        ),
    ),
  )
}

async function renderHtmlPagesToPdf(
  html: string,
  fileName: string,
  backgroundColor: string,
) {
  const iframe =
    document.createElement(
      'iframe',
    )

  Object.assign(
    iframe.style,
    {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '794px',
      height: '1123px',
      border: '0',
      pointerEvents:
        'none',
      zIndex:
        '-2147483647',
    },
  )

  document.body.appendChild(
    iframe,
  )

  try {
    const doc =
      iframe.contentDocument

    if (!doc) {
      throw new Error(
        'PDF renderer nije dostupan.',
      )
    }

    doc.open()
    doc.write(html)
    doc.close()

    await new Promise<void>(
      (resolve) =>
        window.setTimeout(
          resolve,
          120,
        ),
    )

    await doc.fonts?.ready
    await waitForImages(doc)

    const toolbar =
      doc.querySelector(
        '.toolbar',
      ) as HTMLElement | null

    if (toolbar) {
      toolbar.style.display =
        'none'
    }

    const pages =
      Array.from(
        doc.querySelectorAll(
          '.page',
        ),
      ) as HTMLElement[]

    const pdf = new jsPDF({
      orientation:
        'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    for (
      let index = 0;
      index < pages.length;
      index += 1
    ) {
      const page =
        pages[index]

      page.style.margin = '0'
      page.style.boxShadow =
        'none'

      const canvas =
        await html2canvas(
          page,
          {
            /**
             * 2.2x je dovoljno oštro za A4, a na mobitelu
             * koristi višestruko manje memorije i vremena od 4x.
             */
            scale: 2.2,
            backgroundColor,
            useCORS: true,
            allowTaint: false,
            logging: false,
            imageTimeout: 5000,
          },
        )

      const image =
        canvas.toDataURL(
          'image/jpeg',
          0.92,
        )

      if (index > 0) {
        pdf.addPage()
      }

      pdf.addImage(
        image,
        'JPEG',
        0,
        0,
        210,
        297,
        undefined,
        'FAST',
      )
    }

    const blob =
      pdf.output(
        'blob',
      )

    saveBlobDownload(
      blob,
      fileName,
    )
  } finally {
    iframe.remove()
  }
}

export function openOfferPdf(
  offer: OfferPdfData,
  customSettings:
    Partial<OfferPdfSettings> = {},
) {
  const previewWindow =
    window.open(
      '',
      '_blank',
    )

  if (!previewWindow) {
    window.alert(
      'Preglednik je blokirao novi prozor. Dopusti skočne prozore za FERSYS.',
    )
    return
  }

  previewWindow.document.write(
    '<p style="font-family:system-ui;padding:24px">Priprema ponude...</p>',
  )

  void (async () => {
    try {
      const settings =
        await prepareOfferPdfSettings(
          offer,
          customSettings,
        )

      const html =
        buildOfferPdfHtml(
          offer,
          settings,
        )

      previewWindow.document.open()
      previewWindow.document.write(
        html,
      )
      previewWindow.document.close()
    } catch (error) {
      console.error(error)

      previewWindow.document.open()
      previewWindow.document.write(
        '<p style="font-family:system-ui;padding:24px">PDF ponude nije moguće izraditi.</p>',
      )
      previewWindow.document.close()
    }
  })()
}

export async function downloadOfferPdf(
  data: OfferPdfData,
  customSettings:
    Partial<OfferPdfSettings> = {},
) {
  const fileName =
    `${safeFileName(
      data.offerNumber ||
        'Ponuda',
    )}-${safeFileName(
      data.customerName ||
        'Investitor',
    )}.pdf`

  notifyDownloadPreparing(
    fileName,
  )

  try {
    const settings =
      await prepareOfferPdfSettings(
        data,
        customSettings,
      )

    const html =
      buildOfferPdfHtml(
        data,
        settings,
      )

    await renderHtmlPagesToPdf(
      html,
      fileName,
      settings.backgroundColor ||
        '#FFFFFF',
    )
  } catch (error) {
    console.error(
      'downloadOfferPdf error:',
      error,
    )

    const message =
      error instanceof Error
        ? `PDF nije moguće izraditi: ${error.message}`
        : 'PDF nije moguće izraditi.'

    notifyDownloadError(
      message,
      fileName,
    )

    window.alert(
      message,
    )
  }
}