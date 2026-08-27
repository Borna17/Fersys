import fs from 'node:fs'

const file = 'src/pages/CustomerProfilePage.tsx'
let source = fs.readFileSync(file, 'utf8')
const original = source

function mustReplace(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Nije pronađen očekivani dio koda: ${label}`)
  }
  source = source.replace(search, replacement)
}

// 1) Ikone
mustReplace(
  `  Edit3,\n  FileText,\n  Image,`,
  `  Edit3,\n  FileText,\n  Download,\n  Share2,\n  CheckSquare2,\n  Square,\n  Image,`,
  'lucide ikone',
)

// 2) State za višestruki odabir
mustReplace(
  `  const [\n    previewPhoto,\n    setPreviewPhoto,\n  ] = useState<CustomerPhoto | null>(\n    null,\n  )\n`,
  `  const [\n    previewPhoto,\n    setPreviewPhoto,\n  ] = useState<CustomerPhoto | null>(\n    null,\n  )\n  const [selectedPhotoIds, setSelectedPhotoIds] =\n    useState<string[]>([])\n  const [photoActionBusy, setPhotoActionBusy] =\n    useState(false)\n`,
  'photo selection state',
)

// 3) Akcije za odabir / download / share
const functionAnchor = `  if (isLoading) {\n`
if (!source.includes(functionAnchor)) {
  throw new Error('Nije pronađena pozicija za photo action funkcije.')
}

const helpers = `  function togglePhotoSelection(photoId: string) {\n    setSelectedPhotoIds((current) =>\n      current.includes(photoId)\n        ? current.filter((id) => id !== photoId)\n        : [...current, photoId],\n    )\n  }\n\n  function clearPhotoSelection() {\n    setSelectedPhotoIds([])\n  }\n\n  function selectAllPhotos() {\n    setSelectedPhotoIds(customerPhotos.map((photo) => photo.id))\n  }\n\n  function selectedPhotos() {\n    const selected = new Set(selectedPhotoIds)\n    return customerPhotos.filter((photo) => selected.has(photo.id))\n  }\n\n  async function photoToFile(photo: CustomerPhoto) {\n    const response = await fetch(photo.url)\n    if (!response.ok) {\n      throw new Error(\`Fotografiju „\${photo.fileName}” nije moguće preuzeti.\`)\n    }\n\n    const blob = await response.blob()\n    return new File([blob], photo.fileName || \`fersys-fotografija-\${photo.id}.jpg\`, {\n      type: blob.type || photo.mimeType || 'image/jpeg',\n    })\n  }\n\n  async function handleDownloadSelectedPhotos() {\n    const photos = selectedPhotos()\n    if (!photos.length || photoActionBusy) return\n\n    try {\n      setPhotoActionBusy(true)\n\n      for (const photo of photos) {\n        const response = await fetch(photo.url)\n        if (!response.ok) {\n          throw new Error(\`Fotografiju „\${photo.fileName}” nije moguće preuzeti.\`)\n        }\n\n        const blob = await response.blob()\n        const objectUrl = URL.createObjectURL(blob)\n        const anchor = document.createElement('a')\n        anchor.href = objectUrl\n        anchor.download = photo.fileName || \`fersys-fotografija-\${photo.id}.jpg\`\n        document.body.appendChild(anchor)\n        anchor.click()\n        anchor.remove()\n        URL.revokeObjectURL(objectUrl)\n\n        await new Promise((resolve) => window.setTimeout(resolve, 120))\n      }\n    } catch (error) {\n      window.alert(\n        error instanceof Error\n          ? error.message\n          : 'Odabrane fotografije nije moguće preuzeti.',\n      )\n    } finally {\n      setPhotoActionBusy(false)\n    }\n  }\n\n  async function handleShareSelectedPhotos() {\n    const photos = selectedPhotos()\n    if (!photos.length || photoActionBusy) return\n\n    try {\n      setPhotoActionBusy(true)\n      const files = await Promise.all(photos.map(photoToFile))\n\n      if (navigator.share) {\n        const shareData: ShareData = {\n          title: customer ? \`FERSYS fotografije – \${customer.name}\` : 'FERSYS fotografije',\n          text: customer ? \`Fotografije investitora \${customer.name}\` : 'FERSYS fotografije',\n          files,\n        }\n\n        if (!navigator.canShare || navigator.canShare(shareData)) {\n          await navigator.share(shareData)\n          return\n        }\n      }\n\n      window.alert(\n        'Ovaj uređaj/preglednik ne podržava izravno dijeljenje više fotografija. Fotografije će se umjesto toga preuzeti pa ih možeš priložiti u WhatsApp, Viber ili e-mail.',\n      )\n      await handleDownloadSelectedPhotos()\n    } catch (error) {\n      if (error instanceof DOMException && error.name === 'AbortError') {\n        return\n      }\n\n      window.alert(\n        error instanceof Error\n          ? error.message\n          : 'Odabrane fotografije nije moguće podijeliti.',\n      )\n    } finally {\n      setPhotoActionBusy(false)\n    }\n  }\n\n`

source = source.replace(functionAnchor, helpers + functionAnchor)

// 4) Zamijeni cijeli postojeći photos tab, tako nema ovisnosti o sitnim promjenama markup-a.
const startMarker = `        {activeTab === 'photos' && (`
const endMarker = `        {activeTab === 'notes' && (`
const start = source.indexOf(startMarker)
const end = source.indexOf(endMarker)

if (start === -1 || end === -1 || end <= start) {
  throw new Error('Nije pronađen kompletan Fotografije tab za zamjenu.')
}

const photosBlock = `        {activeTab === 'photos' && (\n          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 sm:p-6">\n            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">\n              <div className="flex items-center gap-3">\n                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/10 text-blue-300">\n                  <Image size={21} />\n                </span>\n                <div>\n                  <h2 className="text-lg font-black text-white">Fotografije</h2>\n                  <p className="mt-1 text-xs text-slate-400">\n                    Objekt, radovi i dokumentacija. Označi više slika za preuzimanje ili dijeljenje.\n                  </p>\n                </div>\n              </div>\n\n              <label\n                className={\`inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 font-black text-white \${\n                  photosUploading ? 'pointer-events-none opacity-60' : ''\n                }\`}\n              >\n                {photosUploading ? (\n                  <Loader2 size={18} className="animate-spin" />\n                ) : (\n                  <ImagePlus size={18} />\n                )}\n                {photosUploading ? 'Spremanje...' : 'Dodaj fotografije'}\n                <input\n                  type="file"\n                  accept="image/jpeg,image/png,image/webp"\n                  multiple\n                  onChange={(event) => void handleCustomerPhotoUpload(event)}\n                  className="hidden"\n                />\n              </label>\n            </div>\n\n            {customerPhotos.length > 0 && (\n              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">\n                <button\n                  type="button"\n                  onClick={\n                    selectedPhotoIds.length === customerPhotos.length\n                      ? clearPhotoSelection\n                      : selectAllPhotos\n                  }\n                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"\n                >\n                  {selectedPhotoIds.length === customerPhotos.length ? (\n                    <CheckSquare2 size={16} />\n                  ) : (\n                    <Square size={16} />\n                  )}\n                  {selectedPhotoIds.length === customerPhotos.length\n                    ? 'Poništi sve'\n                    : 'Odaberi sve'}\n                </button>\n\n                <span className="mr-auto text-xs font-black text-slate-400">\n                  Odabrano: {selectedPhotoIds.length}\n                </span>\n\n                <button\n                  type="button"\n                  disabled={!selectedPhotoIds.length || photoActionBusy}\n                  onClick={() => void handleDownloadSelectedPhotos()}\n                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-800 px-3 text-xs font-black text-white disabled:opacity-40"\n                >\n                  {photoActionBusy ? (\n                    <Loader2 size={16} className="animate-spin" />\n                  ) : (\n                    <Download size={16} />\n                  )}\n                  Preuzmi odabrane\n                </button>\n\n                <button\n                  type="button"\n                  disabled={!selectedPhotoIds.length || photoActionBusy}\n                  onClick={() => void handleShareSelectedPhotos()}\n                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-40"\n                >\n                  <Share2 size={16} />\n                  Podijeli odabrane\n                </button>\n              </div>\n            )}\n\n            {photosError && (\n              <div className="mt-4 rounded-2xl bg-red-500/10 p-3 text-sm text-red-300">\n                {photosError}\n              </div>\n            )}\n\n            {photosLoading ? (\n              <div className="grid min-h-52 place-items-center">\n                <Loader2 size={28} className="animate-spin text-blue-400" />\n              </div>\n            ) : customerPhotos.length === 0 ? (\n              <EmptyState\n                icon={<Image size={25} />}\n                title="Nema fotografija"\n                text="Dodaj fotografije objekta, radova ili dokumentacije."\n              />\n            ) : (\n              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">\n                {customerPhotos.map((photo) => {\n                  const selected = selectedPhotoIds.includes(photo.id)\n\n                  return (\n                    <article\n                      key={photo.id}\n                      className={\`relative overflow-hidden rounded-2xl border bg-slate-950 transition \${\n                        selected\n                          ? 'border-blue-500 ring-2 ring-blue-500/25'\n                          : 'border-slate-800'\n                      }\`}\n                    >\n                      <button\n                        type="button"\n                        onClick={() => togglePhotoSelection(photo.id)}\n                        className={\`absolute left-2 top-2 z-10 grid h-9 w-9 place-items-center rounded-xl border backdrop-blur \${\n                          selected\n                            ? 'border-blue-400 bg-blue-600 text-white'\n                            : 'border-white/20 bg-slate-950/75 text-white'\n                        }\`}\n                        aria-label={selected ? 'Poništi odabir fotografije' : 'Odaberi fotografiju'}\n                      >\n                        {selected ? <CheckSquare2 size={18} /> : <Square size={18} />}\n                      </button>\n\n                      <button\n                        type="button"\n                        onClick={() => setPreviewPhoto(photo)}\n                        className="block aspect-[4/3] w-full"\n                      >\n                        <img\n                          src={photo.url}\n                          alt={photo.fileName}\n                          loading="lazy"\n                          className="h-full w-full object-cover"\n                        />\n                      </button>\n\n                      <div className="flex items-center gap-2 p-3">\n                        <p className="min-w-0 flex-1 truncate text-xs font-black text-white">\n                          {photo.fileName}\n                        </p>\n\n                        <button\n                          type="button"\n                          onClick={() => void handleDeletePhoto(photo)}\n                          disabled={photoDeletingId === photo.id}\n                          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-red-500/10 text-red-300 disabled:opacity-50"\n                        >\n                          {photoDeletingId === photo.id ? (\n                            <Loader2 size={15} className="animate-spin" />\n                          ) : (\n                            <Trash2 size={15} />\n                          )}\n                        </button>\n                      </div>\n                    </article>\n                  )\n                })}\n              </div>\n            )}\n          </section>\n        )}\n\n`

source = source.slice(0, start) + photosBlock + source.slice(end)

// 5) Konačna provjera - skripta NE SMIJE javiti uspjeh bez ovih oznaka.
const required = [
  'Preuzmi odabrane',
  'Podijeli odabrane',
  'Odaberi sve',
  'selectedPhotoIds',
  'handleShareSelectedPhotos',
  'handleDownloadSelectedPhotos',
]

for (const marker of required) {
  if (!source.includes(marker)) {
    throw new Error(`Provjera nije prošla: nedostaje „${marker}”.`)
  }
}

if (source === original) {
  throw new Error('Datoteka nije promijenjena.')
}

fs.writeFileSync(file, source, 'utf8')

const verify = fs.readFileSync(file, 'utf8')
for (const marker of required) {
  if (!verify.includes(marker)) {
    throw new Error(`Provjera nakon spremanja nije prošla: „${marker}”.`)
  }
}

console.log('POTVRĐENO: Investitori > Fotografije sada ima višestruki odabir, Preuzmi odabrane i Podijeli odabrane.')
console.log('POTVRĐENO: promijenjen je src/pages/CustomerProfilePage.tsx, a ne samo pomoćna skripta.')
