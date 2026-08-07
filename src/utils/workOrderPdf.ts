import { jsPDF } from 'jspdf'

import type {
  WorkOrder,
  WorkOrderBranding,
  WorkOrderImage,
} from '../types/workOrder'

type RGB = [number, number, number]

type Density = {
  body: number
  small: number
  rowHeight: number
  sectionGap: number
  descriptionLine: number
}

function getDensity(
  order: WorkOrder,
): Density {
  const itemCount =
    order.materials.length

  const descriptionLength =
    (
      order.title +
      order.description
    ).length

  if (
    itemCount >= 11 ||
    descriptionLength > 850
  ) {
    return {
      body: 7.2,
      small: 6.3,
      rowHeight: 4.5,
      sectionGap: 4,
      descriptionLine: 3.4,
    }
  }

  if (
    itemCount >= 7 ||
    descriptionLength > 500
  ) {
    return {
      body: 7.8,
      small: 6.6,
      rowHeight: 5,
      sectionGap: 5,
      descriptionLine: 3.7,
    }
  }

  return {
    body: 8.4,
    small: 7,
    rowHeight: 5.6,
    sectionGap: 6,
    descriptionLine: 4,
  }
}

function hexToRgb(
  hex: string,
): RGB {
  const clean =
    hex.replace('#', '').trim()

  const full =
    clean.length === 3
      ? clean
          .split('')
          .map(
            (character) =>
              character +
              character,
          )
          .join('')
      : clean
          .padEnd(6, '0')
          .slice(0, 6)

  return [
    Number.parseInt(
      full.slice(0, 2),
      16,
    ) || 0,
    Number.parseInt(
      full.slice(2, 4),
      16,
    ) || 0,
    Number.parseInt(
      full.slice(4, 6),
      16,
    ) || 0,
  ]
}

function formatMoney(
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

function formatDate(
  value: string,
) {
  if (!value) return '—'

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(
    new Date(
      `${value}T00:00:00`,
    ),
  )
}

function durationLabel(
  minutes: number,
) {
  if (!minutes) return '—'

  const hours =
    Math.floor(minutes / 60)

  const rest =
    minutes % 60

  if (hours && rest) {
    return `${hours} h ${rest} min`
  }

  if (hours) {
    return `${hours} h`
  }

  return `${rest} min`
}

function imageFormat(
  dataUrl: string,
): 'PNG' | 'JPEG' {
  return dataUrl.startsWith(
    'data:image/png',
  )
    ? 'PNG'
    : 'JPEG'
}

function safeAddImage(
  doc: jsPDF,
  image: string,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!image) return

  try {
    const properties =
      doc.getImageProperties(
        image,
      )

    const ratio =
      Math.min(
        width /
          properties.width,
        height /
          properties.height,
      )

    const renderWidth =
      properties.width * ratio

    const renderHeight =
      properties.height * ratio

    doc.addImage(
      image,
      imageFormat(image),
      x +
        (width -
          renderWidth) /
          2,
      y +
        (height -
          renderHeight) /
          2,
      renderWidth,
      renderHeight,
    )
  } catch {
    // Ne prekidaj PDF zbog slike.
  }
}

function addPageBackground(
  doc: jsPDF,
  branding: WorkOrderBranding,
) {
  const pageWidth =
    doc.internal.pageSize.getWidth()

  const pageHeight =
    doc.internal.pageSize.getHeight()

  doc.setFillColor(
    ...hexToRgb(
      branding.backgroundColor ||
        '#FFFFFF',
    ),
  )

  doc.rect(
    0,
    0,
    pageWidth,
    pageHeight,
    'F',
  )

  doc.setFillColor(
    ...hexToRgb(
      branding.primaryColor,
    ),
  )

  doc.rect(
    0,
    0,
    pageWidth,
    2.2,
    'F',
  )

  if (
    branding.watermarkText.trim()
  ) {
    doc.setTextColor(
      238,
      241,
      246,
    )

    doc.setFontSize(28)

    doc.text(
      branding.watermarkText
        .toUpperCase(),
      pageWidth / 2,
      pageHeight / 2,
      {
        align: 'center',
        angle: 35,
      },
    )
  }
}

function addHeader(
  doc: jsPDF,
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const pageWidth =
    doc.internal.pageSize.getWidth()

  const primary =
    hexToRgb(
      branding.primaryColor,
    )

  const ink =
    hexToRgb(
      branding.textColor ||
        '#0F172A',
    )

  const muted: RGB =
    [83, 102, 128]

  const border =
    hexToRgb(
      branding.borderColor ||
        '#D8E0EB',
    )

  const top = 8

  if (
    branding.showLogo &&
    branding.logo
  ) {
    doc.setDrawColor(...border)
    doc.roundedRect(
      12,
      top,
      27,
      23,
      2.5,
      2.5,
      'S',
    )

    safeAddImage(
      doc,
      branding.logo,
      14,
      top + 2,
      23,
      19,
    )
  }

  const companyX =
    branding.showLogo &&
    branding.logo
      ? 44
      : 13

  doc.setTextColor(...ink)
  doc.setFont(
    'helvetica',
    'bold',
  )
  doc.setFontSize(13)

  doc.text(
    branding.companyName ||
      'Naziv tvrtke',
    companyX,
    14,
    {
      maxWidth: 92,
    },
  )

  doc.setFont(
    'helvetica',
    'normal',
  )

  doc.setFontSize(7.2)
  doc.setTextColor(...muted)

  const contactLines = [
    branding.companyAddress,
    [
      branding.showCompanyOib &&
      branding.companyOib
        ? `OIB: ${branding.companyOib}`
        : '',
      branding.showCompanyWebsite
        ? branding.companyWebsite
        : '',
    ]
      .filter(Boolean)
      .join(' • '),
    [
      branding.showCompanyPhone
        ? branding.companyPhone
        : '',
      branding.showCompanyEmail
        ? branding.companyEmail
        : '',
    ]
      .filter(Boolean)
      .join(' • '),
  ].filter(Boolean)

  let lineY = 18.5

  contactLines
    .slice(0, 3)
    .forEach((line) => {
      doc.text(
        String(line),
        companyX,
        lineY,
        {
          maxWidth: 92,
        },
      )

      lineY += 4
    })

  doc.setTextColor(...primary)
  doc.setFont(
    'helvetica',
    'bold',
  )
  doc.setFontSize(8)

  doc.text(
    'RADNI NALOG',
    pageWidth - 13,
    12,
    {
      align: 'right',
    },
  )

  doc.setTextColor(...ink)
  doc.setFontSize(13)

  doc.text(
    order.orderNumber,
    pageWidth - 13,
    19,
    {
      align: 'right',
    },
  )

  doc.setFont(
    'helvetica',
    'normal',
  )
  doc.setTextColor(...muted)
  doc.setFontSize(7.2)

  doc.text(
    `Datum: ${formatDate(
      order.date,
    )}`,
    pageWidth - 13,
    25,
    {
      align: 'right',
    },
  )

  doc.setDrawColor(...border)

  doc.line(
    12,
    35,
    pageWidth - 12,
    35,
  )

  return 40
}

function addMiniContinuationHeader(
  doc: jsPDF,
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const pageWidth =
    doc.internal.pageSize.getWidth()

  const primary =
    hexToRgb(
      branding.primaryColor,
    )

  doc.setTextColor(...primary)
  doc.setFont(
    'helvetica',
    'bold',
  )
  doc.setFontSize(8)

  doc.text(
    `RADNI NALOG · ${order.orderNumber}`,
    12,
    10,
  )

  doc.setTextColor(
    100,
    116,
    139,
  )
  doc.setFont(
    'helvetica',
    'normal',
  )
  doc.setFontSize(7)

  doc.text(
    order.customerName,
    pageWidth - 12,
    10,
    {
      align: 'right',
    },
  )

  return 15
}

function sectionTitle(
  doc: jsPDF,
  title: string,
  y: number,
  branding: WorkOrderBranding,
) {
  const primary =
    hexToRgb(
      branding.primaryColor,
    )

  doc.setFillColor(...primary)

  doc.rect(
    12,
    y - 3.8,
    1.4,
    5.8,
    'F',
  )

  doc.setTextColor(
    15,
    23,
    42,
  )

  doc.setFont(
    'helvetica',
    'bold',
  )

  doc.setFontSize(8.4)

  doc.text(
    title,
    16,
    y,
  )

  return y + 4.5
}

function addInfoBlock(
  doc: jsPDF,
  order: WorkOrder,
  y: number,
  branding: WorkOrderBranding,
  density: Density,
) {
  const border =
    hexToRgb(
      branding.borderColor,
    )

  const muted: RGB =
    [100, 116, 139]

  const ink: RGB =
    [15, 23, 42]

  const leftX = 12
  const rightX = 108
  const boxWidth = 90
  const boxHeight = 31

  doc.setDrawColor(...border)
  doc.setFillColor(
    248,
    250,
    252,
  )

  doc.roundedRect(
    leftX,
    y,
    boxWidth,
    boxHeight,
    2.5,
    2.5,
    'S',
  )

  doc.roundedRect(
    rightX,
    y,
    boxWidth,
    boxHeight,
    2.5,
    2.5,
    'F',
  )

  doc.setFontSize(
    density.small,
  )

  doc.setFont(
    'helvetica',
    'bold',
  )

  doc.setTextColor(...muted)

  doc.text(
    'KUPAC / INVESTITOR',
    leftX + 4,
    y + 5,
  )

  doc.setTextColor(...ink)
  doc.setFontSize(
    density.body + 1,
  )

  doc.text(
    order.customerName ||
      '—',
    leftX + 4,
    y + 10,
    {
      maxWidth: 80,
    },
  )

  doc.setFont(
    'helvetica',
    'normal',
  )

  doc.setFontSize(
    density.small + 0.3,
  )

  doc.setTextColor(
    71,
    85,
    105,
  )

  const customerLines = [
    order.address,
    order.customerOib
      ? `OIB: ${order.customerOib}`
      : '',
    [
      order.customerPhone,
      order.customerEmail,
    ]
      .filter(Boolean)
      .join(' • '),
  ].filter(Boolean)

  let customerY = y + 15

  customerLines
    .slice(0, 3)
    .forEach((line) => {
      doc.text(
        line,
        leftX + 4,
        customerY,
        {
          maxWidth: 80,
        },
      )

      customerY += 4.2
    })

  doc.setFont(
    'helvetica',
    'bold',
  )

  doc.setTextColor(...muted)

  doc.text(
    'PODACI DOKUMENTA',
    rightX + 4,
    y + 5,
  )

  const meta = [
    [
      'Vrijeme',
      [
        order.arrivalTime ||
          '—',
        order.departureTime ||
          '—',
      ].join(' – '),
    ],
    [
      'Trajanje',
      durationLabel(
        order.durationMinutes,
      ),
    ],
    [
      'Status',
      `${order.status} · ${order.priority}`,
    ],
    [
      'Radnici',
      order.assignedWorkers
        .join(', ') || '—',
    ],
  ]

  let metaY = y + 10

  meta.forEach(
    ([label, value]) => {
      doc.setFont(
        'helvetica',
        'normal',
      )
      doc.setTextColor(...muted)
      doc.text(
        label,
        rightX + 4,
        metaY,
      )

      doc.setFont(
        'helvetica',
        'bold',
      )
      doc.setTextColor(...ink)
      doc.text(
        value,
        rightX + 86,
        metaY,
        {
          align: 'right',
          maxWidth: 55,
        },
      )

      metaY += 5
    },
  )

  return y + boxHeight
}

function addDescription(
  doc: jsPDF,
  order: WorkOrder,
  y: number,
  branding: WorkOrderBranding,
  density: Density,
) {
  y = sectionTitle(
    doc,
    'Opis radova',
    y,
    branding,
  )

  doc.setDrawColor(
    ...hexToRgb(
      branding.borderColor,
    ),
  )

  const text =
    [
      order.title,
      order.description,
    ]
      .filter(Boolean)
      .join('\n')

  doc.setFont(
    'helvetica',
    'normal',
  )

  doc.setFontSize(
    density.body,
  )

  doc.setTextColor(
    51,
    65,
    85,
  )

  const lines =
    doc.splitTextToSize(
      text ||
        'Nema dodatnog opisa.',
      174,
    )

  const boxHeight =
    Math.max(
      12,
      lines.length *
        density.descriptionLine +
        6,
    )

  doc.roundedRect(
    12,
    y,
    186,
    boxHeight,
    2.2,
    2.2,
    'S',
  )

  doc.text(
    lines,
    16,
    y + 5,
  )

  return y + boxHeight
}

function newContentPage(
  doc: jsPDF,
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  doc.addPage()
  addPageBackground(
    doc,
    branding,
  )

  return addMiniContinuationHeader(
    doc,
    order,
    branding,
  )
}

function addMaterials(
  doc: jsPDF,
  order: WorkOrder,
  startY: number,
  branding: WorkOrderBranding,
  density: Density,
) {
  let y = sectionTitle(
    doc,
    'Utrošeni materijal',
    startY,
    branding,
  )

  const primary =
    hexToRgb(
      branding.primaryColor,
    )

  const border =
    hexToRgb(
      branding.borderColor,
    )

  function addTableHeader() {
    doc.setFillColor(...primary)

    doc.roundedRect(
      12,
      y,
      186,
      7,
      1.5,
      1.5,
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

    doc.setFontSize(
      density.small,
    )

    doc.text(
      'Materijal',
      16,
      y + 4.7,
    )

    doc.text(
      'Količina',
      129,
      y + 4.7,
      {
        align: 'center',
      },
    )

    doc.text(
      'Cijena',
      171,
      y + 4.7,
      {
        align: 'right',
      },
    )

    doc.text(
      'Ukupno',
      194,
      y + 4.7,
      {
        align: 'right',
      },
    )

    y += 8.3
  }

  addTableHeader()

  if (
    order.materials.length ===
    0
  ) {
    doc.setTextColor(
      100,
      116,
      139,
    )

    doc.setFont(
      'helvetica',
      'normal',
    )

    doc.setFontSize(
      density.body,
    )

    doc.text(
      'Nema evidentiranog materijala.',
      16,
      y + 3.8,
    )

    y += 7
  } else {
    for (
      let index = 0;
      index <
      order.materials.length;
      index += 1
    ) {
      const material =
        order.materials[index]

      if (
        y +
          density.rowHeight >
        250
      ) {
        y = newContentPage(
          doc,
          order,
          branding,
        )

        y = sectionTitle(
          doc,
          'Utrošeni materijal · nastavak',
          y,
          branding,
        )

        addTableHeader()
      }

      if (
        index % 2 === 1
      ) {
        doc.setFillColor(
          249,
          251,
          253,
        )

        doc.rect(
          12,
          y - 1.5,
          186,
          density.rowHeight,
          'F',
        )
      }

      doc.setFont(
        'helvetica',
        'normal',
      )

      doc.setFontSize(
        density.body,
      )

      doc.setTextColor(
        30,
        41,
        59,
      )

      doc.text(
        material.name,
        16,
        y + 2.1,
        {
          maxWidth: 92,
        },
      )

      doc.text(
        `${material.quantity} ${material.unit}`,
        129,
        y + 2.1,
        {
          align: 'center',
        },
      )

      doc.text(
        formatMoney(
          material.unitPrice,
        ),
        171,
        y + 2.1,
        {
          align: 'right',
        },
      )

      doc.text(
        formatMoney(
          material.quantity *
            material.unitPrice,
        ),
        194,
        y + 2.1,
        {
          align: 'right',
        },
      )

      doc.setDrawColor(...border)

      doc.line(
        12,
        y +
          density.rowHeight -
          1.5,
        198,
        y +
          density.rowHeight -
          1.5,
      )

      y += density.rowHeight
    }
  }

  return y
}

function addTotals(
  doc: jsPDF,
  order: WorkOrder,
  y: number,
  branding: WorkOrderBranding,
  density: Density,
) {
  const pageWidth =
    doc.internal.pageSize.getWidth()

  if (y > 235) {
    y = newContentPage(
      doc,
      order,
      branding,
    )
  }

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
      formatMoney(vatValue),
    ],
  ]

  const x = 128

  doc.setFontSize(
    density.body,
  )

  rows.forEach(
    ([label, value]) => {
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
        x,
        y,
      )

      doc.setTextColor(
        30,
        41,
        59,
      )

      doc.text(
        value,
        pageWidth - 14,
        y,
        {
          align: 'right',
        },
      )

      y += 4.6
    },
  )

  doc.setTextColor(
    ...hexToRgb(
      branding.primaryColor,
    ),
  )

  doc.setFont(
    'helvetica',
    'bold',
  )

  doc.setFontSize(
    density.body + 2.8,
  )

  doc.text(
    'UKUPNO',
    x,
    y + 1,
  )

  doc.text(
    formatMoney(
      order.totalPrice,
    ),
    pageWidth - 14,
    y + 1,
    {
      align: 'right',
    },
  )

  y += 8

  if (order.priceNote) {
    doc.setFont(
      'helvetica',
      'normal',
    )

    doc.setFontSize(
      density.small,
    )

    doc.setTextColor(
      100,
      116,
      139,
    )

    const note =
      doc.splitTextToSize(
        `Napomena: ${order.priceNote}`,
        174,
      )

    doc.text(
      note,
      16,
      y,
    )

    y +=
      note.length * 3.4 +
      2
  }

  return y
}

function addSignatures(
  doc: jsPDF,
  order: WorkOrder,
  y: number,
  branding: WorkOrderBranding,
  density: Density,
) {
  const requiredHeight = 43

  if (
    y + requiredHeight >
    274
  ) {
    y = newContentPage(
      doc,
      order,
      branding,
    )
  }

  y = sectionTitle(
    doc,
    'Potpis i ovjera',
    y,
    branding,
  )

  const top = y + 1
  const lineY =
    top + 29

  doc.setDrawColor(
    148,
    163,
    184,
  )

  doc.line(
    18,
    lineY,
    91,
    lineY,
  )

  doc.line(
    119,
    lineY,
    192,
    lineY,
  )

  if (
    branding.showStamp &&
    branding.stamp
  ) {
    safeAddImage(
      doc,
      branding.stamp,
      26,
      top,
      56,
      25,
    )
  }

  if (
    order.investorSignature
  ) {
    safeAddImage(
      doc,
      order.investorSignature,
      128,
      top,
      55,
      23,
    )
  }

  doc.setFontSize(
    density.small,
  )

  doc.setTextColor(
    100,
    116,
    139,
  )

  doc.setFont(
    'helvetica',
    'normal',
  )

  doc.text(
    'Izvođač radova / pečat',
    54.5,
    lineY + 4,
    {
      align: 'center',
    },
  )

  doc.setTextColor(
    30,
    41,
    59,
  )

  doc.setFont(
    'helvetica',
    'bold',
  )

  doc.text(
    order.investorName ||
      'Investitor',
    155.5,
    lineY + 4,
    {
      align: 'center',
    },
  )

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
    'Potpis investitora',
    155.5,
    lineY + 8,
    {
      align: 'center',
    },
  )

  return lineY + 10
}

function addPhotoPages(
  doc: jsPDF,
  order: WorkOrder,
  branding: WorkOrderBranding,
  images: WorkOrderImage[],
) {
  for (
    let index = 0;
    index < images.length;
    index += 4
  ) {
    doc.addPage()
    addPageBackground(
      doc,
      branding,
    )

    let y =
      addMiniContinuationHeader(
        doc,
        order,
        branding,
      )

    y = sectionTitle(
      doc,
      'Fotografije izvedenih radova',
      y,
      branding,
    )

    const group =
      images.slice(
        index,
        index + 4,
      )

    const positions = [
      [12, y + 2],
      [106, y + 2],
      [12, y + 122],
      [106, y + 122],
    ]

    group.forEach(
      (image, imageIndex) => {
        const [
          x,
          photoY,
        ] =
          positions[imageIndex]

        doc.setDrawColor(
          ...hexToRgb(
            branding.borderColor,
          ),
        )

        doc.roundedRect(
          x,
          photoY,
          92,
          112,
          2,
          2,
          'S',
        )

        safeAddImage(
          doc,
          image.dataUrl,
          x + 2,
          photoY + 2,
          88,
          103,
        )

        doc.setFontSize(6.5)

        doc.setTextColor(
          100,
          116,
          139,
        )

        doc.text(
          image.name ||
            `Fotografija ${
              index +
              imageIndex +
              1
            }`,
          x + 3,
          photoY + 109,
          {
            maxWidth: 85,
          },
        )
      },
    )
  }
}

function addFooters(
  doc: jsPDF,
  branding: WorkOrderBranding,
) {
  const totalPages =
    doc.getNumberOfPages()

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    doc.setPage(page)

    const pageWidth =
      doc.internal.pageSize.getWidth()

    const pageHeight =
      doc.internal.pageSize.getHeight()

    doc.setDrawColor(
      220,
      226,
      234,
    )

    doc.line(
      12,
      pageHeight - 12,
      pageWidth - 12,
      pageHeight - 12,
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
      12,
      pageHeight - 7,
      {
        maxWidth: 140,
      },
    )

    doc.text(
      `Stranica ${page} / ${totalPages}`,
      pageWidth - 12,
      pageHeight - 7,
      {
        align: 'right',
      },
    )
  }
}

export function createWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc = new jsPDF({
    orientation:
      'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  })

  const density =
    getDensity(order)

  addPageBackground(
    doc,
    branding,
  )

  let y =
    addHeader(
      doc,
      order,
      branding,
    )

  y = addInfoBlock(
    doc,
    order,
    y,
    branding,
    density,
  )

  y += density.sectionGap

  y = addDescription(
    doc,
    order,
    y,
    branding,
    density,
  )

  y += density.sectionGap

  if (y > 228) {
    y = newContentPage(
      doc,
      order,
      branding,
    )
  }

  y = addMaterials(
    doc,
    order,
    y,
    branding,
    density,
  )

  y += 5

  y = addTotals(
    doc,
    order,
    y,
    branding,
    density,
  )

  y += 2

  addSignatures(
    doc,
    order,
    y,
    branding,
    density,
  )

  if (
    order.images.length > 0
  ) {
    addPhotoPages(
      doc,
      order,
      branding,
      order.images,
    )
  }

  addFooters(
    doc,
    branding,
  )

  return doc
}

export function getWorkOrderPdfBlobUrl(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    createWorkOrderPdf(
      order,
      branding,
    )

  return doc.output(
    'bloburl',
  )
}

export function downloadWorkOrderPdf(
  order: WorkOrder,
  branding: WorkOrderBranding,
) {
  const doc =
    createWorkOrderPdf(
      order,
      branding,
    )

  doc.save(
    `${order.orderNumber}-${order.customerName}.pdf`,
  )
}
