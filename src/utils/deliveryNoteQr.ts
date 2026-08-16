import QRCode from 'qrcode'
import {
  jsPDF,
} from 'jspdf'
import type {
  InventoryItem,
} from './inventoryStorage'
import {
  saveBlobDownload,
  notifyDownloadPreparing,
  notifyDownloadError,
} from './downloadFeedback'

export async function downloadInventoryQrLabels(
  items:
    InventoryItem[],
  sourceLabel =
    'Otpremnica',
) {
  if (!items.length) {
    throw new Error(
      'Nema novih artikala za QR naljepnice.',
    )
  }

  const fileName =
    `QR-artikli-${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`

  notifyDownloadPreparing(
    fileName,
  )

  try {
    const pdf =
      new jsPDF({
        unit: 'mm',
        format: 'a4',
      })

    const labelWidth =
      63
    const labelHeight =
      42
    const gapX = 4
    const gapY = 4
    const startX = 7
    const startY = 8

    for (
      let index = 0;
      index <
      items.length;
      index += 1
    ) {
      if (
        index > 0 &&
        index % 18 === 0
      ) {
        pdf.addPage()
      }

      const localIndex =
        index % 18
      const column =
        localIndex % 3
      const row =
        Math.floor(
          localIndex / 3,
        )

      const x =
        startX +
        column *
          (
            labelWidth +
            gapX
          )

      const y =
        startY +
        row *
          (
            labelHeight +
            gapY
          )

      const qr =
        await QRCode.toDataURL(
          items[index]
            .qrValue,
          {
            width: 300,
            margin: 1,
            errorCorrectionLevel:
              'M',
          },
        )

      pdf.setDrawColor(
        205,
        213,
        225,
      )
      pdf.roundedRect(
        x,
        y,
        labelWidth,
        labelHeight,
        2,
        2,
      )

      pdf.addImage(
        qr,
        'PNG',
        x + 3,
        y + 3,
        28,
        28,
      )

      pdf.setFont(
        'helvetica',
        'bold',
      )
      pdf.setFontSize(
        9,
      )
      pdf.text(
        items[index]
          .name.slice(
            0,
            30,
          ),
        x + 34,
        y + 8,
        {
          maxWidth:
            26,
        },
      )

      pdf.setFont(
        'helvetica',
        'normal',
      )
      pdf.setFontSize(
        7,
      )

      pdf.text(
        items[index]
          .code ||
          'Bez šifre',
        x + 34,
        y + 23,
        {
          maxWidth:
            26,
        },
      )

      pdf.text(
        `${sourceLabel} · ${items[index].unit}`,
        x + 34,
        y + 29,
        {
          maxWidth:
            26,
        },
      )

      pdf.setFontSize(
        6,
      )
      pdf.setTextColor(
        100,
        116,
        139,
      )
      pdf.text(
        'FERSYS',
        x + 34,
        y + 36,
      )
      pdf.setTextColor(
        0,
        0,
        0,
      )
    }

    saveBlobDownload(
      pdf.output(
        'blob',
      ),
      fileName,
    )
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'QR naljepnice nije moguće izraditi.'

    notifyDownloadError(
      message,
      fileName,
    )

    throw error
  }
}
