import { jsPDF } from 'jspdf'

import type {
  WorkOrder,
  WorkOrderBranding,
  WorkOrderImage,
} from '../types/workOrder'

type PdfContext = {
  doc: jsPDF
  order: WorkOrder
  branding: WorkOrderBranding
  primary: string
  secondary: string
  pageWidth: number
  pageHeight: number
  marginX: number
  topMargin: number
  bottomMargin: number
  contentWidth: number
  y: number
  pageNumber: number
}

const A4_WIDTH = 210
const A4_HEIGHT = 297

function safeFileName(value: string) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
}

function formatDate(value: string) {
  if (!value) {
    return '—'
  }

  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('hr-HR').format(date)
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value)
}

function durationLabel(minutes: number) {
  if (!minutes) {
    return '—'
  }

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60

  if (hours && rest) {
    return `${hours} h ${rest} min`
  }

  if (hours) {
    return `${hours} h`
  }

  return `${rest} min`
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '').trim()

  if (clean.length !== 6) {
    return {
      r: 37,
      g: 99,
      b: 235,
    }
  }

  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  }
}

function setTextColor(
  doc: jsPDF,
  color: string,
) {
  const rgb = hexToRgb(color)

  doc.setTextColor(
    rgb.r,
    rgb.g,
    rgb.b,
  )
}

function setFillColor(
  doc: jsPDF,
  color: string,
) {
  const rgb = hexToRgb(color)

  doc.setFillColor(
    rgb.r,
    rgb.g,
    rgb.b,
  )
}

function setDrawColor(
  doc: jsPDF,
  color: string,
) {
  const rgb = hexToRgb(color)

  doc.setDrawColor(
    rgb.r,
    rgb.g,
    rgb.b,
  )
}

async function imageSourceToDataUrl(
  source: string,
): Promise<string | null> {
  if (!source) {
    return null
  }

  if (
    source.startsWith('data:image/')
  ) {
    return source
  }

  try {
    const response = await fetch(source)

    if (!response.ok) {
      return null
    }

    const blob = await response.blob()

    return await new Promise<string | null>(
      (resolve) => {
        const reader = new FileReader()

        reader.onload = () => {
          resolve(
            typeof reader.result === 'string'
              ? reader.result
              : null,
          )
        }

        reader.onerror = () => resolve(null)
        reader.readAsDataURL(blob)
      },
    )
  } catch {
    return null
  }
}

function getImageFormat(
  dataUrl: string,
): 'PNG' | 'JPEG' {
  return dataUrl
    .toLowerCase()
    .startsWith('data:image/png')
    ? 'PNG'
    : 'JPEG'
}

async function getImageDimensions(
  dataUrl: string,
): Promise<{
  width: number
  height: number
}> {
  return await new Promise(
    (resolve) => {
      const image = new Image()

      image.onload = () => {
        resolve({
          width:
            image.naturalWidth ||
            image.width ||
            1,
          height:
            image.naturalHeight ||
            image.height ||
            1,
        })
      }

      image.onerror = () => {
        resolve({
          width: 1,
          height: 1,
        })
      }

      image.src = dataUrl
    },
  )
}

function fitImage(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio = Math.min(
    maxWidth / width,
    maxHeight / height,
  )

  return {
    width: width * ratio,
    height: height * ratio,
  }
}

function drawPageHeader(
  ctx: PdfContext,
  logoDataUrl: string | null,
) {
  const {
    doc,
    branding,
    order,
    primary,
    marginX,
    contentWidth,
  } = ctx

  setFillColor(doc, primary)
  doc.rect(
    0,
    0,
    A4_WIDTH,
    3,
    'F',
  )

  const headerY = 10

  if (
    branding.showLogo &&
    logoDataUrl
  ) {
    try {
      doc.addImage(
        logoDataUrl,
        getImageFormat(logoDataUrl),
        marginX,
        headerY,
        24,
        24,
        undefined,
        'FAST',
      )
    } catch {
      // Ako se logo ne može prikazati,
      // ostatak dokumenta se i dalje generira.
    }
  } else {
    setFillColor(doc, primary)
    doc.roundedRect(
      marginX,
      headerY,
      24,
      24,
      3,
      3,
      'F',
    )

    doc.setFont(
      'helvetica',
      'bold',
    )
    doc.setFontSize(15)
    doc.setTextColor(
      255,
      255,
      255,
    )

    const initials =
      (
        branding.companyName ||
        'FERSYS'
      )
        .trim()
        .slice(0, 2)
        .toUpperCase()

    doc.text(
      initials,
      marginX + 12,
      headerY + 15,
      {
        align: 'center',
      },
    )
  }

  const companyX =
    marginX + 30

  doc.setFont(
    'helvetica',
    'bold',
  )
  doc.setFontSize(13)
  doc.setTextColor(
    15,
    23,
    42,
  )

  doc.text(
    branding.companyName ||
      'Naziv tvrtke',
    companyX,
    headerY + 5,
  )

  doc.setFont(
    'helvetica',
    'normal',
  )
  doc.setFontSize(7.5)
  doc.setTextColor(
    100,
    116,
    139,
  )

  const companyLines: string[] = []

  if (
    branding.companyAddress
  ) {
    companyLines.push(
      branding.companyAddress,
    )
  }

  const contactLine = [
    branding.showCompanyPhone
      ? branding.companyPhone
      : '',
    branding.showCompanyEmail
      ? branding.companyEmail
      : '',
  ]
    .filter(Boolean)
    .join(' • ')

  if (contactLine) {
    companyLines.push(contactLine)
  }

  const idsLine = [
    branding.showCompanyOib &&
    branding.companyOib
      ? `OIB: ${branding.companyOib}`
      : '',
    branding.showCompanyIban &&
    branding.companyIban
      ? `IBAN: ${branding.companyIban}`
      : '',
  ]
    .filter(Boolean)
    .join(' • ')

  if (idsLine) {
    companyLines.push(idsLine)
  }

  companyLines
    .slice(0, 3)
    .forEach(
      (line, index) => {
        doc.text(
          line,
          companyX,
          headerY +
            10 +
            index * 4,
        )
      },
    )

  const rightX =
    marginX + contentWidth

  setTextColor(
    doc,
    primary,
  )

  doc.setFont(
    'helvetica',
    'bold',
  )
  doc.setFontSize(8)
  doc.text(
    'RADNI NALOG',
    rightX,
    headerY + 3,
    {
      align: 'right',
    },
  )

  doc.setTextColor(
    15,
    23,
    42,
  )
  doc.setFontSize(14)

  doc.text(
    order.orderNumber,
    rightX,
    headerY + 10,
    {
      align: 'right',
    },
  )

  doc.setFont(
    'helvetica',
    'normal',
  )
  doc.setFontSize(7.5)
  doc.setTextColor(
    100,
    116,
    139,
  )

  doc.text(
    `Datum: ${formatDate(
      order.date,
    )}`,
    rightX,
    headerY + 16,
    {
      align: 'right',
    },
  )

  doc.text(
    `Stranica ${ctx.pageNumber}`,
    rightX,
    headerY + 21,
    {
      align: 'right',
    },
  )

  setDrawColor(
    doc,
    '#E2E8F0',
  )

  doc.line(
    marginX,
    38,
    rightX,
    38,
  )

  ctx.y = 44
}

function drawFooter(
  ctx: PdfContext,
) {
  const {
    doc,
    branding,
    order,
    marginX,
    contentWidth,
    pageHeight,
  } = ctx

  const y =
    pageHeight - 9

  setDrawColor(
    doc,
    '#E2E8F0',
  )

  doc.line(
    marginX,
    y - 4,
    marginX +
      contentWidth,
    y - 4,
  )

  doc.setFont(
    'helvetica',
    'normal',
  )
  doc.setFontSize(6.5)
  doc.setTextColor(
    148,
    163,
    184,
  )

  doc.text(
    branding.footerText ||
      '',
    marginX,
    y,
  )

  doc.text(
    order.orderNumber,
    marginX +
      contentWidth,
    y,
    {
      align: 'right',
    },
  )
}

function addPage(
  ctx: PdfContext,
  logoDataUrl: string | null,
) {
  if (
    ctx.pageNumber > 0
  ) {
    ctx.doc.addPage()
  }

  ctx.pageNumber += 1

  drawPageHeader(
    ctx,
    logoDataUrl,
  )

  drawFooter(ctx)
}

function ensureSpace(
  ctx: PdfContext,
  requiredHeight: number,
  logoDataUrl: string | null,
) {
  const maxY =
    ctx.pageHeight -
    ctx.bottomMargin

  if (
    ctx.y + requiredHeight >
    maxY
  ) {
    addPage(
      ctx,
      logoDataUrl,
    )
  }
}

function sectionTitle(
  ctx: PdfContext,
  title: string,
  logoDataUrl: string | null,
) {
  ensureSpace(
    ctx,
    10,
    logoDataUrl,
  )

  setFillColor(
    ctx.doc,
    ctx.primary,
  )

  ctx.doc.roundedRect(
    ctx.marginX,
    ctx.y,
    2.2,
    6,
    1,
    1,
    'F',
  )

  ctx.doc.setFont(
    'helvetica',
    'bold',
  )
  ctx.doc.setFontSize(10)
  ctx.doc.setTextColor(
    15,
    23,
    42,
  )

  ctx.doc.text(
    title,
    ctx.marginX + 5,
    ctx.y + 4.7,
  )

  ctx.y += 9
}

function drawInfoCards(
  ctx: PdfContext,
  logoDataUrl: string | null,
) {
  ensureSpace(
    ctx,
    44,
    logoDataUrl,
  )

  const {
    doc,
    order,
    marginX,
    contentWidth,
  } = ctx

  const gap = 5
  const cardWidth =
    (contentWidth - gap) / 2
  const cardHeight = 38

  const drawCard = (
    x: number,
    title: string,
    lines: Array<{
      label?: string
      value: string
      strong?: boolean
    }>,
    muted = false,
  ) => {
    setFillColor(
      doc,
      muted
        ? '#F8FAFC'
        : '#FFFFFF',
    )

    setDrawColor(
      doc,
      '#E2E8F0',
    )

    doc.roundedRect(
      x,
      ctx.y,
      cardWidth,
      cardHeight,
      3,
      3,
      'FD',
    )

    doc.setFont(
      'helvetica',
      'bold',
    )
    doc.setFontSize(6.5)
    doc.setTextColor(
      148,
      163,
      184,
    )

    doc.text(
      title.toUpperCase(),
      x + 4,
      ctx.y + 6,
    )

    let lineY =
      ctx.y + 12

    for (const line of lines) {
      if (
        lineY >
        ctx.y +
          cardHeight -
          4
      ) {
        break
      }

      if (line.label) {
        doc.setFont(
          'helvetica',
          'normal',
        )
        doc.setFontSize(7)
        doc.setTextColor(
          100,
          116,
          139,
        )

        doc.text(
          line.label,
          x + 4,
          lineY,
        )

        doc.setFont(
          'helvetica',
          line.strong
            ? 'bold'
            : 'normal',
        )
        doc.setTextColor(
          15,
          23,
          42,
        )

        const available =
          cardWidth - 31

        const wrapped =
          doc.splitTextToSize(
            line.value || '—',
            available,
          )

        doc.text(
          wrapped[0] || '—',
          x +
            cardWidth -
            4,
          lineY,
          {
            align: 'right',
          },
        )
      } else {
        doc.setFont(
          'helvetica',
          line.strong
            ? 'bold'
            : 'normal',
        )
        doc.setFontSize(
          line.strong
            ? 9
            : 7.3,
        )
        doc.setTextColor(
          line.strong
            ? 15
            : 71,
          line.strong
            ? 23
            : 85,
          line.strong
            ? 42
            : 105,
        )

        const wrapped =
          doc.splitTextToSize(
            line.value || '—',
            cardWidth - 8,
          )

        doc.text(
          wrapped.slice(
            0,
            line.strong
              ? 1
              : 2,
          ),
          x + 4,
          lineY,
        )

        lineY +=
          wrapped.length > 1
            ? 3
            : 0
      }

      lineY += 5
    }
  }

  drawCard(
    marginX,
    'Kupac / investitor',
    [
      {
        value:
          order.customerName ||
          '—',
        strong: true,
      },
      {
        value:
          order.address ||
          '—',
      },
      {
        value:
          order.customerOib
            ? `OIB: ${order.customerOib}`
            : 'OIB: —',
      },
      {
        value: [
          order.customerPhone,
          order.customerEmail,
        ]
          .filter(Boolean)
          .join(' • ') || '—',
      },
    ],
  )

  drawCard(
    marginX +
      cardWidth +
      gap,
    'Podaci dokumenta',
    [
      {
        label: 'Vrijeme',
        value:
          `${order.arrivalTime || '—'} – ${order.departureTime || '—'}`,
        strong: true,
      },
      {
        label: 'Trajanje',
        value:
          durationLabel(
            order.durationMinutes,
          ),
        strong: true,
      },
      {
        label: 'Status',
        value:
          order.status ||
          '—',
        strong: true,
      },
      {
        label: 'Radnici',
        value:
          order.assignedWorkers.join(
            ', ',
          ) || '—',
        strong: true,
      },
    ],
    true,
  )

  ctx.y +=
    cardHeight + 7
}

function drawDescription(
  ctx: PdfContext,
  logoDataUrl: string | null,
) {
  sectionTitle(
    ctx,
    'Opis radova',
    logoDataUrl,
  )

  const {
    doc,
    order,
    marginX,
    contentWidth,
  } = ctx

  doc.setFont(
    'helvetica',
    'bold',
  )
  doc.setFontSize(8.5)

  const titleLines =
    order.title
      ? doc.splitTextToSize(
          order.title,
          contentWidth - 10,
        )
      : []

  doc.setFont(
    'helvetica',
    'normal',
  )
  doc.setFontSize(8)

  const descriptionLines =
    doc.splitTextToSize(
      order.description ||
        'Nema dodatnog opisa.',
      contentWidth - 10,
    )

  const allLines = [
    ...titleLines.map(
      (value: string) => ({
        value,
        bold: true,
      }),
    ),
    ...descriptionLines.map(
      (value: string) => ({
        value,
        bold: false,
      }),
    ),
  ]

  let index = 0

  while (
    index <
    allLines.length
  ) {
    const available =
      ctx.pageHeight -
      ctx.bottomMargin -
      ctx.y

    const maxLines =
      Math.max(
        1,
        Math.floor(
          (available - 8) / 4.2,
        ),
      )

    const chunk =
      allLines.slice(
        index,
        index +
          maxLines,
      )

    const boxHeight =
      8 +
      chunk.length *
        4.2

    ensureSpace(
      ctx,
      boxHeight,
      logoDataUrl,
    )

    setFillColor(
      doc,
      '#F8FAFC',
    )

    setDrawColor(
      doc,
      '#E2E8F0',
    )

    doc.roundedRect(
      marginX,
      ctx.y,
      contentWidth,
      boxHeight,
      3,
      3,
      'FD',
    )

    let textY =
      ctx.y + 6

    for (
      const line of
      chunk
    ) {
      doc.setFont(
        'helvetica',
        line.bold
          ? 'bold'
          : 'normal',
      )

      doc.setFontSize(
        line.bold
          ? 8.5
          : 8,
      )

      doc.setTextColor(
        line.bold
          ? 15
          : 51,
        line.bold
          ? 23
          : 65,
        line.bold
          ? 42
          : 85,
      )

      doc.text(
        line.value,
        marginX + 5,
        textY,
      )

      textY += 4.2
    }

    ctx.y +=
      boxHeight + 4

    index +=
      chunk.length

    if (
      index <
      allLines.length
    ) {
      addPage(
        ctx,
        logoDataUrl,
      )

      sectionTitle(
        ctx,
        'Opis radova – nastavak',
        logoDataUrl,
      )
    }
  }
}

function drawMaterialHeader(
  ctx: PdfContext,
) {
  const {
    doc,
    marginX,
    contentWidth,
  } = ctx

  const cols = {
    name: 0.52,
    qty: 0.15,
    price: 0.16,
    total: 0.17,
  }

  setFillColor(
    doc,
    ctx.primary,
  )

  doc.rect(
    marginX,
    ctx.y,
    contentWidth,
    8,
    'F',
  )

  doc.setTextColor(
    255,
    255,
    255,
  )

  doc.setFont(
    'helvetica',
    'bold',
  )

  doc.setFontSize(7)

  doc.text(
    'Materijal',
    marginX + 3,
    ctx.y + 5.3,
  )

  let x =
    marginX +
    contentWidth *
      cols.name

  doc.text(
    'Količina',
    x +
      contentWidth *
        cols.qty /
        2,
    ctx.y + 5.3,
    {
      align: 'center',
    },
  )

  x +=
    contentWidth *
    cols.qty

  doc.text(
    'Cijena',
    x +
      contentWidth *
        cols.price -
      3,
    ctx.y + 5.3,
    {
      align: 'right',
    },
  )

  x +=
    contentWidth *
    cols.price

  doc.text(
    'Ukupno',
    x +
      contentWidth *
        cols.total -
      3,
    ctx.y + 5.3,
    {
      align: 'right',
    },
  )

  ctx.y += 8
}

function drawMaterials(
  ctx: PdfContext,
  logoDataUrl: string | null,
) {
  sectionTitle(
    ctx,
    'Utrošeni materijal',
    logoDataUrl,
  )

  if (
    ctx.order.materials.length ===
    0
  ) {
    ensureSpace(
      ctx,
      12,
      logoDataUrl,
    )

    setFillColor(
      ctx.doc,
      '#F8FAFC',
    )

    setDrawColor(
      ctx.doc,
      '#E2E8F0',
    )

    ctx.doc.roundedRect(
      ctx.marginX,
      ctx.y,
      ctx.contentWidth,
      11,
      2,
      2,
      'FD',
    )

    ctx.doc.setFont(
      'helvetica',
      'normal',
    )
    ctx.doc.setFontSize(7.5)
    ctx.doc.setTextColor(
      100,
      116,
      139,
    )

    ctx.doc.text(
      'Nema evidentiranog materijala.',
      ctx.marginX + 4,
      ctx.y + 7,
    )

    ctx.y += 15
    return
  }

  drawMaterialHeader(ctx)

  const {
    doc,
    marginX,
    contentWidth,
  } = ctx

  const nameWidth =
    contentWidth * 0.52

  const qtyX =
    marginX +
    contentWidth * 0.52

  const priceX =
    qtyX +
    contentWidth * 0.15

  const totalX =
    priceX +
    contentWidth * 0.16

  for (
    let index = 0;
    index <
    ctx.order.materials.length;
    index += 1
  ) {
    const material =
      ctx.order.materials[index]

    doc.setFont(
      'helvetica',
      'normal',
    )
    doc.setFontSize(7.4)

    const nameLines =
      doc.splitTextToSize(
        material.name ||
          'Materijal',
        nameWidth - 6,
      )

    const rowHeight =
      Math.max(
        8,
        nameLines.length *
          3.8 +
          4,
      )

    if (
      ctx.y + rowHeight >
      ctx.pageHeight -
        ctx.bottomMargin
    ) {
      addPage(
        ctx,
        logoDataUrl,
      )

      sectionTitle(
        ctx,
        'Utrošeni materijal – nastavak',
        logoDataUrl,
      )

      drawMaterialHeader(ctx)
    }

    if (
      index % 2 === 1
    ) {
      setFillColor(
        doc,
        '#F8FAFC',
      )

      doc.rect(
        marginX,
        ctx.y,
        contentWidth,
        rowHeight,
        'F',
      )
    }

    setDrawColor(
      doc,
      '#E2E8F0',
    )

    doc.line(
      marginX,
      ctx.y +
        rowHeight,
      marginX +
        contentWidth,
      ctx.y +
        rowHeight,
    )

    doc.setTextColor(
      30,
      41,
      59,
    )

    doc.text(
      nameLines,
      marginX + 3,
      ctx.y + 5,
    )

    doc.text(
      `${material.quantity} ${material.unit}`,
      qtyX +
        contentWidth *
          0.15 /
          2,
      ctx.y + 5,
      {
        align: 'center',
      },
    )

    doc.text(
      formatMoney(
        material.unitPrice,
      ),
      priceX +
        contentWidth *
          0.16 -
        3,
      ctx.y + 5,
      {
        align: 'right',
      },
    )

    doc.setFont(
      'helvetica',
      'bold',
    )

    doc.text(
      formatMoney(
        material.quantity *
          material.unitPrice,
      ),
      totalX +
        contentWidth *
          0.17 -
        3,
      ctx.y + 5,
      {
        align: 'right',
      },
    )

    ctx.y +=
      rowHeight
  }

  ctx.y += 5
}

function drawTotals(
  ctx: PdfContext,
  logoDataUrl: string | null,
) {
  const height =
    ctx.order.priceNote
      ? 38
      : 30

  ensureSpace(
    ctx,
    height,
    logoDataUrl,
  )

  const {
    doc,
    order,
    contentWidth,
    marginX,
  } = ctx

  const boxWidth = 72
  const boxX =
    marginX +
    contentWidth -
    boxWidth

  const vatValue =
    order.totalPrice -
    order.materialPrice -
    order.labourPrice

  const rows = [
    [
      'Materijal',
      formatMoney(
        order.materialPrice,
      ),
    ],
    [
      'Rad',
      formatMoney(
        order.labourPrice,
      ),
    ],
    [
      `PDV ${order.vatRate}%`,
      formatMoney(
        vatValue,
      ),
    ],
  ]

  doc.setFontSize(7.5)

  let rowY = ctx.y

  for (
    const [
      label,
      value,
    ] of rows
  ) {
    doc.setFont(
      'helvetica',
      'normal',
    )
    doc.setTextColor(
      100,
      116,
      139,
    )

    doc.text(
      label,
      boxX,
      rowY + 4,
    )

    doc.setFont(
      'helvetica',
      'bold',
    )

    doc.setTextColor(
      30,
      41,
      59,
    )

    doc.text(
      value,
      boxX +
        boxWidth,
      rowY + 4,
      {
        align: 'right',
      },
    )

    rowY += 5.5
  }

  setFillColor(
    doc,
    '#EFF6FF',
  )

  setDrawColor(
    doc,
    '#DBEAFE',
  )

  doc.roundedRect(
    boxX,
    rowY,
    boxWidth,
    9,
    2,
    2,
    'FD',
  )

  setTextColor(
    doc,
    ctx.primary,
  )

  doc.setFont(
    'helvetica',
    'bold',
  )

  doc.setFontSize(9)

  doc.text(
    'UKUPNO',
    boxX + 3,
    rowY + 5.8,
  )

  doc.text(
    formatMoney(
      order.totalPrice,
    ),
    boxX +
      boxWidth -
      3,
    rowY + 5.8,
    {
      align: 'right',
    },
  )

  rowY += 13

  if (
    order.priceNote
  ) {
    doc.setFont(
      'helvetica',
      'normal',
    )

    doc.setFontSize(6.8)
    doc.setTextColor(
      100,
      116,
      139,
    )

    const note =
      doc.splitTextToSize(
        `Napomena: ${order.priceNote}`,
        contentWidth,
      )

    doc.text(
      note.slice(0, 4),
      marginX,
      rowY,
    )

    rowY +=
      Math.min(
        4,
        note.length,
      ) * 3.5
  }

  ctx.y =
    rowY + 4
}

async function drawPhotoGrid(
  ctx: PdfContext,
  logoDataUrl: string | null,
) {
  if (
    ctx.order.images.length ===
    0
  ) {
    return
  }

  sectionTitle(
    ctx,
    `Fotografije (${ctx.order.images.length})`,
    logoDataUrl,
  )

  const images: Array<{
    image: WorkOrderImage
    dataUrl: string
    width: number
    height: number
  }> = []

  for (
    const image of
    ctx.order.images
  ) {
    const dataUrl =
      await imageSourceToDataUrl(
        image.dataUrl,
      )

    if (!dataUrl) {
      continue
    }

    const dimensions =
      await getImageDimensions(
        dataUrl,
      )

    images.push({
      image,
      dataUrl,
      width:
        dimensions.width,
      height:
        dimensions.height,
    })
  }

  if (
    images.length === 0
  ) {
    ctx.doc.setFont(
      'helvetica',
      'normal',
    )
    ctx.doc.setFontSize(7.5)
    ctx.doc.setTextColor(
      100,
      116,
      139,
    )

    ctx.doc.text(
      'Fotografije nisu dostupne za prikaz u PDF-u.',
      ctx.marginX,
      ctx.y + 4,
    )

    ctx.y += 10
    return
  }

  const gap = 5
  const cellWidth =
    (ctx.contentWidth - gap) / 2
  const cellHeight = 55

  for (
    let index = 0;
    index < images.length;
    index += 2
  ) {
    if (
      ctx.y +
        cellHeight >
      ctx.pageHeight -
        ctx.bottomMargin
    ) {
      addPage(
        ctx,
        logoDataUrl,
      )

      sectionTitle(
        ctx,
        'Fotografije – nastavak',
        logoDataUrl,
      )
    }

    for (
      let column = 0;
      column < 2;
      column += 1
    ) {
      const current =
        images[
          index + column
        ]

      if (!current) {
        continue
      }

      const x =
        ctx.marginX +
        column *
          (cellWidth + gap)

      setFillColor(
        ctx.doc,
        '#F8FAFC',
      )

      setDrawColor(
        ctx.doc,
        '#E2E8F0',
      )

      ctx.doc.roundedRect(
        x,
        ctx.y,
        cellWidth,
        cellHeight,
        2.5,
        2.5,
        'FD',
      )

      const fitted =
        fitImage(
          current.width,
          current.height,
          cellWidth - 6,
          cellHeight - 11,
        )

      const imageX =
        x +
        (cellWidth -
          fitted.width) /
          2

      const imageY =
        ctx.y + 3

      try {
        ctx.doc.addImage(
          current.dataUrl,
          getImageFormat(
            current.dataUrl,
          ),
          imageX,
          imageY,
          fitted.width,
          fitted.height,
          undefined,
          'FAST',
        )
      } catch {
        // pojedinačna problematična
        // slika ne prekida PDF
      }

      ctx.doc.setFont(
        'helvetica',
        'normal',
      )

      ctx.doc.setFontSize(6.2)
      ctx.doc.setTextColor(
        100,
        116,
        139,
      )

      ctx.doc.text(
        current.image.name ||
          `Fotografija ${index + column + 1}`,
        x + 3,
        ctx.y +
          cellHeight -
          3,
      )
    }

    ctx.y +=
      cellHeight + 5
  }
}

async function drawSignatureBlock(
  ctx: PdfContext,
  logoDataUrl: string | null,
  stampDataUrl: string | null,
) {
  /*
   * Potpis i pečat se uvijek drže zajedno.
   * Ako nema dovoljno mjesta na trenutnoj
   * stranici, cijeli blok ide na novu
   * zadnju stranicu.
   */
  const requiredHeight = 55

  ensureSpace(
    ctx,
    requiredHeight,
    logoDataUrl,
  )

  sectionTitle(
    ctx,
    'Potpis i ovjera',
    logoDataUrl,
  )

  const {
    doc,
    marginX,
    contentWidth,
    order,
  } = ctx

  const gap = 18
  const width =
    (contentWidth - gap) / 2
  const startY = ctx.y
  const imageAreaHeight = 28

  const leftX =
    marginX
  const rightX =
    marginX +
    width +
    gap

  const drawSignatureCard = (
    x: number,
    label: string,
    subLabel: string,
  ) => {
    setDrawColor(
      doc,
      '#CBD5E1',
    )

    doc.line(
      x,
      startY +
        imageAreaHeight,
      x + width,
      startY +
        imageAreaHeight,
    )

    doc.setFont(
      'helvetica',
      'bold',
    )

    doc.setFontSize(7.5)
    doc.setTextColor(
      30,
      41,
      59,
    )

    doc.text(
      label,
      x + width / 2,
      startY +
        imageAreaHeight +
        5,
      {
        align: 'center',
      },
    )

    doc.setFont(
      'helvetica',
      'normal',
    )

    doc.setFontSize(6.5)
    doc.setTextColor(
      148,
      163,
      184,
    )

    doc.text(
      subLabel,
      x + width / 2,
      startY +
        imageAreaHeight +
        9,
      {
        align: 'center',
      },
    )
  }

  drawSignatureCard(
    leftX,
    'Izvođač radova',
    'Pečat / potpis',
  )

  drawSignatureCard(
    rightX,
    order.investorName ||
      'Investitor',
    'Potpis investitora',
  )

  if (
    ctx.branding.showStamp &&
    stampDataUrl
  ) {
    try {
      const dimensions =
        await getImageDimensions(
          stampDataUrl,
        )

      const fitted =
        fitImage(
          dimensions.width,
          dimensions.height,
          width - 12,
          imageAreaHeight - 3,
        )

      doc.addImage(
        stampDataUrl,
        getImageFormat(
          stampDataUrl,
        ),
        leftX +
          (width -
            fitted.width) /
            2,
        startY +
          imageAreaHeight -
          fitted.height -
          1,
        fitted.width,
        fitted.height,
        undefined,
        'FAST',
      )
    } catch {
      // pečat nije kritičan za generiranje PDF-a
    }
  }

  if (
    order.investorSignature
  ) {
    const signature =
      await imageSourceToDataUrl(
        order.investorSignature,
      )

    if (signature) {
      try {
        const dimensions =
          await getImageDimensions(
            signature,
          )

        const fitted =
          fitImage(
            dimensions.width,
            dimensions.height,
            width - 12,
            imageAreaHeight - 3,
          )

        doc.addImage(
          signature,
          getImageFormat(
            signature,
          ),
          rightX +
            (width -
              fitted.width) /
              2,
          startY +
            imageAreaHeight -
            fitted.height -
            1,
          fitted.width,
          fitted.height,
          undefined,
          'FAST',
        )
      } catch {
        // potpis nije kritičan za generiranje PDF-a
      }
    }
  }

  ctx.y +=
    requiredHeight
}

async function buildWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    new jsPDF({
      orientation:
        'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
      putOnlyUsedFonts: true,
    })

  const logoDataUrl =
    branding.showLogo
      ? await imageSourceToDataUrl(
          branding.logo,
        )
      : null

  const stampDataUrl =
    branding.showStamp
      ? await imageSourceToDataUrl(
          branding.stamp,
        )
      : null

  const ctx: PdfContext = {
    doc,
    order,
    branding,
    primary:
      branding.primaryColor ||
      '#2563EB',
    secondary:
      branding.secondaryColor ||
      '#0F172A',
    pageWidth:
      A4_WIDTH,
    pageHeight:
      A4_HEIGHT,
    marginX: 14,
    topMargin: 44,
    bottomMargin: 18,
    contentWidth:
      A4_WIDTH - 28,
    y: 44,
    pageNumber: 0,
  }

  addPage(
    ctx,
    logoDataUrl,
  )

  drawInfoCards(
    ctx,
    logoDataUrl,
  )

  drawDescription(
    ctx,
    logoDataUrl,
  )

  drawMaterials(
    ctx,
    logoDataUrl,
  )

  drawTotals(
    ctx,
    logoDataUrl,
  )

  await drawPhotoGrid(
    ctx,
    logoDataUrl,
  )

  await drawSignatureBlock(
    ctx,
    logoDataUrl,
    stampDataUrl,
  )

  return doc
}

/*
 * Ovaj export ostaje radi kompatibilnosti
 * s postojećim importima, ali novi PDF se
 * više ne generira kao jedna velika HTML
 * slika koja se naslijepo reže na A4.
 */
export function buildWorkOrderPdfHtml(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  return `
    <div>
      <strong>${branding.companyName}</strong>
      <div>${order.orderNumber}</div>
      <div>${order.title}</div>
    </div>
  `
}

export async function downloadWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    await buildWorkOrderPdf(
      order,
      branding,
    )

  const name =
    safeFileName(
      order.orderNumber ||
        'radni-nalog',
    )

  doc.save(
    `${name}.pdf`,
  )
}

export async function getWorkOrderPdfBlob(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    await buildWorkOrderPdf(
      order,
      branding,
    )

  return doc.output(
    'blob',
  )
}

export async function getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const blob =
    await getWorkOrderPdfBlob(
      order,
      branding,
    )

  return URL.createObjectURL(
    blob,
  )
}
