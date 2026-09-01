import { Capacitor } from '@capacitor/core'

export type DownloadFeedbackDetail = {
  fileName?: string
  openUrl?: string
  message?: string
}

function emit(
  type:
    | 'fersys:download-preparing'
    | 'fersys:download-complete'
    | 'fersys:download-error',
  detail:
    DownloadFeedbackDetail,
) {
  window.dispatchEvent(
    new CustomEvent(
      type,
      {
        detail,
      },
    ),
  )
}

export function notifyDownloadPreparing(
  fileName?: string,
) {
  emit(
    'fersys:download-preparing',
    {
      fileName,
    },
  )
}

export function notifyDownloadError(
  message:
    string,
  fileName?: string,
) {
  emit(
    'fersys:download-error',
    {
      fileName,
      message,
    },
  )
}

/**
 * Pokreće browser download iz već pripremljenog Blob-a,
 * a FERSYS-u ostavlja privremeni blob URL kako bi korisnik
 * iz toast poruke mogao odmah otvoriti dokument.
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Datoteku nije moguće pripremiti.'))
        return
      }

      const comma = reader.result.indexOf(',')
      resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result)
    }

    reader.onerror = () =>
      reject(new Error('Datoteku nije moguće pripremiti.'))

    reader.readAsDataURL(blob)
  })
}

async function saveNativeBlobDownload(
  blob: Blob,
  fileName: string,
) {
  try {
    const [{ Filesystem, Directory }, { Share }] =
      await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ])

    const data = await blobToBase64(blob)
    const result = await Filesystem.writeFile({
      path: fileName,
      data,
      directory: Directory.Cache,
      recursive: true,
    })

    emit('fersys:download-complete', {
      fileName,
      message:
        'Dokument je spreman. Odaberi aplikaciju za otvaranje ili spremanje.',
    })

    await Share.share({
      title: fileName,
      text: 'FERSYS dokument',
      files: [result.uri],
      dialogTitle: 'Otvori ili spremi dokument',
    })

    return result.uri
  } catch (error) {
    console.error('[FERSYS] Native download nije uspio:', error)
    notifyDownloadError(
      error instanceof Error
        ? error.message
        : 'Dokument nije moguće otvoriti ili spremiti na uređaj.',
      fileName,
    )
    return ''
  }
}

/**
 * Web koristi standardni browser download. Android/iOS koriste native
 * Filesystem + Share jer WebView ne preuzima blob URL pouzdano.
 */
export function saveBlobDownload(
  blob: Blob,
  fileName: string,
) {
  if (Capacitor.isNativePlatform()) {
    void saveNativeBlobDownload(blob, fileName)
    return ''
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  anchor.dataset.fersysSkipDownloadFeedback = 'true'

  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  emit('fersys:download-complete', {
    fileName,
    openUrl: url,
  })

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 90_000)

  return url
}
