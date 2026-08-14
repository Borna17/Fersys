import {
  getCompanySettings,
} from '../services/companySettings.service'

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
}

export type OfferPdfSettings = {
  companyName: string
  companySubtitle: string
  companyAddress: string
  companyOib: string
  companyIban: string
  companyEmail: string
  companyPhone: string
  companyWebsite: string
  logoDataUrl?: string
  stampDataUrl?: string
  signatureDataUrl?: string
  primaryColor: string
  showItemImages: boolean
  showSignature: boolean
  showStamp: boolean
  showFooter: boolean
  footerText: string
}

const DEFAULT_SETTINGS:
OfferPdfSettings = {
  companyName: 'Tvrtka',
  companySubtitle: '',
  companyAddress: '',
  companyOib: '',
  companyIban: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  logoDataUrl: undefined,
  stampDataUrl: undefined,
  signatureDataUrl: undefined,
  primaryColor: '#2563EB',
  showItemImages: true,
  showSignature: true,
  showStamp: true,
  showFooter: true,
  footerText:
    'Ponuda je izrađena u sustavu FERSYS.',
}

function escapeHtml(
  value:
    | string
    | number
    | null
    | undefined,
) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function multilineHtml(
  value: string,
) {
  return escapeHtml(value)
    .replace(
      /\r?\n/g,
      '<br />',
    )
}

function formatCurrency(
  value: number,
) {
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

function formatNumber(
  value: number,
) {
  return new Intl.NumberFormat(
    'hr-HR',
    {
      maximumFractionDigits: 2,
    },
  ).format(value)
}

function formatDate(
  value: string,
) {
  if (!value) return '—'

  return new Date(
    `${value}T12:00:00`,
  ).toLocaleDateString(
    'hr-HR',
  )
}

function itemNet(
  item: OfferPdfItem,
) {
  return (
    item.quantity *
    item.price *
    (1 -
      item.discount / 100)
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
  settings:
    Awaited<
      ReturnType<
        typeof getCompanySettings
      >
    >,
): Partial<OfferPdfSettings> {
  return {
    companyName:
      settings.name,
    companySubtitle:
      settings.documentWatermark,
    companyAddress:
      [
        settings.address,
        [
          settings.postalCode,
          settings.city,
        ]
          .filter(Boolean)
          .join(' '),
      ]
        .filter(Boolean)
        .join(', '),
    companyOib:
      settings.oib,
    companyIban:
      settings.iban,
    companyEmail:
      settings.email,
    companyPhone:
      settings.phone,
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
    primaryColor:
      settings.primaryColor ||
      '#2563EB',
    footerText:
      settings.documentFooter,
    showStamp:
      Boolean(
        settings.stampUrl,
      ),
    showSignature: true,
    showFooter: true,
    showItemImages: true,
  }
}

function paginateItems(
  items: OfferPdfItem[],
  showImages: boolean,
) {
  const pages:
    OfferPdfItem[][] = []

  let current:
    OfferPdfItem[] = []

  let weight = 0
  let first = true

  for (
    const item
    of items
  ) {
    const rowWeight =
      1 +
      Math.min(
        1.6,
        item.description.length /
          150,
      ) +
      (
        showImages &&
        item.imageDataUrl
          ? 1.7
          : 0
      )

    const capacity =
      first
        ? (
            showImages
              ? 8.5
              : 12
          )
        : (
            showImages
              ? 10
              : 15
          )

    if (
      current.length > 0 &&
      weight +
        rowWeight >
        capacity
    ) {
      pages.push(current)
      current = []
      weight = 0
      first = false
    }

    current.push(item)
    weight += rowWeight
  }

  if (
    current.length > 0 ||
    pages.length === 0
  ) {
    pages.push(current)
  }

  return pages
}

function documentCss(
  primaryColor: string,
) {
  return `
    :root {
      --primary: ${primaryColor};
      --ink: #0f172a;
      --text: #334155;
      --muted: #64748b;
      --border: #dbe3ee;
      --surface: #f8fafc;
      --soft:
        color-mix(
          in srgb,
          var(--primary) 8%,
          white
        );
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      background: #dfe5ec;
      color: var(--text);
      font-family:
        Inter,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        Arial,
        sans-serif;
      -webkit-print-color-adjust:
        exact;
      print-color-adjust:
        exact;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      justify-content: center;
      gap: 10px;
      padding: 12px;
      background:
        rgba(
          15,
          23,
          42,
          .97
        );
    }

    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-weight: 800;
      cursor: pointer;
    }

    .toolbar .primary {
      background: var(--primary);
      color: white;
    }

    .toolbar .secondary {
      border:
        1px solid
        #475569;
      background: #1e293b;
      color: #e2e8f0;
    }

    .pages {
      padding: 14px 0 28px;
    }

    .page {
      position: relative;
      display: flex;
      width: 210mm;
      height: 297mm;
      margin: 0 auto 14px;
      overflow: hidden;
      flex-direction: column;
      padding:
        13mm 13mm 10mm;
      background: white;
      box-shadow:
        0 18px 55px
        rgba(15,23,42,.18);
      break-after: page;
    }

    .page::before {
      position: absolute;
      inset: 0 0 auto;
      height: 4mm;
      background: var(--primary);
      content: "";
    }

    .header {
      display: grid;
      grid-template-columns:
        minmax(0,1fr)
        190px;
      gap: 24px;
      align-items: start;
      padding-top: 4mm;
      padding-bottom: 13px;
    }

    .company {
      display: flex;
      gap: 12px;
      min-width: 0;
    }

    .logo,
    .logo-fallback {
      width: 58px;
      height: 58px;
      flex: 0 0 58px;
      object-fit: contain;
    }

    .logo-fallback {
      display: grid;
      place-items: center;
      border-radius: 13px;
      background: var(--primary);
      color: white;
      font-size: 19px;
      font-weight: 900;
    }

    .company h1 {
      margin: 0;
      color: var(--ink);
      font-size: 21px;
      line-height: 1.1;
      font-weight: 950;
    }

    .subtitle {
      margin-top: 3px;
      color: var(--muted);
      font-size: 9px;
    }

    .seller-lines {
      margin-top: 6px;
      color: #475569;
      font-size: 8.5px;
      line-height: 1.45;
    }

    .heading {
      text-align: right;
    }

    .kicker {
      color: var(--primary);
      font-size: 8px;
      font-weight: 900;
      letter-spacing: .14em;
      text-transform: uppercase;
    }

    .heading h2 {
      margin: 4px 0 0;
      color: var(--ink);
      font-size: 31px;
      line-height: 1;
      font-weight: 950;
      letter-spacing: -.03em;
    }

    .number {
      display: inline-flex;
      margin-top: 7px;
      border-radius: 999px;
      padding: 5px 10px;
      background: var(--soft);
      color: var(--primary);
      font-size: 9.5px;
      font-weight: 900;
    }

    .summary {
      display: grid;
      grid-template-columns:
        repeat(4,1fr);
      gap: 1px;
      margin-top: 8px;
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 12px;
      background: var(--border);
    }

    .summary > div {
      padding: 9px 10px;
      background: var(--surface);
    }

    .summary span {
      display: block;
      color: var(--muted);
      font-size: 7.5px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .summary strong {
      display: block;
      margin-top: 3px;
      color: var(--ink);
      font-size: 9.5px;
    }

    .summary .total {
      background: var(--soft);
    }

    .summary .total strong {
      color: var(--primary);
      font-size: 12px;
    }

    .party-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 12px;
      margin-top: 13px;
    }

    .card {
      padding: 12px 13px;
      border:
        1px solid
        var(--border);
      border-radius: 12px;
      break-inside: avoid;
    }

    .card h3 {
      margin: 0 0 7px;
      color: var(--muted);
      font-size: 7.8px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .party-name {
      color: var(--ink);
      font-size: 13px;
      font-weight: 950;
    }

    .party-details {
      margin-top: 5px;
      font-size: 8.5px;
      line-height: 1.45;
    }

    .description {
      margin-top: 12px;
      padding: 10px 12px;
      border-left:
        4px solid
        var(--primary);
      border-radius:
        0 9px 9px 0;
      background:
        color-mix(
          in srgb,
          var(--primary) 4%,
          white
        );
      font-size: 9px;
      line-height: 1.5;
    }

    .section-title {
      margin: 15px 0 7px;
      color: var(--ink);
      font-size: 11px;
      font-weight: 950;
    }

    .table-wrap {
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8.4px;
    }

    th {
      padding: 7px 5px;
      background: var(--primary);
      color: white;
      font-size: 7.2px;
      text-align: left;
      text-transform: uppercase;
    }

    th:nth-child(1) {
      width: 5%;
    }

    th:nth-child(2) {
      width: 37%;
    }

    th:nth-child(3) {
      width: 8%;
    }

    th:nth-child(4) {
      width: 7%;
    }

    th:nth-child(5) {
      width: 13%;
    }

    th:nth-child(6) {
      width: 9%;
    }

    th:nth-child(7) {
      width: 8%;
    }

    th:nth-child(8) {
      width: 13%;
    }

    td {
      padding: 6px 5px;
      border-bottom:
        1px solid
        #e9eef5;
      vertical-align: middle;
    }

    tbody tr:nth-child(even) td {
      background: #fbfdff;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .item-wrap {
      display: flex;
      gap: 7px;
      align-items: flex-start;
    }

    .item-image {
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      border:
        1px solid
        var(--border);
      border-radius: 7px;
      object-fit: cover;
    }

    td strong {
      color: var(--ink);
      font-size: 8.6px;
    }

    td p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 7.4px;
      line-height: 1.35;
    }

    .right {
      text-align: right;
      white-space: nowrap;
    }

    .center {
      text-align: center;
    }

    .strong {
      color: var(--ink);
      font-weight: 900;
    }

    .bottom {
      display: grid;
      grid-template-columns:
        minmax(0,1fr)
        235px;
      gap: 14px;
      margin-top: 13px;
      align-items: start;
      break-inside: avoid;
    }

    .terms-card {
      padding: 10px 11px;
      border:
        1px solid
        var(--border);
      border-radius: 11px;
      background: var(--surface);
    }

    .terms-card h3 {
      margin: 0 0 6px;
      color: var(--ink);
      font-size: 9px;
    }

    .terms-card p {
      margin: 4px 0;
      font-size: 8.2px;
      line-height: 1.4;
    }

    .totals {
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 10px;
      background: white;
    }

    .total-row {
      display: flex;
      justify-content:
        space-between;
      gap: 10px;
      padding: 6px 8px;
      border-bottom:
        1px solid
        #e9eef5;
      font-size: 8.2px;
    }

    .total-row:last-child {
      border-bottom: 0;
    }

    .total-row.grand {
      padding: 10px 9px;
      background: var(--primary);
      color: white;
      font-size: 12px;
      font-weight: 950;
    }

    .signature {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 48px;
      margin-top: 18px;
    }

    .signature-space {
      position: relative;
      height: 50px;
    }

    .stamp {
      position: absolute;
      left: 50%;
      bottom: 0;
      max-width: 140px;
      max-height: 48px;
      object-fit: contain;
      transform:
        translateX(-50%);
    }

    .signature-line {
      border-top:
        1px solid
        #94a3b8;
      padding-top: 5px;
      text-align: center;
      font-size: 8px;
    }

    footer {
      display: flex;
      justify-content:
        space-between;
      gap: 16px;
      margin-top: auto;
      padding-top: 7px;
      border-top:
        1px solid
        var(--border);
      color: #94a3b8;
      font-size: 7px;
    }

    .continuation {
      margin-bottom: 10px;
      color: var(--muted);
      font-size: 8px;
    }

    @media print {
      @page {
        size: A4;
        margin: 0;
      }

      html,
      body {
        background: white;
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

function companyBlock(
  settings:
    OfferPdfSettings,
) {
  const logo =
    settings.logoDataUrl
      ? `
        <img
          class="logo"
          src="${escapeHtml(
            settings.logoDataUrl,
          )}"
          alt="Logo"
        />
      `
      : `
        <div class="logo-fallback">
          ${escapeHtml(
            settings.companyName
              .slice(0, 2)
              .toUpperCase(),
          )}
        </div>
      `

  const companyLines = [
    settings.companyAddress,
    settings.companyOib
      ? `OIB: ${settings.companyOib}`
      : '',
    settings.companyIban
      ? `IBAN: ${settings.companyIban}`
      : '',
    [
      settings.companyPhone,
      settings.companyEmail,
    ]
      .filter(Boolean)
      .join(' • '),
    settings.companyWebsite,
  ]
    .filter(Boolean)
    .map(
      (line) =>
        `<div>${escapeHtml(
          line,
        )}</div>`,
    )
    .join('')

  return `
    <div class="company">
      ${logo}

      <div>
        <h1>
          ${escapeHtml(
            settings.companyName,
          )}
        </h1>

        ${
          settings.companySubtitle
            ? `
              <div class="subtitle">
                ${escapeHtml(
                  settings.companySubtitle,
                )}
              </div>
            `
            : ''
        }

        <div class="seller-lines">
          ${companyLines}
        </div>
      </div>
    </div>
  `
}

function customerLines(
  offer: OfferPdfData,
) {
  return [
    offer.oib
      ? `
        <div>
          <strong>OIB:</strong>
          ${escapeHtml(
            offer.oib,
          )}
        </div>
      `
      : '',
    [
      offer.address,
      offer.city,
    ]
      .filter(Boolean)
      .join(', ')
      ? `
        <div>
          ${escapeHtml(
            [
              offer.address,
              offer.city,
            ]
              .filter(Boolean)
              .join(', '),
          )}
        </div>
      `
      : '',
    offer.email
      ? `
        <div>
          ${escapeHtml(
            offer.email,
          )}
        </div>
      `
      : '',
    offer.phone
      ? `
        <div>
          ${escapeHtml(
            offer.phone,
          )}
        </div>
      `
      : '',
  ]
    .filter(Boolean)
    .join('')
}

function itemRows(
  items: OfferPdfItem[],
  startIndex: number,
  showImages: boolean,
) {
  if (!items.length) {
    return `
      <tr>
        <td
          colspan="8"
          class="center"
        >
          Nema unesenih stavki.
        </td>
      </tr>
    `
  }

  return items
    .map(
      (
        item,
        index,
      ) => `
        <tr>
          <td class="center">
            ${startIndex + index + 1}
          </td>

          <td>
            <div class="item-wrap">
              ${
                showImages &&
                item.imageDataUrl
                  ? `
                    <img
                      class="item-image"
                      src="${escapeHtml(
                        item.imageDataUrl,
                      )}"
                      alt="${escapeHtml(
                        item.imageName ||
                        item.name,
                      )}"
                    />
                  `
                  : ''
              }

              <div>
                <strong>
                  ${escapeHtml(
                    item.name,
                  )}
                </strong>

                ${
                  item.description
                    ? `
                      <p>
                        ${multilineHtml(
                          item.description,
                        )}
                      </p>
                    `
                    : ''
                }
              </div>
            </div>
          </td>

          <td class="right">
            ${formatNumber(
              item.quantity,
            )}
          </td>

          <td class="center">
            ${escapeHtml(
              item.unit,
            )}
          </td>

          <td class="right">
            ${formatCurrency(
              item.price,
            )}
          </td>

          <td class="right">
            ${formatNumber(
              item.discount,
            )}%
          </td>

          <td class="right">
            ${formatNumber(
              item.vat,
            )}%
          </td>

          <td class="right strong">
            ${formatCurrency(
              itemTotal(item),
            )}
          </td>
        </tr>
      `,
    )
    .join('')
}

export function buildOfferPdfHtml(
  offer: OfferPdfData,
  customSettings:
    Partial<OfferPdfSettings> = {},
) {
  const settings = {
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
        item.quantity *
          item.price,
      0,
    )

  const net =
    items.reduce(
      (sum, item) =>
        sum + itemNet(item),
      0,
    )

  const vat =
    items.reduce(
      (sum, item) =>
        sum + itemVat(item),
      0,
    )

  const discount =
    base - net

  const total =
    net + vat

  const pages =
    paginateItems(
      items,
      settings.showItemImages,
    )

  let rowIndex = 0

  const pageHtml =
    pages
      .map(
        (
          pageItems,
          pageIndex,
        ) => {
          const first =
            pageIndex === 0

          const final =
            pageIndex ===
            pages.length - 1

          const startIndex =
            rowIndex

          rowIndex +=
            pageItems.length

          const stamp =
            settings.showStamp &&
            settings.stampDataUrl
              ? `
                <img
                  class="stamp"
                  src="${escapeHtml(
                    settings.stampDataUrl,
                  )}"
                  alt="Pečat"
                />
              `
              : ''

          return `
            <section class="page">
              <header class="header">
                ${companyBlock(
                  settings,
                )}

                <div class="heading">
                  <div class="kicker">
                    ${
                      first
                        ? 'Ponuda za izvođenje radova / usluga'
                        : 'Nastavak ponude'
                    }
                  </div>

                  <h2>PONUDA</h2>

                  <div class="number">
                    ${escapeHtml(
                      offer.offerNumber,
                    )}
                  </div>
                </div>
              </header>

              ${
                first
                  ? `
                    <section class="summary">
                      <div>
                        <span>Datum</span>
                        <strong>
                          ${formatDate(
                            offer.date,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Vrijedi do</span>
                        <strong>
                          ${formatDate(
                            offer.validUntil,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Odgovorna osoba</span>
                        <strong>
                          ${escapeHtml(
                            offer.responsiblePerson ||
                            '—',
                          )}
                        </strong>
                      </div>

                      <div class="total">
                        <span>Vrijednost ponude</span>
                        <strong>
                          ${formatCurrency(
                            total,
                          )}
                        </strong>
                      </div>
                    </section>

                    <section class="party-grid">
                      <article class="card">
                        <h3>
                          Za naručitelja
                        </h3>

                        <div class="party-name">
                          ${escapeHtml(
                            offer.customerName,
                          )}
                        </div>

                        <div class="party-details">
                          ${customerLines(
                            offer,
                          )}
                        </div>
                      </article>

                      <article class="card">
                        <h3>
                          Podaci ponude
                        </h3>

                        <div class="party-details">
                          <div>
                            <strong>Status:</strong>
                            ${escapeHtml(
                              offer.status,
                            )}
                          </div>

                          <div>
                            <strong>Verzija:</strong>
                            ${offer.version || 1}
                          </div>

                          <div>
                            <strong>Broj stavki:</strong>
                            ${items.length}
                          </div>
                        </div>
                      </article>
                    </section>

                    ${
                      offer.description
                        ? `
                          <section class="description">
                            ${multilineHtml(
                              offer.description,
                            )}
                          </section>
                        `
                        : ''
                    }
                  `
                  : `
                    <div class="continuation">
                      Nastavak stavki ponude
                    </div>
                  `
              }

              <div class="section-title">
                Stavke ponude
              </div>

              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th class="center">
                        #
                      </th>
                      <th>
                        Opis
                      </th>
                      <th class="right">
                        Kol.
                      </th>
                      <th class="center">
                        JM
                      </th>
                      <th class="right">
                        Cijena
                      </th>
                      <th class="right">
                        Popust
                      </th>
                      <th class="right">
                        PDV
                      </th>
                      <th class="right">
                        Ukupno
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    ${itemRows(
                      pageItems,
                      startIndex,
                      settings.showItemImages,
                    )}
                  </tbody>
                </table>
              </div>

              ${
                final
                  ? `
                    <section class="bottom">
                      <article class="terms-card">
                        <h3>
                          Uvjeti i napomene
                        </h3>

                        <p>
                          ${multilineHtml(
                            offer.paymentTerms ||
                            'Plaćanje prema dogovoru.',
                          )}
                        </p>

                        <p>
                          Ponuda vrijedi do
                          <strong>
                            ${formatDate(
                              offer.validUntil,
                            )}
                          </strong>.
                        </p>

                        ${
                          offer.internalNote
                            ? `
                              <p>
                                ${multilineHtml(
                                  offer.internalNote,
                                )}
                              </p>
                            `
                            : ''
                        }
                      </article>

                      <div class="totals">
                        <div class="total-row">
                          <span>Vrijednost</span>
                          <strong>
                            ${formatCurrency(
                              base,
                            )}
                          </strong>
                        </div>

                        ${
                          discount > 0
                            ? `
                              <div class="total-row">
                                <span>Popust</span>
                                <strong>
                                  −
                                  ${formatCurrency(
                                    discount,
                                  )}
                                </strong>
                              </div>
                            `
                            : ''
                        }

                        <div class="total-row">
                          <span>Osnovica</span>
                          <strong>
                            ${formatCurrency(
                              net,
                            )}
                          </strong>
                        </div>

                        <div class="total-row">
                          <span>PDV</span>
                          <strong>
                            ${formatCurrency(
                              vat,
                            )}
                          </strong>
                        </div>

                        <div class="total-row grand">
                          <span>UKUPNO</span>
                          <span>
                            ${formatCurrency(
                              total,
                            )}
                          </span>
                        </div>
                      </div>
                    </section>

                    ${
                      settings.showSignature
                        ? `
                          <section class="signature">
                            <div>
                              <div class="signature-space">
                                ${stamp}
                              </div>

                              <div class="signature-line">
                                <span>
                                  Ponudu pripremio
                                </span>
                                <br>
                                <strong>
                                  ${escapeHtml(
                                    offer.responsiblePerson ||
                                    settings.companyName,
                                  )}
                                </strong>
                              </div>
                            </div>

                            <div>
                              <div class="signature-space"></div>

                              <div class="signature-line">
                                <span>
                                  Prihvaćam ponudu
                                </span>
                                <br>
                                <strong>
                                  Investitor / naručitelj
                                </strong>
                              </div>
                            </div>
                          </section>
                        `
                        : ''
                    }
                  `
                  : ''
              }

              ${
                settings.showFooter
                  ? `
                    <footer>
                      <span>
                        ${escapeHtml(
                          settings.footerText,
                        )}
                      </span>

                      <span>
                        ${escapeHtml(
                          offer.offerNumber,
                        )}
                        ·
                        ${pageIndex + 1}/${pages.length}
                      </span>
                    </footer>
                  `
                  : ''
              }
            </section>
          `
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
    ${escapeHtml(
      offer.offerNumber,
    )}
  </title>

  <style>
    ${documentCss(
      settings.primaryColor,
    )}
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
    ${pageHtml}
  </main>

  <script>
    document.title =
      ${JSON.stringify(
        `${safeFileName(
          offer.offerNumber ||
          'Ponuda',
        )}-${safeFileName(
          offer.customerName ||
          'Investitor',
        )}`,
      )};
  </script>
</body>
</html>`
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
      const company =
        await getCompanySettings()

      const html =
        buildOfferPdfHtml(
          offer,
          {
            ...companySettingsFromCurrent(
              company,
            ),
            ...customSettings,
          },
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
