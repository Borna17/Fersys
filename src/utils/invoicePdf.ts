export type InvoicePdfItem = {
  id: string
  name: string
  description: string
  quantity: number
  unit: string
  price: number
  discount: number
  vat: number
}

export type InvoicePdfData = {
  id: string
  invoiceNumber: string
  customerName: string
  customerType: 'Fizička osoba' | 'Tvrtka' | 'Zgrada'
  oib: string
  email: string
  phone: string
  address: string
  city: string
  issueDate: string
  dueDate: string
  serviceDate: string
  status: string
  responsiblePerson: string
  description: string
  internalNote: string
  paymentMethod: string
  paymentModel: string
  paymentReference: string
  iban: string
  items: InvoicePdfItem[]
  createdAt: string
  updatedAt: string
  paidAt?: string
}

export type InvoicePdfSettings = {
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
  showStamp: boolean
  showFooter: boolean
  footerText: string
}

const DEFAULT_SETTINGS: InvoicePdfSettings = {
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
  showStamp: true,
  showFooter: true,
  footerText:
    'Račun je izrađen u poslovnom sustavu FERSYS.',
}

function itemBase(item: InvoicePdfItem) {
  return item.quantity * item.price
}

function itemDiscount(item: InvoicePdfItem) {
  return itemBase(item) * (item.discount / 100)
}

function itemNet(item: InvoicePdfItem) {
  return itemBase(item) - itemDiscount(item)
}

function itemVat(item: InvoicePdfItem) {
  return itemNet(item) * (item.vat / 100)
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

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(`${value}T12:00:00`).toLocaleDateString('hr-HR')
}

function escapeHtml(value: string | number | null | undefined) {
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

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function buildInvoicePdfHtml(
  invoice: InvoicePdfData,
  customSettings: Partial<InvoicePdfSettings> = {},
) {
  const settings = { ...DEFAULT_SETTINGS, ...customSettings }
  const cleanItems = invoice.items.filter((item) => item.name.trim())

  const base = cleanItems.reduce((sum, item) => sum + itemBase(item), 0)
  const discount = cleanItems.reduce(
    (sum, item) => sum + itemDiscount(item),
    0,
  )
  const net = cleanItems.reduce((sum, item) => sum + itemNet(item), 0)
  const vat = cleanItems.reduce((sum, item) => sum + itemVat(item), 0)
  const total = net + vat

  const vatGroups = Array.from(
    cleanItems.reduce((groups, item) => {
      const current = groups.get(item.vat) ?? {
        rate: item.vat,
        base: 0,
        vat: 0,
      }
      current.base += itemNet(item)
      current.vat += itemVat(item)
      groups.set(item.vat, current)
      return groups
    }, new Map<number, { rate: number; base: number; vat: number }>()),
  )
    .map(([, value]) => value)
    .sort((a, b) => a.rate - b.rate)

  const itemRows = cleanItems
    .map((item, index) => {
      const totalWithVat = itemNet(item) + itemVat(item)
      return `
        <tr>
          <td class="center">${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            ${
              item.description
                ? `<p>${multilineHtml(item.description)}</p>`
                : ''
            }
          </td>
          <td class="right">${formatNumber(item.quantity)}</td>
          <td class="center">${escapeHtml(item.unit)}</td>
          <td class="right">${formatCurrency(item.price)}</td>
          <td class="right">${formatNumber(item.discount)}%</td>
          <td class="right">${formatNumber(item.vat)}%</td>
          <td class="right strong">${formatCurrency(totalWithVat)}</td>
        </tr>
      `
    })
    .join('')

  const vatRows = vatGroups
    .map(
      (group) => `
        <tr>
          <td>${formatNumber(group.rate)}%</td>
          <td class="right">${formatCurrency(group.base)}</td>
          <td class="right">${formatCurrency(group.vat)}</td>
        </tr>
      `,
    )
    .join('')

  const logoHtml = settings.logoDataUrl
    ? `<img class="logo" src="${escapeHtml(settings.logoDataUrl)}" alt="Logo" />`
    : `<div class="logo-fallback">${escapeHtml(
        settings.companyName.slice(0, 2).toUpperCase(),
      )}</div>`

  const stampHtml =
    settings.showStamp && settings.stampDataUrl
      ? `<img class="stamp" src="${escapeHtml(
          settings.stampDataUrl,
        )}" alt="Pečat" />`
      : ''

  const sellerLines = [
    settings.companyAddress,
    settings.companyOib ? `OIB: ${settings.companyOib}` : '',
    settings.companyIban ? `IBAN: ${settings.companyIban}` : '',
    settings.companyEmail,
    settings.companyPhone,
    settings.companyWebsite,
  ]
    .filter(Boolean)
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join('')

  const customerAddress = [invoice.address, invoice.city]
    .filter(Boolean)
    .join(', ')

  return `<!doctype html>
<html lang="hr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(invoice.invoiceNumber)} - ${escapeHtml(
    invoice.customerName,
  )}</title>
  <style>
    :root {
      --primary: ${escapeHtml(settings.primaryColor)};
      --ink: #0f172a;
      --text: #334155;
      --muted: #64748b;
      --border: #dbe3ee;
      --surface: #f8fafc;
      --soft: color-mix(in srgb, var(--primary) 9%, white);
    }

    * { box-sizing: border-box; }

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
      padding: 13px;
      background: rgba(15, 23, 42, .97);
    }

    .toolbar button {
      border: 0;
      border-radius: 11px;
      padding: 11px 18px;
      font-weight: 800;
      cursor: pointer;
    }

    .toolbar .primary { background: var(--primary); color: white; }
    .toolbar .secondary { background: #1e293b; color: #e2e8f0; border: 1px solid #475569; }

    .page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      margin: 18px auto;
      padding: 13mm 14mm 12mm;
      overflow: hidden;
      background: white;
      box-shadow: 0 22px 65px rgba(15, 23, 42, .2);
    }

    .page::before {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 5px;
      content: "";
      background: linear-gradient(90deg, var(--primary), #22d3ee);
    }

    .header {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 28px;
      padding-bottom: 17px;
      border-bottom: 1px solid var(--border);
    }

    .company { display: flex; gap: 15px; }
    .logo { width: 78px; height: 78px; object-fit: contain; }
    .logo-fallback {
      display: grid;
      place-items: center;
      width: 70px;
      height: 70px;
      border-radius: 16px;
      background: var(--primary);
      color: white;
      font-size: 23px;
      font-weight: 900;
    }

    .company h1 {
      margin: 1px 0 0;
      color: var(--ink);
      font-size: 25px;
      font-weight: 900;
    }

    .subtitle { margin-top: 5px; color: var(--muted); font-size: 10.5px; }
    .seller-lines { margin-top: 8px; color: #475569; font-size: 9.5px; line-height: 1.45; }

    .heading { min-width: 190px; text-align: right; }
    .kicker {
      color: var(--primary);
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .18em;
      text-transform: uppercase;
    }

    .heading h2 {
      margin: 4px 0 0;
      color: var(--ink);
      font-size: 34px;
      font-weight: 950;
    }

    .number {
      display: inline-flex;
      margin-top: 8px;
      border: 1px solid color-mix(in srgb, var(--primary) 25%, var(--border));
      border-radius: 999px;
      padding: 6px 11px;
      background: var(--soft);
      color: var(--primary);
      font-size: 12px;
      font-weight: 900;
    }

    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1px;
      margin-top: 16px;
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--border);
    }

    .summary div { padding: 10px 12px; background: var(--surface); }
    .summary span {
      display: block;
      color: var(--muted);
      font-size: 8.5px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .summary strong {
      display: block;
      margin-top: 3px;
      color: var(--ink);
      font-size: 11px;
    }
    .summary .total strong { color: var(--primary); font-size: 13px; }

    .party-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-top: 17px;
    }

    .card {
      padding: 14px 15px;
      border: 1px solid var(--border);
      border-radius: 13px;
      break-inside: avoid;
    }

    .card h3 {
      margin: 0 0 10px;
      color: var(--muted);
      font-size: 9px;
      font-weight: 900;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .party-name { color: var(--ink); font-size: 16px; font-weight: 900; }
    .party-details { margin-top: 9px; font-size: 9.5px; line-height: 1.6; }
    .party-details strong { color: var(--ink); }

    .description {
      margin-top: 14px;
      padding: 12px 14px;
      border-left: 4px solid var(--primary);
      border-radius: 0 11px 11px 0;
      background: color-mix(in srgb, var(--primary) 4%, white);
      font-size: 10.5px;
      line-height: 1.55;
    }

    .section-title {
      margin: 20px 0 8px;
      color: var(--ink);
      font-size: 13px;
      font-weight: 900;
    }

    .table-wrap {
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

    th {
      padding: 8px 5px;
      background: var(--ink);
      color: white;
      font-size: 7.8px;
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
      padding: 8px 5px;
      border-bottom: 1px solid #e9eef5;
      vertical-align: top;
    }

    tbody tr:nth-child(even) td { background: #fbfdff; }
    tbody tr:last-child td { border-bottom: 0; }
    td p { margin: 3px 0 0; color: var(--muted); font-size: 8.2px; line-height: 1.35; }
    .right { text-align: right; white-space: nowrap; }
    .center { text-align: center; }
    .strong { color: var(--ink); font-weight: 850; }

    .bottom {
      display: grid;
      grid-template-columns: 1fr 285px;
      gap: 18px;
      margin-top: 16px;
      align-items: start;
    }

    .payment-card {
      padding: 13px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--surface);
      font-size: 9.5px;
      line-height: 1.6;
    }

    .payment-card h3 { margin: 0 0 7px; color: var(--ink); font-size: 10px; }
    .payment-row { display: grid; grid-template-columns: 120px 1fr; gap: 8px; }
    .payment-row span { color: var(--muted); }
    .payment-row strong { color: var(--ink); overflow-wrap: anywhere; }

    .totals {
      overflow: hidden;
      border: 1px solid var(--border);
      border-radius: 12px;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 8px 11px;
      border-bottom: 1px solid #e9eef5;
      font-size: 9.5px;
    }

    .total-row:last-child { border-bottom: 0; }
    .total-row.grand {
      padding: 12px 11px;
      background: var(--soft);
      color: var(--primary);
      font-size: 14px;
      font-weight: 900;
    }

    .vat-table {
      width: 285px;
      margin: 13px 0 0 auto;
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
    }

    .vat-table table { font-size: 8.5px; }
    .vat-table th { background: var(--surface); color: var(--muted); }

    .signature {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 46px;
      margin-top: 35px;
      break-inside: avoid;
    }

    .signature-card { min-height: 220px; }
    .signature-space { position: relative; height: 180px; overflow: visible; }
    .stamp {
      position: absolute;
      left: 50%;
      bottom: 0;
      width: 100%;
      max-width: 430px;
      max-height: 180px;
      transform: translateX(-50%);
      object-fit: contain;
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
    }

    .signature-line strong {
      display: block;
      margin-top: 3px;
      color: var(--ink);
      font-size: 9.5px;
    }

    footer {
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
      @page { size: A4; margin: 0; }
      html, body { background: white; }
      .toolbar { display: none !important; }
      .page { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="primary" onclick="window.print()">Ispis / spremi kao PDF</button>
    <button class="secondary" onclick="window.close()">Zatvori pregled</button>
  </div>

  <main class="page">
    <header class="header">
      <div class="company">
        ${logoHtml}
        <div>
          <h1>${escapeHtml(settings.companyName)}</h1>
          <div class="subtitle">${escapeHtml(settings.companySubtitle)}</div>
          <div class="seller-lines">${sellerLines}</div>
        </div>
      </div>

      <div class="heading">
        <div class="kicker">Knjigovodstveni dokument</div>
        <h2>RAČUN</h2>
        <div class="number">${escapeHtml(invoice.invoiceNumber)}</div>
      </div>
    </header>

    <section class="summary">
      <div><span>Datum izdavanja</span><strong>${formatDate(
        invoice.issueDate,
      )}</strong></div>
      <div><span>Datum usluge</span><strong>${formatDate(
        invoice.serviceDate,
      )}</strong></div>
      <div><span>Dospijeće</span><strong>${formatDate(
        invoice.dueDate,
      )}</strong></div>
      <div class="total"><span>Za plaćanje</span><strong>${formatCurrency(
        total,
      )}</strong></div>
    </section>

    <section class="party-grid">
      <article class="card">
        <h3>Izdavatelj</h3>
        <div class="party-name">${escapeHtml(settings.companyName)}</div>
        <div class="party-details">${sellerLines}</div>
      </article>

      <article class="card">
        <h3>Kupac</h3>
        <div class="party-name">${escapeHtml(
          invoice.customerName || 'Kupac nije unesen',
        )}</div>
        <div class="party-details">
          ${invoice.oib ? `<div><strong>OIB:</strong> ${escapeHtml(invoice.oib)}</div>` : ''}
          ${customerAddress ? `<div>${escapeHtml(customerAddress)}</div>` : ''}
          ${invoice.email ? `<div>${escapeHtml(invoice.email)}</div>` : ''}
          ${invoice.phone ? `<div>${escapeHtml(invoice.phone)}</div>` : ''}
        </div>
      </article>
    </section>

    ${
      invoice.description
        ? `<section class="description">${multilineHtml(
            invoice.description,
          )}</section>`
        : ''
    }

    <div class="section-title">Stavke računa</div>
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
        <tbody>${itemRows}</tbody>
      </table>
    </div>

    <section class="bottom">
      <article class="payment-card">
        <h3>Podaci za plaćanje</h3>
        <div class="payment-row"><span>Način plaćanja</span><strong>${escapeHtml(
          invoice.paymentMethod || 'Transakcijski račun',
        )}</strong></div>
        <div class="payment-row"><span>IBAN</span><strong>${escapeHtml(
          invoice.iban || settings.companyIban || '—',
        )}</strong></div>
        <div class="payment-row"><span>Model</span><strong>${escapeHtml(
          invoice.paymentModel || 'HR00',
        )}</strong></div>
        <div class="payment-row"><span>Poziv na broj</span><strong>${escapeHtml(
          invoice.paymentReference || invoice.invoiceNumber,
        )}</strong></div>
        <div class="payment-row"><span>Odgovorna osoba</span><strong>${escapeHtml(
          invoice.responsiblePerson,
        )}</strong></div>
      </article>

      <div>
        <div class="totals">
          <div class="total-row"><span>Vrijednost stavki</span><strong>${formatCurrency(
            base,
          )}</strong></div>
          ${
            discount > 0
              ? `<div class="total-row"><span>Popust</span><strong>− ${formatCurrency(
                  discount,
                )}</strong></div>`
              : ''
          }
          <div class="total-row"><span>Osnovica</span><strong>${formatCurrency(
            net,
          )}</strong></div>
          <div class="total-row"><span>PDV</span><strong>${formatCurrency(
            vat,
          )}</strong></div>
          <div class="total-row grand"><span>UKUPNO</span><span>${formatCurrency(
            total,
          )}</span></div>
        </div>

        <div class="vat-table">
          <table>
            <thead>
              <tr><th>Stopa</th><th class="right">Osnovica</th><th class="right">PDV</th></tr>
            </thead>
            <tbody>${vatRows}</tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="signature">
      <div class="signature-card">
        <div class="signature-space">${stampHtml}</div>
        <div class="signature-line">
          <span>Račun izdao</span>
          <strong>${escapeHtml(
            invoice.responsiblePerson || settings.companyName,
          )}</strong>
        </div>
      </div>

      <div class="signature-card">
        <div class="signature-space"></div>
        <div class="signature-line">
          <span>Račun primio</span>
          <strong>Potpis kupca</strong>
        </div>
      </div>
    </section>

    ${
      settings.showFooter
        ? `<footer><span>${escapeHtml(
            settings.footerText,
          )}</span><span>${escapeHtml(invoice.invoiceNumber)}</span></footer>`
        : ''
    }
  </main>

  <script>
    document.title = ${JSON.stringify(
      `${safeFileName(invoice.invoiceNumber || 'Racun')}-${safeFileName(
        invoice.customerName || 'Kupac',
      )}`,
    )};
  </script>
</body>
</html>`
}

export function openInvoicePdf(
  invoice: InvoicePdfData,
  settings: Partial<InvoicePdfSettings> = {},
) {
  const html = buildInvoicePdfHtml(invoice, settings)
  const blob = new Blob([html], {
    type: 'text/html;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const previewWindow = window.open(url, '_blank')

  if (!previewWindow) {
    URL.revokeObjectURL(url)
    window.alert(
      'Preglednik je blokirao novi prozor. Dopusti skočne prozore za FERSYS i pokušaj ponovno.',
    )
    return
  }

  previewWindow.focus()
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
