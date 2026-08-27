import fs from 'node:fs'

const file = 'src/pages/CustomerProfilePage.tsx'
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Nije pronađen očekivani dio za: ${label}`)
  }
  source = source.replace(search, replacement)
}

if (source.includes('FERSYS_CUSTOMER_PHOTO_ACTIONS_V1')) {
  console.log('Galerija već sadrži download/share nadogradnju.')
  process.exit(0)
}

replaceOnce(
`import {
  useNavigate,
  useParams,
} from 'react-router'
`,
`import {
  useNavigate,
  useParams,
} from 'react-router'
import { Capacitor } from '@capacitor/core'
import {
  Directory,
  Filesystem,
} from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
`,
'Capacitor importi',
)

replaceOnce(
`  CalendarDays,
  ChevronRight,
  ClipboardList,
  Edit3,
`,
`  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Download,
  Edit3,
`,
'ikone 1',
)

replaceOnce(
`  Save,
  Trash2,
`,
`  Save,
  Share2,
  Trash2,
`,
'ikone 2',
)

replaceOnce(
`  const [
    previewPhoto,
    setPreviewPhoto,
  ] = useState<CustomerPhoto | null>(
    null,
  )

  const [activeTab, setActiveTab] =
`,
`  const [
    previewPhoto,
    setPreviewPhoto,
  ] = useState<CustomerPhoto | null>(
    null,
  )
  // FERSYS_CUSTOMER_PHOTO_ACTIONS_V1
  const [
    selectedPhotoIds,
    setSelectedPhotoIds,
  ] = useState<string[]>([])
  const [
    photoActionBusy,
    setPhotoActionBusy,
  ] = useState<'download' | 'share' | ''>('')

  const [activeTab, setActiveTab] =
`,
'stanje označenih fotografija',
)

replaceOnce(
`      if (
        previewPhoto?.id ===
        photo.id
      ) {
        setPreviewPhoto(null)
      }
`,
`      setSelectedPhotoIds((current) =>
        current.filter((id) => id !== photo.id),
      )

      if (
        previewPhoto?.id ===
        photo.id
      ) {
        setPreviewPhoto(null)
      }
`,
'brisanje označene fotografije',
)

replaceOnce(
`  if (isLoading) {
`,
`  function togglePhotoSelection(
    photoId: string,
  ) {
    setSelectedPhotoIds((current) =>
      current.includes(photoId)
        ? current.filter((id) => id !== photoId)
        : [...current, photoId],
    )
  }

  function toggleAllPhotos() {
    setSelectedPhotoIds((current) =>
      current.length === customerPhotos.length
        ? []
        : customerPhotos.map((photo) => photo.id),
    )
  }

  function selectedPhotos() {
    const selected = new Set(selectedPhotoIds)
    return customerPhotos.filter((photo) =>
      selected.has(photo.id),
    )
  }

  async function photoBlob(
    photo: CustomerPhoto,
  ) {
    const response = await fetch(photo.url)

    if (!response.ok) {
      throw new Error(
        `Fotografiju „${photo.fileName}” nije moguće preuzeti.`,
      )
    }

    return response.blob()
  }

  async function blobToBase64(
    blob: Blob,
  ) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const value = String(reader.result ?? '')
        resolve(value.includes(',') ? value.split(',')[1] : value)
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    })
  }

  function safePhotoFileName(value: string) {
    return (
      value
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-') ||
      `fotografija-${Date.now()}.jpg`
    )
  }

  async function handleDownloadSelectedPhotos() {
    const photos = selectedPhotos()
    if (!photos.length || photoActionBusy) return

    try {
      setPhotoActionBusy('download')

      if (Capacitor.isNativePlatform()) {
        const folder = `FERSYS/Fotografije/${safePhotoFileName(customer.name)}`

        try {
          await Filesystem.mkdir({
            path: folder,
            directory: Directory.Documents,
            recursive: true,
          })
        } catch {
          // Mapa možda već postoji.
        }

        for (const photo of photos) {
          const blob = await photoBlob(photo)
          const data = await blobToBase64(blob)
          await Filesystem.writeFile({
            path: `${folder}/${safePhotoFileName(photo.fileName)}`,
            data,
            directory: Directory.Documents,
          })
        }

        window.alert(
          photos.length === 1
            ? 'Fotografija je spremljena u FERSYS/Fotografije.'
            : `${photos.length} fotografija spremljeno je u FERSYS/Fotografije.`,
        )
      } else {
        for (const photo of photos) {
          const blob = await photoBlob(photo)
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = safePhotoFileName(photo.fileName)
          document.body.appendChild(link)
          link.click()
          link.remove()
          window.setTimeout(() => URL.revokeObjectURL(url), 3000)
          await new Promise((resolve) => window.setTimeout(resolve, 120))
        }
      }
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : 'Odabrane fotografije nije moguće preuzeti.',
      )
    } finally {
      setPhotoActionBusy('')
    }
  }

  async function handleShareSelectedPhotos() {
    const photos = selectedPhotos()
    if (!photos.length || photoActionBusy) return

    try {
      setPhotoActionBusy('share')

      if (Capacitor.isNativePlatform()) {
        const shareFolder = `fersys-share/${crypto.randomUUID()}`
        await Filesystem.mkdir({
          path: shareFolder,
          directory: Directory.Cache,
          recursive: true,
        })

        const uris: string[] = []

        for (const photo of photos) {
          const blob = await photoBlob(photo)
          const data = await blobToBase64(blob)
          const path = `${shareFolder}/${safePhotoFileName(photo.fileName)}`

          await Filesystem.writeFile({
            path,
            data,
            directory: Directory.Cache,
          })

          const uri = await Filesystem.getUri({
            path,
            directory: Directory.Cache,
          })
          uris.push(uri.uri)
        }

        await Share.share({
          title: `FERSYS · ${customer.name}`,
          text:
            photos.length === 1
              ? 'Fotografija iz FERSYS-a'
              : `${photos.length} fotografija iz FERSYS-a`,
          files: uris,
          dialogTitle: 'Podijeli fotografije',
        })
        return
      }

      const files = await Promise.all(
        photos.map(async (photo) => {
          const blob = await photoBlob(photo)
          return new File(
            [blob],
            safePhotoFileName(photo.fileName),
            {
              type:
                blob.type ||
                photo.mimeType ||
                'image/jpeg',
            },
          )
        }),
      )

      if (
        typeof navigator.share === 'function' &&
        (!navigator.canShare || navigator.canShare({ files }))
      ) {
        await navigator.share({
          title: `FERSYS · ${customer.name}`,
          text:
            files.length === 1
              ? 'Fotografija iz FERSYS-a'
              : `${files.length} fotografija iz FERSYS-a`,
          files,
        })
      } else {
        window.alert(
          'Ovaj preglednik ne podržava izravno dijeljenje više fotografija. Upotrijebi „Preuzmi” ili otvori FERSYS na telefonu.',
        )
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return
      }

      window.alert(
        error instanceof Error
          ? error.message
          : 'Odabrane fotografije nije moguće podijeliti.',
      )
    } finally {
      setPhotoActionBusy('')
    }
  }

  if (isLoading) {
`,
'funkcije preuzimanja i dijeljenja',
)

replaceOnce(
`            {photosError && (
`,
`            {customerPhotos.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <button
                  type="button"
                  onClick={toggleAllPhotos}
                  disabled={Boolean(photoActionBusy)}
                  className="min-h-10 rounded-xl bg-slate-800 px-3 text-xs font-black text-white disabled:opacity-50"
                >
                  {selectedPhotoIds.length === customerPhotos.length
                    ? 'Poništi sve'
                    : 'Odaberi sve'}
                </button>

                <span className="mr-auto text-xs font-bold text-slate-400">
                  Odabrano: {selectedPhotoIds.length}
                </span>

                <button
                  type="button"
                  onClick={() => void handleDownloadSelectedPhotos()}
                  disabled={!selectedPhotoIds.length || Boolean(photoActionBusy)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white disabled:opacity-40"
                >
                  {photoActionBusy === 'download' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Download size={15} />
                  )}
                  Preuzmi
                </button>

                <button
                  type="button"
                  onClick={() => void handleShareSelectedPhotos()}
                  disabled={!selectedPhotoIds.length || Boolean(photoActionBusy)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-40"
                >
                  {photoActionBusy === 'share' ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Share2 size={15} />
                  )}
                  Podijeli
                </button>
              </div>
            )}

            {photosError && (
`,
'alatna traka galerije',
)

replaceOnce(
`                    <article
                      key={photo.id}
                      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"
                    >
                      <button
`,
`                    <article
                      key={photo.id}
                      className={\`relative overflow-hidden rounded-2xl border bg-slate-950 transition \${
                        selectedPhotoIds.includes(photo.id)
                          ? 'border-blue-500 ring-2 ring-blue-500/30'
                          : 'border-slate-800'
                      }\`}
                    >
                      <button
                        type="button"
                        onClick={() => togglePhotoSelection(photo.id)}
                        aria-label={
                          selectedPhotoIds.includes(photo.id)
                            ? 'Poništi odabir fotografije'
                            : 'Odaberi fotografiju'
                        }
                        className={\`absolute left-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-xl border shadow-lg backdrop-blur \${
                          selectedPhotoIds.includes(photo.id)
                            ? 'border-blue-400 bg-blue-600 text-white'
                            : 'border-white/20 bg-slate-950/75 text-white'
                        }\`}
                      >
                        {selectedPhotoIds.includes(photo.id) ? (
                          <Check size={17} />
                        ) : (
                          <span className="h-3.5 w-3.5 rounded border-2 border-current" />
                        )}
                      </button>

                      <button
`,
'checkbox na fotografiji',
)

fs.writeFileSync(file, source)

const verify = fs.readFileSync(file, 'utf8')
const required = [
  'FERSYS_CUSTOMER_PHOTO_ACTIONS_V1',
  'handleDownloadSelectedPhotos',
  'handleShareSelectedPhotos',
  'Share.share({',
  'Filesystem.writeFile({',
  'Odabrano: {selectedPhotoIds.length}',
]

for (const marker of required) {
  if (!verify.includes(marker)) {
    throw new Error(`Provjera nije prošla: nedostaje ${marker}`)
  }
}

console.log('POTVRĐENO: galerija investitora sada podržava višestruki odabir, preuzimanje i dijeljenje fotografija.')
