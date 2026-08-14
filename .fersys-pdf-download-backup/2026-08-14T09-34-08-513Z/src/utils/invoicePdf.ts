import {
  getCompanySettings,
} from '../services/companySettings.service'

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
  customerType:
    | 'Fizička osoba'
    | 'Tvrtka'
    | 'Zgrada'
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
  signatureDataUrl?: string
  primaryColor: string
  showStamp: boolean
  showFooter: boolean
  footerText: string
}

const DEFAULT_SETTINGS:
InvoicePdfSettings = {
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
  primaryColor: '#0F172A',
  showStamp: true,
  showFooter: true,
  footerText:
    'Račun je izrađen u sustavu FERSYS.',
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
  item: InvoicePdfItem,
) {
  return (
    item.quantity *
    item.price *
    (1 -
      item.discount / 100)
  )
}

function itemVat(
  item: InvoicePdfItem,
) {
  return (
    itemNet(item) *
    (item.vat / 100)
  )
}

function itemTotal(
  item: InvoicePdfItem,
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
): Partial<InvoicePdfSettings> {
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
      '#0F172A',
    footerText:
      settings.documentFooter,
    showStamp:
      Boolean(
        settings.stampUrl,
      ),
    showFooter: true,
  }
}

function paginateItems(
  items:
    InvoicePdfItem[],
) {
  const pages:
    InvoicePdfItem[][] = []

  let current:
    InvoicePdfItem[] = []

  let weight = 0
  let first = true

  for (
    const item
    of items
  ) {
    const rowWeight =
      1 +
      Math.min(
        1.3,
        item.description.length /
          170,
      )

    const capacity =
      first
        ? 13
        : 17

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
      --brand: ${primaryColor};
      --ink: #111827;
      --text: #334155;
      --muted: #64748b;
      --border: #dbe3ee;
      --surface: #f8fafc;
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
      background: var(--ink);
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
        12mm 13mm 10mm;
      background: white;
      box-shadow:
        0 18px 55px
        rgba(15,23,42,.18);
      break-after: page;
    }

    .page::before {
      position: absolute;
      inset: 0 0 auto;
      height: 1.6mm;
      background: var(--ink);
      content: "";
    }

    .header {
      display: grid;
      grid-template-columns:
        minmax(0,1fr)
        190px;
      gap: 24px;
      align-items: start;
      padding-top: 3mm;
      padding-bottom: 13px;
      border-bottom:
        2px solid
        var(--ink);
    }

    .company {
      display: flex;
      gap: 12px;
      min-width: 0;
    }

    .logo,
    .logo-fallback {
      width: 56px;
      height: 56px;
      flex: 0 0 56px;
      object-fit: contain;
    }

    .logo-fallback {
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--ink);
      color: white;
      font-size: 18px;
      font-weight: 900;
    }

    .company h1 {
      margin: 0;
      color: var(--ink);
      font-size: 20px;
      line-height: 1.1;
      font-weight: 950;
    }

    .subtitle {
      margin-top: 3px;
      color: var(--muted);
      font-size: 8.5px;
    }

    .seller-lines {
      margin-top: 6px;
      color: #475569;
      font-size: 8.4px;
      line-height: 1.45;
    }

    .heading {
      text-align: right;
    }

    .kicker {
      color: var(--muted);
      font-size: 7.8px;
      font-weight: 900;
      letter-spacing: .14em;
      text-transform: uppercase;
    }

    .heading h2 {
      margin: 4px 0 0;
      color: var(--ink);
      font-size: 30px;
      line-height: 1;
      font-weight: 950;
      letter-spacing: -.02em;
    }

    .number {
      display: inline-flex;
      margin-top: 7px;
      border-radius: 6px;
      padding: 5px 9px;
      background: #f1f5f9;
      color: var(--ink);
      font-size: 9.5px;
      font-weight: 900;
    }

    .summary {
      display: grid;
      grid-template-columns:
        repeat(4,1fr);
      gap: 1px;
      margin-top: 13px;
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 7px;
      background: var(--border);
    }

    .summary > div {
      padding: 9px 10px;
      background: white;
    }

    .summary span {
      display: block;
      color: var(--muted);
      font-size: 7.4px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .summary strong {
      display: block;
      margin-top: 3px;
      color: var(--ink);
      font-size: 9.4px;
    }

    .summary .total {
      background: var(--ink);
    }

    .summary .total span,
    .summary .total strong {
      color: white;
    }

    .summary .total strong {
      font-size: 12.5px;
    }

    .party-grid {
      display: grid;
      grid-template-columns:
        1fr 1fr;
      gap: 12px;
      margin-top: 13px;
    }

    .card {
      padding: 11px 12px;
      border:
        1px solid
        var(--border);
      border-radius: 7px;
    }

    .card h3 {
      margin: 0 0 7px;
      color: var(--muted);
      font-size: 7.7px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .party-name {
      color: var(--ink);
      font-size: 12.5px;
      font-weight: 950;
    }

    .party-details {
      margin-top: 5px;
      font-size: 8.4px;
      line-height: 1.45;
    }

    .description {
      margin-top: 11px;
      padding: 9px 11px;
      border-left:
        4px solid
        var(--ink);
      background: #f8fafc;
      font-size: 8.8px;
      line-height: 1.45;
    }

    .section-title {
      margin: 14px 0 7px;
      color: var(--ink);
      font-size: 10.5px;
      font-weight: 950;
    }

    .table-wrap {
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 6px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 8.3px;
    }

    th {
      padding: 7px 5px;
      background: var(--ink);
      color: white;
      font-size: 7.1px;
      text-align: left;
      text-transform: uppercase;
    }

    th:nth-child(1) {
      width: 5%;
    }

    th:nth-child(2) {
      width: 38%;
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
      width: 12%;
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

    td strong {
      color: var(--ink);
      font-size: 8.4px;
    }

    td p {
      margin: 2px 0 0;
      color: var(--muted);
      font-size: 7.3px;
      line-height: 1.3;
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
        245px;
      gap: 15px;
      margin-top: 14px;
      align-items: start;
    }

    .payment-card {
      padding: 10px 11px;
      border:
        1px solid
        var(--border);
      border-radius: 7px;
      background: #f8fafc;
    }

    .payment-card h3 {
      margin: 0 0 6px;
      color: var(--ink);
      font-size: 9px;
    }

    .payment-row {
      display: flex;
      justify-content:
        space-between;
      gap: 10px;
      padding: 4px 0;
      border-bottom:
        1px dashed
        var(--border);
      font-size: 8.2px;
    }

    .payment-row:last-child {
      border-bottom: 0;
    }

    .totals {
      overflow: hidden;
      border:
        1px solid
        var(--border);
      border-radius: 7px;
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
      padding: 11px 9px;
      background: var(--ink);
      color: white;
      font-size: 12.5px;
      font-weight: 950;
    }

    .note {
      margin-top: 10px;
      color: var(--muted);
      font-size: 8px;
      line-height: 1.4;
    }

    .responsible {
      display: flex;
      justify-content:
        space-between;
      gap: 16px;
      margin-top: 15px;
      color: var(--muted);
      font-size: 8px;
    }

    .stamp {
      max-width: 120px;
      max-height: 46px;
      object-fit: contain;
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
    InvoicePdfSettings,
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
  invoice:
    InvoicePdfData,
) {
  return [
    invoice.oib
      ? `
        <div>
          <strong>OIB:</strong>
          ${escapeHtml(
            invoice.oib,
          )}
        </div>
      `
      : '',
    [
      invoice.address,
      invoice.city,
    ]
      .filter(Boolean)
      .join(', ')
      ? `
        <div>
          ${escapeHtml(
            [
              invoice.address,
              invoice.city,
            ]
              .filter(Boolean)
              .join(', '),
          )}
        </div>
      `
      : '',
    invoice.email
      ? `
        <div>
          ${escapeHtml(
            invoice.email,
          )}
        </div>
      `
      : '',
    invoice.phone
      ? `
        <div>
          ${escapeHtml(
            invoice.phone,
          )}
        </div>
      `
      : '',
  ]
    .filter(Boolean)
    .join('')
}

function itemRows(
  items:
    InvoicePdfItem[],
  startIndex: number,
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

export function buildInvoicePdfHtml(
  invoice: InvoicePdfData,
  customSettings:
    Partial<InvoicePdfSettings> = {},
) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...customSettings,
  }

  const items =
    invoice.items.filter(
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
    paginateItems(items)

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
                        ? 'Dokument za plaćanje'
                        : 'Nastavak računa'
                    }
                  </div>

                  <h2>RAČUN</h2>

                  <div class="number">
                    ${escapeHtml(
                      invoice.invoiceNumber,
                    )}
                  </div>
                </div>
              </header>

              ${
                first
                  ? `
                    <section class="summary">
                      <div>
                        <span>Datum izdavanja</span>
                        <strong>
                          ${formatDate(
                            invoice.issueDate,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Datum usluge</span>
                        <strong>
                          ${formatDate(
                            invoice.serviceDate,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Dospijeće</span>
                        <strong>
                          ${formatDate(
                            invoice.dueDate,
                          )}
                        </strong>
                      </div>

                      <div class="total">
                        <span>Za platiti</span>
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
                          Izdavatelj
                        </h3>

                        <div class="party-name">
                          ${escapeHtml(
                            settings.companyName,
                          )}
                        </div>

                        <div class="party-details">
                          ${
                            settings.companyOib
                              ? `
                                <div>
                                  <strong>OIB:</strong>
                                  ${escapeHtml(
                                    settings.companyOib,
                                  )}
                                </div>
                              `
                              : ''
                          }

                          ${
                            settings.companyAddress
                              ? `
                                <div>
                                  ${escapeHtml(
                                    settings.companyAddress,
                                  )}
                                </div>
                              `
                              : ''
                          }
                        </div>
                      </article>

                      <article class="card">
                        <h3>
                          Kupac / primatelj računa
                        </h3>

                        <div class="party-name">
                          ${escapeHtml(
                            invoice.customerName,
                          )}
                        </div>

                        <div class="party-details">
                          ${customerLines(
                            invoice,
                          )}
                        </div>
                      </article>
                    </section>

                    ${
                      invoice.description
                        ? `
                          <section class="description">
                            ${multilineHtml(
                              invoice.description,
                            )}
                          </section>
                        `
                        : ''
                    }
                  `
                  : `
                    <div class="continuation">
                      Nastavak stavki računa
                    </div>
                  `
              }

              <div class="section-title">
                Stavke računa
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
                        Iznos
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    ${itemRows(
                      pageItems,
                      startIndex,
                    )}
                  </tbody>
                </table>
              </div>

              ${
                final
                  ? `
                    <section class="bottom">
                      <article class="payment-card">
                        <h3>
                          Podaci za plaćanje
                        </h3>

                        <div class="payment-row">
                          <span>Način plaćanja</span>
                          <strong>
                            ${escapeHtml(
                              invoice.paymentMethod ||
                              'Transakcijski račun',
                            )}
                          </strong>
                        </div>

                        <div class="payment-row">
                          <span>IBAN</span>
                          <strong>
                            ${escapeHtml(
                              invoice.iban ||
                              settings.companyIban ||
                              '—',
                            )}
                          </strong>
                        </div>

                        <div class="payment-row">
                          <span>Model</span>
                          <strong>
                            ${escapeHtml(
                              invoice.paymentModel ||
                              'HR00',
                            )}
                          </strong>
                        </div>

                        <div class="payment-row">
                          <span>Poziv na broj</span>
                          <strong>
                            ${escapeHtml(
                              invoice.paymentReference ||
                              invoice.invoiceNumber,
                            )}
                          </strong>
                        </div>
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
                          <span>ZA PLATITI</span>
                          <span>
                            ${formatCurrency(
                              total,
                            )}
                          </span>
                        </div>
                      </div>
                    </section>

                    ${
                      invoice.internalNote
                        ? `
                          <div class="note">
                            ${multilineHtml(
                              invoice.internalNote,
                            )}
                          </div>
                        `
                        : ''
                    }

                    <div class="responsible">
                      <span>
                        Račun izdao:
                        <strong>
                          ${escapeHtml(
                            invoice.responsiblePerson ||
                            settings.companyName,
                          )}
                        </strong>
                      </span>

                      ${stamp}
                    </div>
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
                          invoice.invoiceNumber,
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
      invoice.invoiceNumber,
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
          invoice.invoiceNumber ||
          'Racun',
        )}-${safeFileName(
          invoice.customerName ||
          'Kupac',
        )}`,
      )};
  </script>
</body>
</html>`
}

export function openInvoicePdf(
  invoice: InvoicePdfData,
  customSettings:
    Partial<InvoicePdfSettings> = {},
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
    '<p style="font-family:system-ui;padding:24px">Priprema računa...</p>',
  )

  void (async () => {
    try {
      const company =
        await getCompanySettings()

      const html =
        buildInvoicePdfHtml(
          invoice,
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
        '<p style="font-family:system-ui;padding:24px">PDF računa nije moguće izraditi.</p>',
      )
      previewWindow.document.close()
    }
  })()
}
