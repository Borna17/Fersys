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
  customerType: 'Fizička osoba' | 'Tvrtka' | 'Zgrada'
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
  primaryColor: string
  showItemImages: boolean
  showSignature: boolean
  showStamp: boolean
  showFooter: boolean
  footerText: string
}

const DEFAULT_SETTINGS: OfferPdfSettings = {
  companyName: 'Instalacije Ferfolja',
  companySubtitle:
    'Grijanje · hlađenje · voda · plin · servis i održavanje',
  companyAddress: 'Slavonski Brod',
  companyOib: '',
  companyIban: '',
  companyEmail: '',
  companyPhone: '',
  companyWebsite: '',
  logoDataUrl: 'https://i.imgur.com/r61NT2v.png',
  stampDataUrl: 'https://i.imgur.com/EAdTwng.png',
  primaryColor: '#6d5dfc',
  showItemImages: true,
  showSignature: true,
  showStamp: true,
  showFooter: true,
  footerText:
    'Hvala na ukazanom povjerenju. Ponuda je izrađena u sustavu FERSYS.',
}

function calculateItemBase(item: OfferPdfItem) {
  return item.quantity * item.price
}

function calculateItemDiscount(item: OfferPdfItem) {
  return calculateItemBase(item) * (item.discount / 100)
}

function calculateItemNet(item: OfferPdfItem) {
  return calculateItemBase(item) - calculateItemDiscount(item)
}

function calculateItemVat(item: OfferPdfItem) {
  return calculateItemNet(item) * (item.vat / 100)
}

function calculateOfferBase(offer: OfferPdfData) {
  return offer.items.reduce(
    (total, item) => total + calculateItemBase(item),
    0,
  )
}

function calculateOfferDiscount(offer: OfferPdfData) {
  return offer.items.reduce(
    (total, item) => total + calculateItemDiscount(item),
    0,
  )
}

function calculateOfferNet(offer: OfferPdfData) {
  return offer.items.reduce(
    (total, item) => total + calculateItemNet(item),
    0,
  )
}

function calculateOfferVat(offer: OfferPdfData) {
  return offer.items.reduce(
    (total, item) => total + calculateItemVat(item),
    0,
  )
}

function calculateOfferTotal(offer: OfferPdfData) {
  return calculateOfferNet(offer) + calculateOfferVat(offer)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function formatDate(date: string) {
  if (!date) {
    return '—'
  }

  return new Date(`${date}T12:00:00`).toLocaleDateString('hr-HR')
}

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function multilineHtml(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, '<br />')
}

function getSafeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function getCompanyContactLines(settings: OfferPdfSettings) {
  return [
    settings.companyAddress,
    settings.companyOib ? `OIB: ${settings.companyOib}` : '',
    settings.companyIban ? `IBAN: ${settings.companyIban}` : '',
    settings.companyEmail,
    settings.companyPhone,
    settings.companyWebsite,
  ].filter(Boolean)
}

function getValidityText(validUntil: string) {
  if (!validUntil) {
    return 'Rok valjanosti nije naveden.'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const targetDate = new Date(`${validUntil}T00:00:00`)
  const difference = Math.ceil(
    (targetDate.getTime() - today.getTime()) /
      (1000 * 60 * 60 * 24),
  )

  if (difference < 0) {
    return `Ponuda je istekla ${formatDate(validUntil)}.`
  }

  if (difference === 0) {
    return `Ponuda vrijedi do danas, ${formatDate(validUntil)}.`
  }

  return `Ponuda vrijedi do ${formatDate(
    validUntil,
  )} (${difference} dana).`
}

export function buildOfferPdfHtml(
  offer: OfferPdfData,
  customSettings: Partial<OfferPdfSettings> = {},
) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...customSettings,
  }

  const base = calculateOfferBase(offer)
  const discount = calculateOfferDiscount(offer)
  const net = calculateOfferNet(offer)
  const vat = calculateOfferVat(offer)
  const total = calculateOfferTotal(offer)

  const cleanItems = offer.items.filter((item) => item.name.trim())

  const itemRows = cleanItems
    .map((item, index) => {
      const itemNet = calculateItemNet(item)
      const itemVat = calculateItemVat(item)
      const itemTotal = itemNet + itemVat

      const imageHtml =
        settings.showItemImages && item.imageDataUrl
          ? `
            <div class="item-image-wrap">
              <img
                class="item-image"
                src="${escapeHtml(item.imageDataUrl)}"
                alt="${escapeHtml(item.name)}"
              />
            </div>
          `
          : ''

      return `
        <tr>
          <td class="center muted-cell">${index + 1}</td>

          <td>
            <div class="item-content">
              ${imageHtml}

              <div class="item-copy">
                <strong>${escapeHtml(item.name)}</strong>

                ${
                  item.description
                    ? `<p>${multilineHtml(item.description)}</p>`
                    : ''
                }
              </div>
            </div>
          </td>

          <td class="right">${formatNumber(item.quantity)}</td>
          <td class="center">${escapeHtml(item.unit)}</td>
          <td class="right">${formatCurrency(item.price)}</td>
          <td class="right">${formatNumber(item.discount)}%</td>
          <td class="right">${formatNumber(item.vat)}%</td>
          <td class="right strong">${formatCurrency(itemTotal)}</td>
        </tr>
      `
    })
    .join('')

  const emptyItemsHtml =
    cleanItems.length === 0
      ? `
        <tr>
          <td colspan="8" class="empty-row">
            Nema unesenih stavki.
          </td>
        </tr>
      `
      : ''

  const customerAddress = [offer.address, offer.city]
    .filter(Boolean)
    .join(', ')

  const companyContactHtml = getCompanyContactLines(settings)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('')

  const logoHtml = settings.logoDataUrl
    ? `
      <img
        class="company-logo"
        src="${escapeHtml(settings.logoDataUrl)}"
        alt="${escapeHtml(settings.companyName)}"
      />
    `
    : `
      <div class="company-logo-placeholder">
        ${escapeHtml(settings.companyName.slice(0, 2).toUpperCase())}
      </div>
    `

  const stampHtml =
    settings.showStamp && settings.stampDataUrl
      ? `
        <img
          class="stamp"
          src="${escapeHtml(settings.stampDataUrl)}"
          alt="Pečat"
        />
      `
      : ''

  const signatureHtml = settings.showSignature
    ? `
      <section class="signature-section">
        <div class="signature-card">
          <div class="signature-space">
            ${stampHtml}
          </div>

          <div class="signature-line">
            <span>Za izvođača</span>
            <strong>${escapeHtml(
              offer.responsiblePerson || settings.companyName,
            )}</strong>
          </div>
        </div>

        <div class="signature-card">
          <div class="signature-space"></div>

          <div class="signature-line">
            <span>Kupac / naručitelj</span>
            <strong>Potpis i potvrda ponude</strong>
          </div>
        </div>
      </section>
    `
    : ''

  const footerHtml = settings.showFooter
    ? `
      <footer class="document-footer">
        <span>${escapeHtml(settings.footerText)}</span>
        <span>${escapeHtml(offer.offerNumber)}</span>
      </footer>
    `
    : ''

  const customerContactRows = [
    offer.oib
      ? `<div><span>OIB</span><strong>${escapeHtml(offer.oib)}</strong></div>`
      : '',
    customerAddress
      ? `<div><span>Adresa</span><strong>${escapeHtml(
          customerAddress,
        )}</strong></div>`
      : '',
    offer.email
      ? `<div><span>E-mail</span><strong>${escapeHtml(
          offer.email,
        )}</strong></div>`
      : '',
    offer.phone
      ? `<div><span>Telefon</span><strong>${escapeHtml(
          offer.phone,
        )}</strong></div>`
      : '',
  ]
    .filter(Boolean)
    .join('')

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />

  <title>${escapeHtml(offer.offerNumber)} - ${escapeHtml(
    offer.customerName,
  )}</title>

  <style>
    :root {
      --primary: ${escapeHtml(settings.primaryColor)};
      --primary-soft: color-mix(in srgb, var(--primary) 9%, white);
      --primary-faint: color-mix(in srgb, var(--primary) 4%, white);
      --ink: #0f172a;
      --text: #1e293b;
      --muted: #64748b;
      --border: #dbe3ee;
      --border-soft: #e9eef5;
      --surface: #f8fafc;
      --white: #ffffff;
    }

    * {
      box-sizing: border-box;
    }

    html {
      background: #dfe5ec;
    }

    body {
      margin: 0;
      font-family:
        Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont,
        "Segoe UI", Arial, sans-serif;
      color: var(--text);
      background: #dfe5ec;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .toolbar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 10px;
      padding: 13px;
      background: rgba(15, 23, 42, 0.97);
      box-shadow: 0 12px 35px rgba(15, 23, 42, 0.25);
      backdrop-filter: blur(12px);
    }

    .toolbar button {
      appearance: none;
      border: 1px solid transparent;
      border-radius: 11px;
      padding: 11px 17px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      transition:
        transform 0.15s ease,
        opacity 0.15s ease;
    }

    .toolbar button:hover {
      transform: translateY(-1px);
    }

    .toolbar .primary {
      background: var(--primary);
      color: #fff;
    }

    .toolbar .secondary {
      border-color: #475569;
      background: #1e293b;
      color: #e2e8f0;
    }

    .page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      margin: 18px auto;
      padding: 13mm 14mm 12mm;
      overflow: hidden;
      background: var(--white);
      box-shadow: 0 22px 65px rgba(15, 23, 42, 0.2);
    }

    .page::before {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 5px;
      content: "";
      background: linear-gradient(
        90deg,
        var(--primary),
        color-mix(in srgb, var(--primary) 55%, #22d3ee)
      );
    }

    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: start;
      gap: 28px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--border);
    }

    .company {
      display: flex;
      min-width: 0;
      align-items: flex-start;
      gap: 15px;
    }

    .company-logo {
      width: 78px;
      height: 78px;
      flex: 0 0 78px;
      object-fit: contain;
    }

    .company-logo-placeholder {
      display: flex;
      width: 70px;
      height: 70px;
      flex: 0 0 70px;
      align-items: center;
      justify-content: center;
      border-radius: 16px;
      background: var(--primary);
      color: #fff;
      font-size: 23px;
      font-weight: 900;
      box-shadow: 0 10px 25px
        color-mix(in srgb, var(--primary) 22%, transparent);
    }

    .company-copy {
      min-width: 0;
    }

    .company h1 {
      margin: 1px 0 0;
      color: var(--ink);
      font-size: 25px;
      font-weight: 900;
      letter-spacing: -0.55px;
    }

    .company-subtitle {
      max-width: 380px;
      margin-top: 5px;
      color: var(--muted);
      font-size: 10.5px;
      font-weight: 600;
      line-height: 1.5;
    }

    .company-contact {
      display: flex;
      flex-wrap: wrap;
      gap: 3px 12px;
      max-width: 420px;
      margin-top: 8px;
      color: #475569;
      font-size: 9.5px;
      line-height: 1.45;
    }

    .document-heading {
      min-width: 190px;
      text-align: right;
    }

    .document-kicker {
      color: var(--primary);
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.18em;
    }

    .document-heading h2 {
      margin: 4px 0 0;
      color: var(--ink);
      font-size: 34px;
      font-weight: 950;
      letter-spacing: -1.2px;
    }

    .offer-number {
      display: inline-flex;
      margin-top: 8px;
      border: 1px solid
        color-mix(in srgb, var(--primary) 22%, var(--border));
      border-radius: 999px;
      padding: 6px 11px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 12px;
      font-weight: 900;
    }

    .summary-strip {
      display: grid;
      grid-template-columns: 1.05fr 1fr 1fr 1fr;
      gap: 1px;
      margin-top: 16px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--border);
    }

    .summary-item {
      min-width: 0;
      padding: 10px 12px;
      background: var(--surface);
    }

    .summary-item span {
      display: block;
      color: var(--muted);
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .summary-item strong {
      display: block;
      margin-top: 3px;
      overflow: hidden;
      color: var(--ink);
      font-size: 11px;
      font-weight: 850;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .summary-item.total strong {
      color: var(--primary);
      font-size: 13px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
      gap: 14px;
      margin-top: 17px;
    }

    .info-card {
      padding: 14px 15px;
      border: 1px solid var(--border);
      border-radius: 13px;
      break-inside: avoid;
      background: #fff;
    }

    .info-card-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 11px;
    }

    .info-card-title h3 {
      margin: 0;
      color: var(--muted);
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .customer-type {
      border-radius: 999px;
      padding: 4px 7px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 8px;
      font-weight: 900;
    }

    .customer-name {
      margin: 0;
      color: var(--ink);
      font-size: 16px;
      font-weight: 900;
      letter-spacing: -0.25px;
    }

    .contact-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 14px;
      margin-top: 11px;
    }

    .contact-grid div {
      min-width: 0;
    }

    .contact-grid span {
      display: block;
      color: var(--muted);
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }

    .contact-grid strong {
      display: block;
      margin-top: 2px;
      overflow-wrap: anywhere;
      color: var(--text);
      font-size: 9.5px;
      font-weight: 700;
      line-height: 1.4;
    }

    .offer-meta-list {
      display: grid;
      gap: 8px;
    }

    .offer-meta-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 18px;
      padding-bottom: 7px;
      border-bottom: 1px dashed var(--border);
      font-size: 10px;
    }

    .offer-meta-row:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    .offer-meta-row span {
      color: var(--muted);
    }

    .offer-meta-row strong {
      color: var(--ink);
      font-weight: 850;
      text-align: right;
    }

    .description {
      margin-top: 14px;
      padding: 12px 14px;
      border: 1px solid
        color-mix(in srgb, var(--primary) 18%, var(--border));
      border-left: 4px solid var(--primary);
      border-radius: 0 11px 11px 0;
      background: var(--primary-faint);
      color: #334155;
      font-size: 10.5px;
      line-height: 1.55;
      break-inside: avoid;
    }

    .section-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 20px;
      margin-top: 20px;
      margin-bottom: 8px;
    }

    .section-heading h3 {
      margin: 0;
      color: var(--ink);
      font-size: 13px;
      font-weight: 900;
      letter-spacing: -0.15px;
    }

    .section-heading span {
      color: var(--muted);
      font-size: 9px;
      font-weight: 700;
    }

    .table-wrap {
      width: 100%;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 11px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 9px;
    }

    thead {
      display: table-header-group;
    }

    th {
      padding: 8px 5px;
      background: var(--ink);
      color: #fff;
      font-size: 7.8px;
      font-weight: 850;
      text-align: left;
      text-transform: uppercase;
      letter-spacing: 0.035em;
    }

    th:nth-child(1) {
      width: 5%;
    }

    th:nth-child(2) {
      width: 35%;
    }

    th:nth-child(3) {
      width: 7%;
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
      width: 16%;
    }

    td {
      padding: 8px 5px;
      border-bottom: 1px solid var(--border-soft);
      vertical-align: top;
      color: #334155;
    }

    tbody tr:nth-child(even) td {
      background: #fbfdff;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .right {
      text-align: right;
      white-space: nowrap;
    }

    .center {
      text-align: center;
      white-space: nowrap;
    }

    .strong {
      color: var(--ink);
      font-weight: 850;
    }

    .muted-cell {
      color: var(--muted);
      font-weight: 750;
    }

    .item-content {
      display: flex;
      min-width: 0;
      align-items: flex-start;
      gap: 8px;
    }

    .item-copy {
      min-width: 0;
    }

    .item-content strong {
      display: block;
      overflow-wrap: anywhere;
      color: var(--ink);
      font-size: 9.3px;
      font-weight: 850;
      line-height: 1.35;
    }

    .item-content p {
      margin: 3px 0 0;
      overflow-wrap: anywhere;
      color: var(--muted);
      font-size: 8.2px;
      line-height: 1.35;
    }

    .item-image-wrap {
      width: 39px;
      height: 39px;
      flex: 0 0 39px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: var(--surface);
    }

    .item-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .empty-row {
      padding: 24px;
      color: var(--muted);
      text-align: center;
    }

    .bottom-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 285px;
      gap: 18px;
      align-items: start;
      margin-top: 16px;
    }

    .terms-card {
      padding: 13px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      break-inside: avoid;
    }

    .terms-card h3 {
      margin: 0 0 7px;
      color: var(--ink);
      font-size: 10px;
      font-weight: 900;
    }

    .terms-card p {
      margin: 5px 0;
      color: #475569;
      font-size: 9.5px;
      line-height: 1.55;
    }

    .validity {
      margin-top: 9px !important;
      color: var(--primary) !important;
      font-weight: 850;
    }

    .totals {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: #fff;
      break-inside: avoid;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 11px;
      border-bottom: 1px solid var(--border-soft);
      color: #475569;
      font-size: 9.5px;
    }

    .total-row strong {
      color: var(--ink);
    }

    .total-row.discount strong {
      color: #c2410c;
    }

    .total-row:last-child {
      border-bottom: 0;
    }

    .total-row.grand {
      padding: 12px 11px;
      background: var(--primary-soft);
      color: var(--primary);
      font-size: 13px;
      font-weight: 900;
    }

    .total-row.grand span:last-child {
      font-size: 15px;
    }

    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 46px;
      margin-top: 36px;
      break-inside: avoid;
      page-break-inside: avoid;
    }

    .signature-card {
      min-height: 220px;
    }

    .signature-space {
      position: relative;
      height: 180px;
      overflow: visible;
    }

    .stamp {
      position: absolute;
      left: 50%;
      bottom: 0;
      transform: translateX(-50%);
      width: 100%;
      max-width: 430px;
      max-height: 180px;
      object-fit: contain;
      object-position: center;
      opacity: 1;
    }

    .signature-line {
      border-top: 1px solid #94a3b8;
      padding-top: 7px;
      text-align: center;
    }

    .signature-line span {
      display: block;
      color: var(--muted);
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .signature-line strong {
      display: block;
      margin-top: 3px;
      color: var(--ink);
      font-size: 9.5px;
      font-weight: 850;
    }

    .document-footer {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      margin-top: 28px;
      padding-top: 8px;
      border-top: 1px solid var(--border);
      color: #94a3b8;
      font-size: 7.8px;
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

      .page {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        box-shadow: none;
      }

      .document-footer {
        position: running(documentFooter);
      }
    }

    @media screen and (max-width: 900px) {
      .page {
        width: calc(100% - 18px);
        min-height: auto;
        margin: 9px;
        padding: 21px;
      }

      .header,
      .details-grid,
      .bottom-grid {
        grid-template-columns: 1fr;
      }

      .document-heading {
        text-align: left;
      }

      .summary-strip {
        grid-template-columns: 1fr 1fr;
      }

      .contact-grid {
        grid-template-columns: 1fr;
      }

      .table-wrap {
        overflow-x: auto;
      }

      table {
        min-width: 850px;
      }

      .signature-section {
        gap: 22px;
      }
    }
  </style>
</head>

<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">
      Ispis / spremi kao PDF
    </button>

    <button class="secondary" onclick="window.close()">
      Zatvori pregled
    </button>
  </div>

  <main class="page">
    <header class="header">
      <div class="company">
        ${logoHtml}

        <div class="company-copy">
          <h1>${escapeHtml(settings.companyName)}</h1>

          ${
            settings.companySubtitle
              ? `
                <div class="company-subtitle">
                  ${escapeHtml(settings.companySubtitle)}
                </div>
              `
              : ''
          }

          ${
            companyContactHtml
              ? `
                <div class="company-contact">
                  ${companyContactHtml}
                </div>
              `
              : ''
          }
        </div>
      </div>

      <div class="document-heading">
        <div class="document-kicker">Komercijalni dokument</div>
        <h2>PONUDA</h2>
        <div class="offer-number">
          ${escapeHtml(offer.offerNumber || 'Bez broja')}
        </div>
      </div>
    </header>

    <section class="summary-strip">
      <div class="summary-item">
        <span>Datum ponude</span>
        <strong>${escapeHtml(formatDate(offer.date))}</strong>
      </div>

      <div class="summary-item">
        <span>Vrijedi do</span>
        <strong>${escapeHtml(
          formatDate(offer.validUntil),
        )}</strong>
      </div>

      <div class="summary-item">
        <span>Odgovorna osoba</span>
        <strong>${escapeHtml(
          offer.responsiblePerson || '—',
        )}</strong>
      </div>

      <div class="summary-item total">
        <span>Ukupna vrijednost</span>
        <strong>${formatCurrency(total)}</strong>
      </div>
    </section>

    <section class="details-grid">
      <article class="info-card">
        <div class="info-card-title">
          <h3>Podaci o kupcu</h3>

          <span class="customer-type">
            ${escapeHtml(offer.customerType)}
          </span>
        </div>

        <p class="customer-name">
          ${escapeHtml(offer.customerName || 'Kupac nije unesen')}
        </p>

        ${
          customerContactRows
            ? `
              <div class="contact-grid">
                ${customerContactRows}
              </div>
            `
            : ''
        }
      </article>

      <article class="info-card">
        <div class="info-card-title">
          <h3>Podaci o ponudi</h3>
        </div>

        <div class="offer-meta-list">
          <div class="offer-meta-row">
            <span>Status</span>
            <strong>${escapeHtml(offer.status || 'Nacrt')}</strong>
          </div>

          <div class="offer-meta-row">
            <span>Verzija</span>
            <strong>${escapeHtml(offer.version || 1)}</strong>
          </div>

          <div class="offer-meta-row">
            <span>Broj stavki</span>
            <strong>${cleanItems.length}</strong>
          </div>

          <div class="offer-meta-row">
            <span>Valjanost</span>
            <strong>${escapeHtml(
              formatDate(offer.validUntil),
            )}</strong>
          </div>
        </div>
      </article>
    </section>

    ${
      offer.description
        ? `
          <section class="description">
            ${multilineHtml(offer.description)}
          </section>
        `
        : ''
    }

    <div class="section-heading">
      <h3>Troškovnik i stavke ponude</h3>
      <span>Svi iznosi izraženi su u eurima.</span>
    </div>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="center">R.br.</th>
            <th>Opis stavke</th>
            <th class="right">Kol.</th>
            <th class="center">JM</th>
            <th class="right">Cijena</th>
            <th class="right">Popust</th>
            <th class="right">PDV</th>
            <th class="right">Ukupno</th>
          </tr>
        </thead>

        <tbody>
          ${itemRows}
          ${emptyItemsHtml}
        </tbody>
      </table>
    </div>

    <section class="bottom-grid">
      <article class="terms-card">
        <h3>Uvjeti i napomene</h3>

        <p>
          ${multilineHtml(
            offer.paymentTerms || 'Uvjeti plaćanja nisu navedeni.',
          )}
        </p>

        <p class="validity">
          ${escapeHtml(getValidityText(offer.validUntil))}
        </p>
      </article>

      <div class="totals">
        <div class="total-row">
          <span>Vrijednost stavki</span>
          <strong>${formatCurrency(base)}</strong>
        </div>

        ${
          discount > 0
            ? `
              <div class="total-row discount">
                <span>Ukupni popust</span>
                <strong>− ${formatCurrency(discount)}</strong>
              </div>
            `
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

    ${signatureHtml}
    ${footerHtml}
  </main>

  <script>
    document.title = ${JSON.stringify(
      `${getSafeFileName(
        offer.offerNumber || 'Ponuda',
      )}-${getSafeFileName(offer.customerName || 'Kupac')}`,
    )};
  </script>
</body>
</html>`
}

export function openOfferPdf(
  offer: OfferPdfData,
  settings: Partial<OfferPdfSettings> = {},
) {
  const html = buildOfferPdfHtml(offer, settings)
  const blob = new Blob([html], {
    type: 'text/html;charset=utf-8',
  })
  const previewUrl = URL.createObjectURL(blob)
  const previewWindow = window.open(previewUrl, '_blank')

  if (!previewWindow) {
    URL.revokeObjectURL(previewUrl)
    window.alert(
      'Preglednik je blokirao novi prozor. Dopusti skočne prozore za FERSYS i pokušaj ponovno.',
    )
    return
  }

  previewWindow.focus()

  window.setTimeout(() => {
    URL.revokeObjectURL(previewUrl)
  }, 60_000)
}