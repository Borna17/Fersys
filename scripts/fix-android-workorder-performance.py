from pathlib import Path

# Native-safe downloads
p = Path('src/utils/downloadFeedback.ts')
s = p.read_text(encoding='utf-8-sig')
if "from '@capacitor/core'" not in s:
    s = "import { Capacitor } from '@capacitor/core'\n\n" + s

start = s.index('export function saveBlobDownload(')
replacement = '''function blobToBase64(blob: Blob): Promise<string> {
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
'''
s = s[:start] + replacement
p.write_text(s, encoding='utf-8')

# Long PDF feedback should reassure instead of looking broken
p = Path('src/components/DownloadFeedbackCenter.tsx')
s = p.read_text(encoding='utf-8-sig')
old = """        () => {
          clearButton()

          setState({
            status:
              'warning',
            title:
              'Izrada traje dulje nego inače',
            message:
              'Dokument nije završen. Možeš pokušati ponovno.',
          })

          dismissTimer.current =
            window.setTimeout(
              () => {
                setState(null)
              },
              WARNING_TIMEOUT_MS,
            )
        },"""
new = """        () => {
          setState((current) => ({
            status: 'preparing',
            title: 'Veći dokument – još ga pripremam...',
            message:
              'Radni nalog s više stavki ili fotografija može potrajati malo duže. Ne zatvaraj aplikaciju – FERSYS i dalje radi.',
            fileName: current?.fileName,
          }))
        },"""
if old not in s:
    raise SystemExit('Download slow-warning block not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

# Work order mobile UX/performance
p = Path('src/pages/NewWorkOrderPage.tsx')
s = p.read_text(encoding='utf-8-sig')
for bad in ('Količina', 'KoliÄina', 'Kolaina'):
    s = s.replace(bad, 'Kolicina')

s = s.replace(
    "await fileToCompressedDataUrl(\n                    file,\n                  )",
    "await fileToCompressedDataUrl(\n                    file,\n                    1280,\n                    1280,\n                    0.72,\n                  )",
)

main_return = """  return (
    <>
      <form"""
saving = """  if (isSaving) {
    const isLargeWorkOrder =
      images.length >= 4 ||
      materials.length >= 8 ||
      description.length >= 1500

    return (
      <FersysLoader
        text={
          isLargeWorkOrder
            ? 'Spremanje većeg radnog naloga... Ima više podataka ili fotografija pa može potrajati malo duže. Ne zatvaraj aplikaciju.'
            : 'Spremanje radnog naloga...'
        }
      />
    )
  }

"""
if saving.strip() not in s:
    if main_return not in s:
        raise SystemExit('Main work-order return marker not found')
    s = s.replace(main_return, saving + main_return, 1)

p.write_text(s, encoding='utf-8')
