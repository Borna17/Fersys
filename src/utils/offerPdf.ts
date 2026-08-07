import {
  getCompanySettings,
} from '../services/companySettings.service'


function compactDensityClass(
  itemCount: number,
) {
  if (itemCount >= 11) {
    return 'density-tight'
  }

  if (itemCount >= 7) {
    return 'density-compact'
  }

  return 'density-normal'
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
      --soft: color-mix(in srgb, var(--primary) 8%, white);
    }

    * {
      box-sizing: border-box;
      letter-spacing: normal;
      word-spacing: normal;
    }

    html, body {
      margin: 0;
      background: #dfe5ec;
      color: var(--text);
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
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
      background: rgba(15, 23, 42, .97);
    }

    .toolbar button {
      border: 0;
      border-radius: 10px;
      padding: 10px 16px;
      font-weight: 800;
      cursor: pointer;
    }

    .toolbar .primary { background: var(--primary); color: white; }
    .toolbar .secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #475569; }

    .page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      margin: 14px auto;
      padding: 9mm 11mm 10mm;
      background: white;
      box-shadow: 0 18px 55px rgba(15, 23, 42, .18);
    }

    .page::before {
      position: absolute;
      inset: 0 0 auto;
      height: 2.2mm;
      content: "";
      background: var(--primary);
    }

    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 18px;
      align-items: start;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--border);
    }

    .company {
      display: flex;
      gap: 11px;
      min-width: 0;
    }

    .logo, .logo-fallback {
      width: 54px;
      height: 54px;
      flex: 0 0 54px;
      object-fit: contain;
    }

    .logo-fallback {
      display: grid;
      place-items: center;
      border-radius: 12px;
      background: var(--primary);
      color: #fff;
      font-size: 18px;
      font-weight: 900;
    }

    .company h1 {
      margin: 0;
      color: var(--ink);
      font-size: 18px;
      line-height: 1.15;
      font-weight: 900;
    }

    .subtitle {
      margin-top: 3px;
      color: var(--muted);
      font-size: 8px;
      line-height: 1.25;
    }

    .seller-lines {
      margin-top: 5px;
      color: #475569;
      font-size: 7.5px;
      line-height: 1.35;
    }

    .heading {
      min-width: 150px;
      text-align: right;
    }

    .kicker {
      color: var(--primary);
      font-size: 7.5px;
      font-weight: 900;
      letter-spacing: .14em;
      text-transform: uppercase;
    }

    .heading h2 {
      margin: 3px 0 0;
      color: var(--ink);
      font-size: 24px;
      line-height: 1;
      font-weight: 950;
    }

    .number {
      display: inline-flex;
      margin-top: 6px;
      border-radius: 999px;
      padding: 4px 8px;
      background: var(--soft);
      color: var(--primary);
      font-size: 9px;
      font-weight: 900;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      margin-top: 10px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--border);
    }

    .summary > div {
      padding: 6px 8px;
      background: var(--surface);
    }

    .summary span {
      display: block;
      color: var(--muted);
      font-size: 6.8px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .summary strong {
      display: block;
      margin-top: 2px;
      color: var(--ink);
      font-size: 8.7px;
    }

    .summary .total strong {
      color: var(--primary);
      font-size: 10px;
    }

    .party-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
      margin-top: 10px;
    }

    .card {
      padding: 9px 10px;
      border: 1px solid var(--border);
      border-radius: 9px;
      break-inside: avoid;
    }

    .card h3 {
      margin: 0 0 6px;
      color: var(--muted);
      font-size: 7px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .party-name {
      color: var(--ink);
      font-size: 11px;
      font-weight: 900;
    }

    .party-details {
      margin-top: 5px;
      font-size: 7.7px;
      line-height: 1.45;
    }

    .description {
      margin-top: 8px;
      padding: 7px 9px;
      border-left: 3px solid var(--primary);
      border-radius: 0 8px 8px 0;
      background: color-mix(in srgb, var(--primary) 4%, white);
      font-size: 8px;
      line-height: 1.4;
      break-inside: avoid;
    }

    .section-title {
      margin: 11px 0 5px;
      color: var(--ink);
      font-size: 9px;
      font-weight: 900;
    }

    .table-wrap {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 7.5px;
    }

    thead { display: table-header-group; }

    th {
      padding: 5px 4px;
      background: var(--ink);
      color: white;
      font-size: 6.4px;
      text-align: left;
      text-transform: uppercase;
    }

    th:nth-child(1) { width: 5%; }
    th:nth-child(2) { width: 35%; }
    th:nth-child(3) { width: 7%; }
    th:nth-child(4) { width: 7%; }
    th:nth-child(5) { width: 13%; }
    th:nth-child(6) { width: 9%; }
    th:nth-child(7) { width: 8%; }
    th:nth-child(8) { width: 16%; }

    td {
      padding: 5px 4px;
      border-bottom: 1px solid #e9eef5;
      vertical-align: top;
    }

    tbody tr:nth-child(even) td { background: #fbfdff; }
    tbody tr:last-child td { border-bottom: 0; }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    td strong {
      color: var(--ink);
      font-size: 7.6px;
    }

    td p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 6.5px;
      line-height: 1.25;
    }

    .right { text-align: right; white-space: nowrap; }
    .center { text-align: center; }
    .strong { font-weight: 900; color: var(--ink); }

    .bottom {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px;
      gap: 10px;
      align-items: start;
      margin-top: 9px;
      break-inside: avoid;
    }

    .payment-card, .terms-card {
      padding: 8px 9px;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: var(--surface);
    }

    .payment-card h3, .terms-card h3 {
      margin: 0 0 5px;
      color: var(--ink);
      font-size: 8px;
    }

    .payment-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 3px 0;
      border-bottom: 1px dashed var(--border);
      font-size: 7.2px;
    }

    .payment-row:last-child { border-bottom: 0; }

    .terms-card p {
      margin: 3px 0;
      font-size: 7.3px;
      line-height: 1.35;
    }

    .totals {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 9px;
      background: #fff;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 4px 7px;
      border-bottom: 1px solid #e9eef5;
      font-size: 7.3px;
    }

    .total-row:last-child { border-bottom: 0; }

    .total-row.grand {
      padding: 7px;
      background: var(--soft);
      color: var(--primary);
      font-size: 10px;
      font-weight: 900;
    }

    .signature {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 36px;
      margin-top: 13px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .signature-space {
      position: relative;
      height: 42px;
    }

    .stamp {
      position: absolute;
      left: 50%;
      bottom: 0;
      max-width: 130px;
      max-height: 42px;
      object-fit: contain;
      transform: translateX(-50%);
    }

    .signature-line {
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      text-align: center;
      font-size: 7px;
    }

    footer {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1px solid var(--border);
      color: #94a3b8;
      font-size: 6.5px;
    }

    .density-compact td { padding-top: 3.6px; padding-bottom: 3.6px; }
    .density-compact .description { padding-top: 5px; padding-bottom: 5px; }
    .density-compact .party-grid { margin-top: 7px; }
    .density-compact .section-title { margin-top: 8px; }

    .density-tight .header { padding-bottom: 7px; }
    .density-tight .logo, .density-tight .logo-fallback {
      width: 46px;
      height: 46px;
      flex-basis: 46px;
    }
    .density-tight .company h1 { font-size: 16px; }
    .density-tight .summary { margin-top: 7px; }
    .density-tight .summary > div { padding: 4px 6px; }
    .density-tight .party-grid { margin-top: 7px; gap: 7px; }
    .density-tight .card { padding: 6px 8px; }
    .density-tight .description { margin-top: 6px; padding: 5px 7px; }
    .density-tight .section-title { margin-top: 7px; }
    .density-tight td { padding-top: 3px; padding-bottom: 3px; font-size: 6.9px; }
    .density-tight th { padding-top: 4px; padding-bottom: 4px; }
    .density-tight .bottom { margin-top: 7px; }
    .density-tight .signature { margin-top: 8px; }
    .density-tight .signature-space { height: 34px; }

    @media print {
      @page { size: A4; margin: 0; }

      html, body { background: #fff; }

      .toolbar { display: none !important; }

      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        box-shadow: none;
      }
    }

    @media screen and (max-width: 900px) {
      .page {
        width: calc(100% - 16px);
        min-height: auto;
        margin: 8px;
        padding: 20px;
      }

      .header,
      .party-grid,
      .bottom {
        grid-template-columns: 1fr;
      }

      .heading { text-align: left; }

      .summary {
        grid-template-columns: 1fr 1fr;
      }

      .table-wrap { overflow-x: auto; }
      table { min-width: 780px; }
    }
  `
}


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
  showItemImages: false,
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
    },
  ).format(value)
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
      settings.primaryColor,
    footerText:
      settings.documentFooter,
    showStamp:
      Boolean(
        settings.stampUrl,
      ),
    showSignature:
      true,
    showFooter:
      true,
    showItemImages:
      false,
  }
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

  const densityClass =
    compactDensityClass(
      items.length,
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

  const logo =
    settings.logoDataUrl
      ? `<img class="logo" src="${escapeHtml(
          settings.logoDataUrl,
        )}" alt="Logo" />`
      : `<div class="logo-fallback">${escapeHtml(
          settings.companyName
            .slice(0, 2)
            .toUpperCase(),
        )}</div>`

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

  const customerLines = [
    offer.oib
      ? `<div><strong>OIB:</strong> ${escapeHtml(
          offer.oib,
        )}</div>`
      : '',
    [offer.address, offer.city]
      .filter(Boolean)
      .join(', ')
      ? `<div>${escapeHtml(
          [
            offer.address,
            offer.city,
          ]
            .filter(Boolean)
            .join(', '),
        )}</div>`
      : '',
    offer.email
      ? `<div>${escapeHtml(
          offer.email,
        )}</div>`
      : '',
    offer.phone
      ? `<div>${escapeHtml(
          offer.phone,
        )}</div>`
      : '',
  ]
    .filter(Boolean)
    .join('')

  const rows =
    items.length
      ? items
          .map(
            (item, index) => {
              const lineTotal =
                itemNet(item) +
                itemVat(item)

              return `
                <tr>
                  <td class="center">${index + 1}</td>
                  <td>
                    <strong>${escapeHtml(item.name)}</strong>
                    ${
                      item.description
                        ? `<p>${multilineHtml(
                            item.description,
                          )}</p>`
                        : ''
                    }
                  </td>
                  <td class="right">${formatNumber(item.quantity)}</td>
                  <td class="center">${escapeHtml(item.unit)}</td>
                  <td class="right">${formatCurrency(item.price)}</td>
                  <td class="right">${formatNumber(item.discount)}%</td>
                  <td class="right">${formatNumber(item.vat)}%</td>
                  <td class="right strong">${formatCurrency(lineTotal)}</td>
                </tr>
              `
            },
          )
          .join('')
      : `<tr><td colspan="8" class="center">Nema unesenih stavki.</td></tr>`

  const stamp =
    settings.showStamp &&
    settings.stampDataUrl
      ? `<img class="stamp" src="${escapeHtml(
          settings.stampDataUrl,
        )}" alt="Pečat" />`
      : ''

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(
    offer.offerNumber,
  )}</title>
  <style>${documentCss(
    settings.primaryColor,
  )}</style>
</head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Ispis / spremi kao PDF</button>
    <button class="secondary" onclick="window.close()">Zatvori</button>
  </div>

  <main class="page ${densityClass}">
    <header class="header">
      <div class="company">
        ${logo}
        <div>
          <h1>${escapeHtml(settings.companyName)}</h1>
          ${
            settings.companySubtitle
              ? `<div class="subtitle">${escapeHtml(
                  settings.companySubtitle,
                )}</div>`
              : ''
          }
          <div class="seller-lines">${companyLines}</div>
        </div>
      </div>

      <div class="heading">
        <div class="kicker">Komercijalni dokument</div>
        <h2>PONUDA</h2>
        <div class="number">${escapeHtml(
          offer.offerNumber,
        )}</div>
      </div>
    </header>

    <section class="summary">
      <div>
        <span>Datum</span>
        <strong>${formatDate(offer.date)}</strong>
      </div>
      <div>
        <span>Vrijedi do</span>
        <strong>${formatDate(offer.validUntil)}</strong>
      </div>
      <div>
        <span>Odgovorna osoba</span>
        <strong>${escapeHtml(
          offer.responsiblePerson || '—',
        )}</strong>
      </div>
      <div class="total">
        <span>Ukupno</span>
        <strong>${formatCurrency(total)}</strong>
      </div>
    </section>

    <section class="party-grid">
      <article class="card">
        <h3>Kupac / naručitelj</h3>
        <div class="party-name">${escapeHtml(
          offer.customerName,
        )}</div>
        <div class="party-details">${customerLines}</div>
      </article>

      <article class="card">
        <h3>Podaci ponude</h3>
        <div class="payment-row">
          <span>Status</span>
          <strong>${escapeHtml(offer.status)}</strong>
        </div>
        <div class="payment-row">
          <span>Verzija</span>
          <strong>${offer.version || 1}</strong>
        </div>
        <div class="payment-row">
          <span>Broj stavki</span>
          <strong>${items.length}</strong>
        </div>
      </article>
    </section>

    ${
      offer.description
        ? `<section class="description">${multilineHtml(
            offer.description,
          )}</section>`
        : ''
    }

    <div class="section-title">Stavke ponude</div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="center">R.br.</th>
            <th>Opis</th>
            <th class="right">Kol.</th>
            <th class="center">JM</th>
            <th class="right">Cijena</th>
            <th class="right">Popust</th>
            <th class="right">PDV</th>
            <th class="right">Ukupno</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <section class="bottom">
      <article class="terms-card">
        <h3>Uvjeti i napomene</h3>
        <p>${multilineHtml(
          offer.paymentTerms ||
            'Plaćanje prema dogovoru.',
        )}</p>
        <p>Ponuda vrijedi do ${formatDate(
          offer.validUntil,
        )}.</p>
      </article>

      <div class="totals">
        <div class="total-row">
          <span>Vrijednost</span>
          <strong>${formatCurrency(base)}</strong>
        </div>
        ${
          discount > 0
            ? `<div class="total-row"><span>Popust</span><strong>− ${formatCurrency(
                discount,
              )}</strong></div>`
            : ''
        }
        <div class="total-row">
          <span>Osnovica</span>
          <strong>${formatCurrency(net)}</strong>
        </div>
        <div class="total-row">
          <span>PDV</span>
          <strong>${formatCurrency(vat)}</strong>
        </div>
        <div class="total-row grand">
          <span>UKUPNO</span>
          <span>${formatCurrency(total)}</span>
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
                <span>Za izvođača</span><br />
                <strong>${escapeHtml(
                  offer.responsiblePerson ||
                    settings.companyName,
                )}</strong>
              </div>
            </div>

            <div>
              <div class="signature-space"></div>
              <div class="signature-line">
                <span>Kupac / naručitelj</span><br />
                <strong>Potpis</strong>
              </div>
            </div>
          </section>
        `
        : ''
    }

    ${
      settings.showFooter
        ? `<footer><span>${escapeHtml(
            settings.footerText,
          )}</span><span>${escapeHtml(
            offer.offerNumber,
          )}</span></footer>`
        : ''
    }
  </main>

  <script>
    document.title = ${JSON.stringify(
      `${safeFileName(
        offer.offerNumber ||
          'Ponuda',
      )}-${safeFileName(
        offer.customerName ||
          'Kupac',
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
    window.open('', '_blank')

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
