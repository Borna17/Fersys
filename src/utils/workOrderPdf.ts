import { jsPDF } from 'jspdf'
import type {
  WorkOrder,
  WorkOrderBranding,
  WorkOrderImage,
} from '../types/workOrder'

type RGB = [number, number, number]

function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '').trim()
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((character) => character + character)
          .join('')
      : clean.padEnd(6, '0').slice(0, 6)

  return [
    Number.parseInt(full.slice(0, 2), 16) || 0,
    Number.parseInt(full.slice(2, 4), 16) || 0,
    Number.parseInt(full.slice(4, 6), 16) || 0,
  ]
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(value: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('hr-HR').format(
    new Date(`${value}T00:00:00`),
  )
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours && rest) return `${hours} h ${rest} min`
  if (hours) return `${hours} h`
  return `${rest} min`
}

function imageFormat(dataUrl: string): 'PNG' | 'JPEG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

function addImageCover(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const properties = doc.getImageProperties(dataUrl)
  const ratio = Math.max(width / properties.width, height / properties.height)
  const renderWidth = properties.width * ratio
  const renderHeight = properties.height * ratio
  const offsetX = x + (width - renderWidth) / 2
  const offsetY = y + (height - renderHeight) / 2

  doc.addImage(
    dataUrl,
    imageFormat(dataUrl),
    offsetX,
    offsetY,
    renderWidth,
    renderHeight,
  )
}

function addImageContain(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const properties = doc.getImageProperties(dataUrl)
  const ratio = Math.min(width / properties.width, height / properties.height)
  const renderWidth = properties.width * ratio
  const renderHeight = properties.height * ratio
  const offsetX = x + (width - renderWidth) / 2
  const offsetY = y + (height - renderHeight) / 2

  doc.addImage(
    dataUrl,
    imageFormat(dataUrl),
    offsetX,
    offsetY,
    renderWidth,
    renderHeight,
  )
}

function safeAddImage(
  doc: jsPDF,
  image: string,
  mode: 'cover' | 'contain',
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image) return
  try {
    if (mode === 'cover') {
      addImageCover(doc, image, x, y, width, height)
    } else {
      addImageContain(doc, image, x, y, width, height)
    }
  } catch {
    // Ne prekidamo izradu PDF-a ako pojedina slika nije ispravna.
  }
}

function addBackground(doc: jsPDF, branding: WorkOrderBranding) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const background = hexToRgb(branding.backgroundColor)

  doc.setFillColor(...background)
  doc.rect(0, 0, pageWidth, pageHeight, 'F')

  if (branding.showBackgroundImage && branding.backgroundImage) {
    doc.setGState(doc.GState({ opacity: 0.12 }))
    safeAddImage(
      doc,
      branding.backgroundImage,
      'cover',
      0,
      0,
      pageWidth,
      pageHeight,
    )
    doc.setGState(doc.GState({ opacity: 1 }))
  }

  if (branding.watermarkText.trim()) {
    doc.setTextColor(220, 225, 232)
    doc.setFontSize(32)
    doc.text(
      branding.watermarkText.toUpperCase(),
      pageWidth / 2,
      pageHeight / 2,
      {
        align: 'center',
        angle: 45,
      },
    )
  }
}

function addFooter(
  doc: jsPDF,
  branding: WorkOrderBranding,
  pageNumber: number,
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const secondary = hexToRgb(branding.secondaryColor)

  doc.setDrawColor(...secondary)
  doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16)

  doc.setFontSize(8)
  doc.setTextColor(90, 100, 115)
  doc.text(branding.footerText || '', 14, pageHeight - 10)
  doc.text(`Stranica ${pageNumber}`, pageWidth - 14, pageHeight - 10, {
    align: 'right',
  })
}

function addHeader(
  doc: jsPDF,
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const pageWidth = doc.internal.pageSize.getWidth()
  const primary = hexToRgb(branding.primaryColor)
  const secondary = hexToRgb(branding.secondaryColor)

  if (branding.layout === 'modern') {
    doc.setFillColor(...secondary)
    doc.roundedRect(10, 10, pageWidth - 20, 38, 4, 4, 'F')
  }

  const textColor =
    branding.layout === 'modern' ? [255, 255, 255] : secondary

  let logoX = 14
  if (branding.headerAlignment === 'center') logoX = pageWidth / 2 - 17
  if (branding.headerAlignment === 'right') logoX = pageWidth - 48

  if (branding.showLogo && branding.logo) {
    safeAddImage(doc, branding.logo, 'contain', logoX, 14, 34, 28)
  }

  const headingX =
    branding.headerAlignment === 'left' && branding.showLogo && branding.logo
      ? 54
      : branding.headerAlignment === 'center'
        ? pageWidth / 2
        : branding.headerAlignment === 'right'
          ? pageWidth - 14
          : 14

  const align =
    branding.headerAlignment === 'center'
      ? 'center'
      : branding.headerAlignment === 'right'
        ? 'right'
        : 'left'

  doc.setTextColor(...(textColor as RGB))
  doc.setFontSize(17)
  doc.setFont('helvetica', 'bold')
  doc.text(branding.companyName || 'Naziv tvrtke', headingX, 23, {
    align,
  })

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')

  const companyLine = [
    branding.companyAddress,
    branding.showCompanyPhone ? branding.companyPhone : '',
    branding.showCompanyEmail ? branding.companyEmail : '',
  ]
    .filter(Boolean)
    .join(' • ')

  doc.text(companyLine, headingX, 30, { align, maxWidth: 125 })

  const companyLine2 = [
    branding.showCompanyOib && branding.companyOib
      ? `OIB: ${branding.companyOib}`
      : '',
    branding.showCompanyIban && branding.companyIban
      ? `IBAN: ${branding.companyIban}`
      : '',
    branding.showCompanyWebsite ? branding.companyWebsite : '',
  ]
    .filter(Boolean)
    .join(' • ')

  doc.text(companyLine2, headingX, 36, { align, maxWidth: 125 })

  doc.setFillColor(...primary)
  doc.roundedRect(pageWidth - 55, 52, 45, 15, 3, 3, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RADNI NALOG', pageWidth - 32.5, 58, { align: 'center' })
  doc.setFontSize(8)
  doc.text(order.orderNumber, pageWidth - 32.5, 63.5, { align: 'center' })
}

function drawSectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  branding: WorkOrderBranding,
) {
  const primary = hexToRgb(branding.primaryColor)
  doc.setFillColor(...primary)
  doc.roundedRect(14, y, 182, 8, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), 18, y + 5.5)
}

function writeLabelValue(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  branding: WorkOrderBranding,
) {
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(90, 100, 115)
  doc.text(label.toUpperCase(), x, y)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...hexToRgb(branding.textColor))
  const lines = doc.splitTextToSize(value || '—', maxWidth)
  doc.text(lines, x, y + 5)
  return y + 5 + lines.length * 4.2
}

function addPhotoPages(
  doc: jsPDF,
  images: WorkOrderImage[],
  branding: WorkOrderBranding,
  startingPageNumber: number,
) {
  let pageNumber = startingPageNumber

  for (let index = 0; index < images.length; index += 4) {
    doc.addPage()
    pageNumber += 1
    addBackground(doc, branding)

    drawSectionTitle(doc, 'Fotografije izvedenih radova', 14, branding)

    const group = images.slice(index, index + 4)
    const boxWidth = 86
    const boxHeight = 112
    const positions = [
      [14, 28],
      [110, 28],
      [14, 151],
      [110, 151],
    ]

    group.forEach((image, imageIndex) => {
      const [x, y] = positions[imageIndex]
      doc.setDrawColor(...hexToRgb(branding.borderColor))
      doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'S')
      safeAddImage(doc, image.dataUrl, 'contain', x + 2, y + 2, boxWidth - 4, boxHeight - 10)
      doc.setFontSize(7)
      doc.setTextColor(90, 100, 115)
      doc.text(image.name || `Fotografija ${index + imageIndex + 1}`, x + 3, y + boxHeight - 3)
    })

    addFooter(doc, branding, pageNumber)
  }
}

export function downloadWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  addBackground(doc, branding)
  addHeader(doc, order, branding)

  drawSectionTitle(doc, 'Podaci o kupcu i nalogu', 72, branding)

  let leftY = 86
  let rightY = 86

  leftY = writeLabelValue(
    doc,
    'Kupac',
    order.customerName,
    16,
    leftY,
    82,
    branding,
  )
  leftY = writeLabelValue(
    doc,
    'Kontakt osoba',
    order.customerContactPerson,
    16,
    leftY + 3,
    82,
    branding,
  )
  leftY = writeLabelValue(
    doc,
    'Telefon / e-mail',
    [order.customerPhone, order.customerEmail].filter(Boolean).join(' • '),
    16,
    leftY + 3,
    82,
    branding,
  )
  leftY = writeLabelValue(
    doc,
    'OIB',
    order.customerOib,
    16,
    leftY + 3,
    82,
    branding,
  )
  leftY = writeLabelValue(
    doc,
    'Adresa radova',
    order.address,
    16,
    leftY + 3,
    82,
    branding,
  )

  rightY = writeLabelValue(
    doc,
    'Datum',
    formatDate(order.date),
    110,
    rightY,
    84,
    branding,
  )
  rightY = writeLabelValue(
    doc,
    'Dolazak',
    order.arrivalTime || '—',
    110,
    rightY + 3,
    84,
    branding,
  )
  rightY = writeLabelValue(
    doc,
    'Odlazak',
    order.departureTime || '—',
    110,
    rightY + 3,
    84,
    branding,
  )
  rightY = writeLabelValue(
    doc,
    'Trajanje',
    durationLabel(order.durationMinutes),
    110,
    rightY + 3,
    84,
    branding,
  )
  rightY = writeLabelValue(
    doc,
    'Status / prioritet',
    `${order.status} • ${order.priority}`,
    110,
    rightY + 3,
    84,
    branding,
  )
  rightY = writeLabelValue(
    doc,
    'Radnici',
    order.assignedWorkers.join(', '),
    110,
    rightY + 3,
    84,
    branding,
  )

  let y = Math.max(leftY, rightY) + 7

  drawSectionTitle(doc, 'Opis radova', y, branding)
  y += 12

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...hexToRgb(branding.textColor))
  const descriptionLines = doc.splitTextToSize(
    `${order.title}\n\n${order.description || 'Nema dodatnog opisa.'}`,
    176,
  )
  doc.text(descriptionLines, 17, y)
  y += descriptionLines.length * 4.2 + 8

  if (y > 208) {
    doc.addPage()
    addBackground(doc, branding)
    y = 18
  }

  drawSectionTitle(doc, 'Materijal i cijena', y, branding)
  y += 12

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(90, 100, 115)
  doc.text('MATERIJAL', 17, y)
  doc.text('KOL.', 120, y)
  doc.text('CIJENA', 155, y)
  doc.text('UKUPNO', 195, y, { align: 'right' })
  y += 5

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...hexToRgb(branding.textColor))

  if (order.materials.length === 0) {
    doc.text('Nema evidentiranog materijala.', 17, y)
    y += 6
  } else {
    order.materials.forEach((material) => {
      doc.text(material.name, 17, y, { maxWidth: 95 })
      doc.text(`${material.quantity} ${material.unit}`, 120, y)
      doc.text(formatMoney(material.unitPrice), 155, y)
      doc.text(
        formatMoney(material.quantity * material.unitPrice),
        195,
        y,
        { align: 'right' },
      )
      y += 6
    })
  }

  y += 4
  doc.setDrawColor(...hexToRgb(branding.borderColor))
  doc.line(110, y, 195, y)
  y += 6

  const totals = [
    ['Materijal', formatMoney(order.materialPrice)],
    ['Rad', formatMoney(order.labourPrice)],
    [`PDV ${order.vatRate}%`, formatMoney(order.totalPrice - order.materialPrice - order.labourPrice)],
    ['UKUPNO', formatMoney(order.totalPrice)],
  ]

  totals.forEach(([label, value], index) => {
    doc.setFont('helvetica', index === totals.length - 1 ? 'bold' : 'normal')
    doc.setFontSize(index === totals.length - 1 ? 10 : 8.5)
    doc.text(label, 135, y)
    doc.text(value, 195, y, { align: 'right' })
    y += index === totals.length - 1 ? 8 : 6
  })

  if (order.priceNote) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    const noteLines = doc.splitTextToSize(`Napomena: ${order.priceNote}`, 176)
    doc.text(noteLines, 17, y)
    y += noteLines.length * 4 + 4
  }

  if (y > 228) {
    doc.addPage()
    addBackground(doc, branding)
    y = 18
  }

  drawSectionTitle(doc, 'Potpis i ovjera', y, branding)
  y += 12

  doc.setDrawColor(...hexToRgb(branding.borderColor))
  doc.roundedRect(16, y, 78, 42, 2, 2, 'S')
  doc.roundedRect(108, y, 86, 42, 2, 2, 'S')

  if (branding.showStamp && branding.stamp) {
    safeAddImage(doc, branding.stamp, 'contain', 20, y + 3, 70, 28)
  }

  doc.setFontSize(8)
  doc.setTextColor(90, 100, 115)
  doc.text('IZVOĐAČ RADOVA / PEČAT', 55, y + 37, { align: 'center' })

  if (order.investorSignature) {
    safeAddImage(
      doc,
      order.investorSignature,
      'contain',
      112,
      y + 3,
      78,
      27,
    )
  }

  doc.setTextColor(...hexToRgb(branding.textColor))
  doc.setFontSize(8)
  doc.text(order.investorName || 'Investitor', 151, y + 33, {
    align: 'center',
  })
  doc.setTextColor(90, 100, 115)
  doc.text('POTPIS INVESTITORA', 151, y + 38, { align: 'center' })

  addFooter(doc, branding, 1)

  if (order.images.length > 0) {
    addPhotoPages(doc, order.images, branding, 1)
  }

  doc.save(`${order.orderNumber}-${order.customerName}.pdf`)
}

