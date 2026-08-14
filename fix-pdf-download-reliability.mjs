import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-pdf-download-backup', stamp)

function load(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) throw new Error(`Nedostaje ${rel}`)
  const original = fs.readFileSync(file, 'utf8')
  return { rel, file, eol: original.includes('\r\n') ? '\r\n' : '\n', text: original.replace(/\r\n/g, '\n') }
}

function save(s) {
  const backup = path.join(backupRoot, s.rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(s.file, backup)
  fs.writeFileSync(s.file, s.eol === '\r\n' ? s.text.replace(/\n/g, '\r\n') : s.text, 'utf8')
  console.log(`✓ ${s.rel}`)
}

function addHelpers(s, kind) {
  if (!s.text.includes("import html2canvas from 'html2canvas'")) {
    s.text = `import html2canvas from 'html2canvas'\nimport { jsPDF } from 'jspdf'\n\n` + s.text
  }

  if (!s.text.includes('async function renderHtmlPagesToPdf(')) {
    const marker = kind === 'offer'
      ? 'export function buildOfferPdfHtml('
      : 'export function buildInvoicePdfHtml('
    const idx = s.text.indexOf(marker)
    if (idx < 0) throw new Error(`${marker} nije pronađen`)

    const helper = `
async function waitForPdfImages(
  target: Document,
) {
  const images =
    Array.from(
      target.querySelectorAll('img'),
    )

  await Promise.all(
    images.map(
      (image) =>
        new Promise<void>(
          (resolve) => {
            if (image.complete) {
              resolve()
              return
            }

            image.onload = () =>
              resolve()

            image.onerror = () =>
              resolve()
          },
        ),
    ),
  )
}

async function renderHtmlPagesToPdf(
  html: string,
  fileName: string,
) {
  const iframe =
    document.createElement('iframe')

  Object.assign(
    iframe.style,
    {
      position: 'fixed',
      left: '0',
      top: '0',
      width: '794px',
      height: '1123px',
      border: '0',
      pointerEvents: 'none',
      zIndex: '-2147483647',
    },
  )

  document.body.appendChild(iframe)

  try {
    const iframeDocument =
      iframe.contentDocument

    if (!iframeDocument) {
      throw new Error(
        'PDF renderer nije dostupan.',
      )
    }

    iframeDocument.open()
    iframeDocument.write(html)
    iframeDocument.close()

    await new Promise<void>(
      (resolve) =>
        window.setTimeout(resolve, 100),
    )

    await iframeDocument.fonts?.ready
    await waitForPdfImages(
      iframeDocument,
    )

    const toolbar =
      iframeDocument.querySelector(
        '.toolbar',
      ) as HTMLElement | null

    if (toolbar) {
      toolbar.style.display = 'none'
    }

    const pages =
      Array.from(
        iframeDocument.querySelectorAll(
          '.page',
        ),
      ) as HTMLElement[]

    if (!pages.length) {
      throw new Error(
        'PDF nema stranica za izradu.',
      )
    }

    const doc =
      new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      })

    for (
      let index = 0;
      index < pages.length;
      index += 1
    ) {
      pages[index].style.margin = '0'
      pages[index].style.boxShadow = 'none'

      const canvas =
        await html2canvas(
          pages[index],
          {
            scale: 2,
            backgroundColor: '#ffffff',
            useCORS: true,
            allowTaint: false,
            logging: false,
          },
        )

      const image =
        canvas.toDataURL(
          'image/jpeg',
          0.94,
        )

      if (index > 0) {
        doc.addPage()
      }

      doc.addImage(
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

    doc.save(fileName)
  } finally {
    iframe.remove()
  }
}

`
    s.text = s.text.slice(0, idx) + helper + s.text.slice(idx)
  }

  const exportName = kind === 'offer' ? 'downloadOfferPdf' : 'downloadInvoicePdf'
  const typeName = kind === 'offer' ? 'OfferPdfData' : 'InvoicePdfData'
  const settingsName = kind === 'offer' ? 'OfferPdfSettings' : 'InvoicePdfSettings'
  const builderName = kind === 'offer' ? 'buildOfferPdfHtml' : 'buildInvoicePdfHtml'
  const numberExpr = kind === 'offer' ? 'data.offerNumber' : 'data.invoiceNumber'
  const fallback = kind === 'offer' ? 'Ponuda' : 'Racun'
  const customerFallback = kind === 'offer' ? 'Investitor' : 'Kupac'

  if (!s.text.includes(`export async function ${exportName}(`)) {
    s.text += `

export async function ${exportName}(
  data: ${typeName},
  customSettings:
    Partial<${settingsName}> = {},
) {
  try {
    const company =
      await getCompanySettings()

    const html =
      ${builderName}(
        data,
        {
          ...companySettingsFromCurrent(
            company,
          ),
          ...customSettings,
        },
      )

    const fileName =
      \`\${safeFileName(
        ${numberExpr} ||
        '${fallback}',
      )}-\${safeFileName(
        data.customerName ||
        '${customerFallback}',
      )}.pdf\`

    await renderHtmlPagesToPdf(
      html,
      fileName,
    )
  } catch (error) {
    console.error(
      '${exportName} error:',
      error,
    )

    window.alert(
      error instanceof Error
        ? \`PDF nije moguće izraditi: \${error.message}\`
        : 'PDF nije moguće izraditi.',
    )
  }
}
`
  }
}

function patchOfferPdf() {
  const s = load('src/utils/offerPdf.ts')

  s.text = s.text.replace(
`      --soft:
        color-mix(
          in srgb,
          var(--primary) 8%,
          white
        );`,
`      --soft: #eef4ff;`,
  )

  s.text = s.text.replace(
`      background:
        color-mix(
          in srgb,
          var(--primary) 4%,
          white
        );`,
`      background: #f8fafc;`,
  )

  addHelpers(s, 'offer')
  save(s)
}

function patchInvoicePdf() {
  const s = load('src/utils/invoicePdf.ts')
  addHelpers(s, 'invoice')
  save(s)
}

function patchWorkOrderPdf() {
  const s = load('src/utils/workOrderPdf.ts')

  const replacements = [
    [`      background:
        color-mix(
          in srgb,
          \${primary} 9%,
          white
        );`,
     `      background: #eef4ff;`],
    [`      background:
        color-mix(
          in srgb,
          \${primary} 8%,
          white
        );`,
     `      background: #eef4ff;`],
    [`      background:
        color-mix(
          in srgb,
          \${primary} 6%,
          white
        );`,
     `      background: #f8fafc;`],
    [`      border: 2px solid
        color-mix(
          in srgb,
          \${primary} 30%,
          white
        );`,
     `      border: 2px solid \${primary};`],
    [`      background: color-mix(in srgb, \${primary} 5%, white);`,
     `      background: #f8fafc;`],
    [`      border-color: color-mix(in srgb, \${primary} 24%, \${border});`,
     `      border-color: \${primary};`],
    [`      border: 2px solid color-mix(in srgb, \${primary} 35%, white);`,
     `      border: 2px solid \${primary};`],
    [`      background: color-mix(in srgb, \${primary} 9%, white);`,
     `      background: #eef4ff;`],
  ]

  for (const [a, b] of replacements) {
    s.text = s.text.replace(a, b)
  }

  if (s.text.includes('color-mix(')) {
    throw new Error(
      'U workOrderPdf.ts još postoji color-mix(). Zaustavljeno da ne ostane tihi PDF kvar.',
    )
  }

  s.text = s.text.replace(
`        position: fixed;
        left: -100000px;
        top: 0;
        width: 794px;
        background: #fff;
        z-index: -1;`,
`        position: fixed;
        left: 0;
        top: 0;
        width: 794px;
        background: #fff;
        pointer-events: none;
        z-index: -2147483647;`,
  )

  save(s)
}

function patchPage(rel, fromName, toName) {
  const full = path.join(root, rel)
  if (!fs.existsSync(full)) return
  const s = load(rel)
  if (!s.text.includes(fromName)) {
    console.log(`• ${rel} — nema ${fromName}`)
    return
  }
  s.text = s.text.split(fromName).join(toName)
  save(s)
}

try {
  console.log('FERSYS PDF DOWNLOAD RELIABILITY FIX')
  console.log(`Backup: ${backupRoot}`)

  patchWorkOrderPdf()
  patchOfferPdf()
  patchInvoicePdf()

  for (const rel of [
    'src/pages/NewOfferPage.tsx',
    'src/pages/OfferDetailsPage.tsx',
    'src/pages/OffersPage.tsx',
  ]) {
    patchPage(rel, 'openOfferPdf', 'downloadOfferPdf')
  }

  for (const rel of [
    'src/pages/NewInvoicePage.tsx',
    'src/pages/InvoiceDetailsPage.tsx',
    'src/pages/InvoicesPage.tsx',
  ]) {
    patchPage(rel, 'openInvoicePdf', 'downloadInvoicePdf')
  }

  console.log('')
  console.log('✓ Work order renderer očišćen od color-mix().')
  console.log('✓ Ponuda sada radi pravi direktni PDF download.')
  console.log('✓ Račun sada radi pravi direktni PDF download.')
  console.log('✓ PDF gumbi više ne ovise o popup prozoru.')
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error(
    '✗ Patch zaustavljen:',
    error instanceof Error ? error.message : error,
  )
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}
