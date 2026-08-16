import html2canvas from 'html2canvas'
import {
  jsPDF,
} from 'jspdf'

import {
  getCompanySettings,
} from '../services/companySettings.service'
import {
  getDeliveryNotePdfSettings,
} from '../services/deliveryNoteAppearance.service'
import type {
  DeliveryNote,
} from '../types/deliveryNote'
import {
  notifyDownloadError,
  notifyDownloadPreparing,
  saveBlobDownload,
} from './downloadFeedback'

function esc(
  value:
    string | number |
    null | undefined,
) {
  return String(
    value ?? '',
  )
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    )
}

function formatDate(
  value: string,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(
      `${value}T12:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(date)
}

function safeFileName(
  value: string,
) {
  return (
    value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /[^a-zA-Z0-9._-]+/g,
        '-',
      )
      .replace(
        /-+/g,
        '-',
      )
      .replace(
        /^-|-$|^\./g,
        ''
      ) ||
    'otpremnica'
  )
}

function relatedText(
  note:
    DeliveryNote,
) {
  return [
    note.workOrderNumber
      ? `Radni nalog: ${note.workOrderNumber}`
      : '',
    note.offerNumber
      ? `Ponuda: ${note.offerNumber}`
      : '',
    note.invoiceNumber
      ? `Račun: ${note.invoiceNumber}`
      : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

export async function
buildDeliveryNotePdfHtml(
  note:
    DeliveryNote,
) {
  const [
    company,
    appearance,
  ] =
    await Promise.all([
      getCompanySettings(),
      getDeliveryNotePdfSettings(),
    ])

  const rowPadding =
    appearance.compactTable
      ? '7px 8px'
      : '10px 8px'

  const related =
    relatedText(
      note,
    )

  const rows =
    note.items
      .map(
        (
          item,
          index,
        ) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>
              <strong>${esc(item.name)}</strong>
              ${
                item.description
                  ? `<div class="muted small">${esc(item.description)}</div>`
                  : ''
              }
              ${
                item.note
                  ? `<div class="muted tiny">${esc(item.note)}</div>`
                  : ''
              }
            </td>
            <td>${esc(item.code || '—')}</td>
            <td class="right">${esc(item.quantity)}</td>
            <td class="center">${esc(item.unit)}</td>
          </tr>
        `,
      )
      .join('')

  const companyAddress =
    [
      company.address,
      [
        company.postalCode,
        company.city,
      ]
        .filter(Boolean)
        .join(' '),
      company.country,
    ]
      .filter(Boolean)
      .join(', ')

  return `
<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8" />
<style>
  * {
    box-sizing: border-box;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: ${appearance.backgroundColor};
    color: ${appearance.textColor};
    font-family: Arial, Helvetica, sans-serif;
  }

  .page {
    position: relative;
    width: 794px;
    min-height: 1123px;
    padding: 50px 56px 44px;
    background: ${appearance.backgroundColor};
    overflow: hidden;
  }

  .accent {
    position: absolute;
    inset: 0 0 auto;
    height: 8px;
    background:
      linear-gradient(
        90deg,
        ${appearance.primaryColor},
        ${appearance.accentColor}
      );
  }

  .header {
    display: grid;
    grid-template-columns: 1.2fr .8fr;
    gap: 30px;
    align-items: start;
  }

  .brand {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .logo {
    width: 78px;
    height: 58px;
    object-fit: contain;
  }

  .company-name {
    margin: 0 0 5px;
    font-size: 20px;
    font-weight: 900;
  }

  .company-line {
    margin-top: 3px;
    color: #64748B;
    font-size: 10px;
    line-height: 1.45;
  }

  .doc-title {
    text-align: right;
  }

  .doc-title h1 {
    margin: 0;
    color: ${appearance.secondaryColor};
    font-size: 34px;
    font-weight: 950;
    letter-spacing: -.8px;
  }

  .doc-subtitle {
    margin-top: 3px;
    color: ${appearance.primaryColor};
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.7px;
    text-transform: uppercase;
  }

  .doc-number {
    margin-top: 15px;
    display: inline-block;
    border: 1px solid ${appearance.borderColor};
    border-radius: 11px;
    padding: 10px 13px;
    text-align: left;
    min-width: 180px;
  }

  .label {
    color: #64748B;
    font-size: 8px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .8px;
  }

  .value {
    margin-top: 4px;
    color: ${appearance.textColor};
    font-size: 11px;
    font-weight: 800;
  }

  .divider {
    margin: 24px 0 18px;
    height: 2px;
    background: ${appearance.primaryColor};
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .card {
    min-height: 104px;
    border: 1px solid ${appearance.borderColor};
    border-radius: 13px;
    padding: 14px;
  }

  .card-title {
    margin-bottom: 10px;
    color: ${appearance.primaryColor};
    font-size: 8px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .8px;
  }

  .line {
    display: grid;
    grid-template-columns: 112px 1fr;
    gap: 8px;
    align-items: baseline;
    padding: 3px 0;
    border-bottom: 1px solid rgba(148,163,184,.22);
  }

  .line:last-child {
    border-bottom: 0;
  }

  .line .k {
    color: #64748B;
    font-size: 8px;
  }

  .line .v {
    text-align: right;
    font-size: 9px;
    font-weight: 800;
  }

  table {
    width: 100%;
    margin-top: 18px;
    border-collapse: separate;
    border-spacing: 0;
    overflow: hidden;
    border: 1px solid ${appearance.borderColor};
    border-radius: 13px;
  }

  thead th {
    padding: 10px 8px;
    background: ${appearance.primaryColor};
    color: #fff;
    font-size: 8px;
    font-weight: 900;
    text-align: left;
    text-transform: uppercase;
    letter-spacing: .35px;
  }

  tbody td {
    padding: ${rowPadding};
    border-bottom: 1px solid ${appearance.borderColor};
    font-size: 9px;
    vertical-align: top;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  .center {
    text-align: center;
  }

  .right {
    text-align: right;
  }

  .muted {
    color: #64748B;
  }

  .small {
    margin-top: 3px;
    font-size: 8px;
  }

  .tiny {
    margin-top: 2px;
    font-size: 7px;
  }

  .note {
    margin-top: 16px;
    min-height: 72px;
    border: 1px solid ${appearance.borderColor};
    border-radius: 13px;
    padding: 13px 14px;
  }

  .note p {
    margin: 7px 0 0;
    color: #475569;
    font-size: 9px;
    line-height: 1.55;
    white-space: pre-wrap;
  }

  .signatures {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
  }

  .signature-box {
    min-height: 138px;
    border: 1px solid ${appearance.borderColor};
    border-radius: 13px;
    padding: 12px;
  }

  .signature-img {
    width: 100%;
    height: 70px;
    margin-top: 6px;
    object-fit: contain;
    background: #fff;
  }

  .stamp {
    position: absolute;
    right: 56px;
    bottom: 46px;
    max-width: 185px;
    max-height: 98px;
    object-fit: contain;
    opacity: .96;
  }

  .footer {
    position: absolute;
    left: 56px;
    right: 56px;
    bottom: 26px;
    padding-top: 8px;
    border-top: 1px solid ${appearance.borderColor};
    color: #94A3B8;
    font-size: 7px;
  }

  .status {
    display: inline-flex;
    margin-top: 8px;
    border-radius: 999px;
    padding: 5px 9px;
    background: ${appearance.primaryColor}15;
    color: ${appearance.primaryColor};
    font-size: 7px;
    font-weight: 900;
    text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="accent"></div>

    <div class="header">
      <div class="brand">
        ${
          appearance.showLogo &&
          company.logoUrl
            ? `<img class="logo" src="${esc(company.logoUrl)}" />`
            : ''
        }

        <div>
          <div class="company-name">${esc(company.name)}</div>
          ${
            companyAddress
              ? `<div class="company-line">${esc(companyAddress)}</div>`
              : ''
          }
          ${
            company.oib
              ? `<div class="company-line">OIB: ${esc(company.oib)}</div>`
              : ''
          }
          ${
            company.phone || company.email
              ? `<div class="company-line">${esc(
                  [company.phone, company.email]
                    .filter(Boolean)
                    .join(' · '),
                )}</div>`
              : ''
          }
        </div>
      </div>

      <div class="doc-title">
        <h1>${esc(appearance.title || 'OTPREMNICA')}</h1>
        <div class="doc-subtitle">Dokument isporuke robe / materijala</div>

        <div class="doc-number">
          <div class="label">Broj otpremnice</div>
          <div class="value">${esc(note.number)}</div>
          <div class="status">${esc(note.status)}</div>
        </div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="info-grid">
      <div class="card">
        <div class="card-title">Primatelj / investitor</div>

        <div class="line">
          <span class="k">Naziv</span>
          <span class="v">${esc(note.customerName)}</span>
        </div>

        <div class="line">
          <span class="k">OIB</span>
          <span class="v">${esc(note.customerOib || '—')}</span>
        </div>

        <div class="line">
          <span class="k">Adresa isporuke</span>
          <span class="v">${esc(note.deliveryAddress || '—')}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-title">Podaci o isporuci</div>

        <div class="line">
          <span class="k">Datum</span>
          <span class="v">${esc(formatDate(note.deliveryDate))}</span>
        </div>

        <div class="line">
          <span class="k">Vrijeme</span>
          <span class="v">${esc(note.deliveryTime || '—')}</span>
        </div>

        <div class="line">
          <span class="k">Mjesto</span>
          <span class="v">${esc(note.deliveryPlace || '—')}</span>
        </div>

        ${
          note.vehicleRegistration
            ? `
              <div class="line">
                <span class="k">Vozilo</span>
                <span class="v">${esc(note.vehicleRegistration)}</span>
              </div>
            `
            : ''
        }
      </div>
    </div>

    ${
      appearance.showRelatedDocuments &&
      related
        ? `
          <div class="note">
            <div class="card-title">Povezani dokumenti</div>
            <p>${esc(related)}</p>
          </div>
        `
        : ''
    }

    <table>
      <thead>
        <tr>
          <th style="width:38px">R.br.</th>
          <th>Naziv stavke</th>
          <th style="width:110px">Šifra</th>
          <th style="width:70px;text-align:right">Količina</th>
          <th style="width:55px;text-align:center">JM</th>
        </tr>
      </thead>

      <tbody>
        ${rows}
      </tbody>
    </table>

    ${
      note.note
        ? `
          <div class="note">
            <div class="card-title">Napomena</div>
            <p>${esc(note.note)}</p>
          </div>
        `
        : ''
    }

    ${
      appearance.showSignatures
        ? `
          <div class="signatures">
            <div class="signature-box">
              <div class="card-title">Predao</div>
              <div class="value">${esc(note.deliveredBy || '—')}</div>
              ${
                note.deliveredSignature
                  ? `<img class="signature-img" src="${esc(note.deliveredSignature)}" />`
                  : '<div style="height:70px"></div>'
              }
            </div>

            <div class="signature-box">
              <div class="card-title">Preuzeo</div>
              <div class="value">${esc(note.receivedBy || '—')}</div>
              ${
                note.receivedSignature
                  ? `<img class="signature-img" src="${esc(note.receivedSignature)}" />`
                  : '<div style="height:70px"></div>'
              }
            </div>
          </div>
        `
        : ''
    }

    ${
      appearance.showStamp &&
      company.stampUrl
        ? `<img class="stamp" src="${esc(company.stampUrl)}" />`
        : ''
    }

    ${
      appearance.showFooter
        ? `
          <div class="footer">
            ${esc(
              appearance.footerText ||
              company.documentFooter ||
              'Otpremnica je izrađena u sustavu FERSYS.',
            )}
          </div>
        `
        : ''
    }
  </div>
</body>
</html>
  `.trim()
}

async function htmlToBlob(
  html: string,
) {
  const wrapper =
    document.createElement(
      'div',
    )

  wrapper.style.position =
    'fixed'
  wrapper.style.left =
    '-100000px'
  wrapper.style.top = '0'
  wrapper.style.width =
    '794px'

  wrapper.innerHTML =
    html

  document.body.appendChild(
    wrapper,
  )

  try {
    await document.fonts
      .ready

    const page =
      wrapper.querySelector(
        '.page',
      ) as
        HTMLElement | null

    if (!page) {
      throw new Error(
        'PDF stranica nije pronađena.',
      )
    }

    const images =
      Array.from(
        page.querySelectorAll(
          'img',
        ),
      )

    await Promise.all(
      images.map(
        (image) =>
          image.complete
            ? Promise.resolve()
            : new Promise<void>(
                (resolve) => {
                  image.onload =
                    () =>
                      resolve()
                  image.onerror =
                    () =>
                      resolve()
                },
              ),
      ),
    )

    const canvas =
      await html2canvas(
        page,
        {
          scale: 2.2,
          backgroundColor:
            '#ffffff',
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 5000,
        },
      )

    const pdf =
      new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

    pdf.addImage(
      canvas.toDataURL(
        'image/jpeg',
        0.92,
      ),
      'JPEG',
      0,
      0,
      210,
      297,
      undefined,
      'FAST',
    )

    return pdf.output(
      'blob',
    )
  } finally {
    wrapper.remove()
  }
}

export async function
getDeliveryNotePdfBlob(
  note:
    DeliveryNote,
) {
  return htmlToBlob(
    await buildDeliveryNotePdfHtml(
      note,
    ),
  )
}

export async function
downloadDeliveryNotePdf(
  note:
    DeliveryNote,
) {
  const fileName =
    `${safeFileName(
      note.number ||
      'Otpremnica',
    )}-${safeFileName(
      note.customerName ||
      'Primatelj',
    )}.pdf`

  notifyDownloadPreparing(
    fileName,
  )

  try {
    const blob =
      await getDeliveryNotePdfBlob(
        note,
      )

    saveBlobDownload(
      blob,
      fileName,
    )
  } catch (error) {
    const message =
      error instanceof
      Error
        ? error.message
        : 'PDF otpremnice nije moguće izraditi.'

    notifyDownloadError(
      message,
      fileName,
    )

    throw error
  }
}

export async function
shareDeliveryNotePdf(
  note:
    DeliveryNote,
) {
  const blob =
    await getDeliveryNotePdfBlob(
      note,
    )

  const file =
    new File(
      [blob],
      `${safeFileName(
        note.number,
      )}.pdf`,
      {
        type:
          'application/pdf',
      },
    )

  if (
    navigator.share &&
    (
      !navigator.canShare ||
      navigator.canShare({
        files: [file],
      })
    )
  ) {
    await navigator.share({
      title:
        `Otpremnica ${note.number}`,
      text:
        `Otpremnica ${note.number} za ${note.customerName}`,
      files: [file],
    })

    return
  }

  saveBlobDownload(
    blob,
    file.name,
  )
}
