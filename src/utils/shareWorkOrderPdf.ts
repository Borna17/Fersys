import { Capacitor } from '@capacitor/core'
import {
  Directory,
  Filesystem,
} from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

import type { CloudWorkOrder } from '../services/workOrders.service'
import type { WorkOrderBranding } from '../services/workOrderBranding.service'
import {
  downloadWorkOrderPdf,
  getWorkOrderPdfBlob,
} from './workOrderPdf'

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-') ||
    'radni-nalog'
  )
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)

  let binary = ''
  const chunkSize = 0x8000

  for (
    let index = 0;
    index < bytes.length;
    index += chunkSize
  ) {
    const chunk = bytes.subarray(
      index,
      Math.min(index + chunkSize, bytes.length),
    )

    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export async function shareWorkOrderPdf(
  order: CloudWorkOrder,
  branding: WorkOrderBranding,
) {
  const fileName =
    `${safeFileName(order.orderNumber)}.pdf`

  const title =
    `Radni nalog ${order.orderNumber}`

  const text = [
    title,
    order.customerName,
    order.title,
  ]
    .filter(Boolean)
    .join(' · ')

  const blob =
    await getWorkOrderPdfBlob(
      order,
      branding,
    )

  if (Capacitor.isNativePlatform()) {
    const base64 =
      await blobToBase64(blob)

    const path =
      `fersys-share/${fileName}`

    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Cache,
      recursive: true,
    })

    const { uri } =
      await Filesystem.getUri({
        path,
        directory: Directory.Cache,
      })

    await Share.share({
      title,
      text,
      files: [uri],
      dialogTitle:
        'Dijeli radni nalog',
    })

    return
  }

  const file = new File(
    [blob],
    fileName,
    {
      type: 'application/pdf',
    },
  )

  if (
    navigator.share &&
    (!navigator.canShare ||
      navigator.canShare({
        files: [file],
      }))
  ) {
    await navigator.share({
      title,
      text,
      files: [file],
    })

    return
  }

  await downloadWorkOrderPdf(
    order,
    branding,
  )

  throw new Error(
    'Ovaj preglednik ne podržava izravno dijeljenje PDF-a. PDF je preuzet pa ga možete poslati ručno.',
  )
}
