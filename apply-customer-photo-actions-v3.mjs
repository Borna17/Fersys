import fs from 'node:fs'

const path = 'src/pages/CustomerProfilePage.tsx'
let source = fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')

function fail(message) {
  throw new Error(message)
}

// Idempotency: if the actual page already contains all required actions, stop successfully.
const alreadyDone =
  source.includes('Preuzmi odabrane') &&
  source.includes('Podijeli odabrane') &&
  source.includes('selectedPhotoIds')

if (!alreadyDone) {
  const stateAnchor = `  const [\n    previewPhoto,\n    setPreviewPhoto,\n  ] = useState<CustomerPhoto | null>(\n    null,\n  )\n`

  if (!source.includes(stateAnchor)) {
    fail('Nije pronađen stvarni state previewPhoto u CustomerProfilePage.tsx.')
  }

  source = source.replace(
    stateAnchor,
    `${stateAnchor}\n  const [\n    selectedPhotoIds,\n    setSelectedPhotoIds,\n  ] = useState<string[]>([])\n  const [\n    photoActionBusy,\n    setPhotoActionBusy,\n  ] = useState(false)\n`,
  )

  const functionAnchor = `  async function handleDeletePhoto(\n    photo: CustomerPhoto,\n  ) {`

  if (!source.includes(functionAnchor)) {
    fail('Nije pronađen handleDeletePhoto u CustomerProfilePage.tsx.')
  }

  const helpers = `  function togglePhotoSelection(\n    photoId: string,\n  ) {\n    setSelectedPhotoIds((current) =>\n      current.includes(photoId)\n        ? current.filter((id) => id !== photoId)\n        : [...current, photoId],\n    )\n  }\n\n  function clearPhotoSelection() {\n    setSelectedPhotoIds([])\n  }\n\n  function toggleSelectAllPhotos() {\n    setSelectedPhotoIds((current) =>\n      current.length === customerPhotos.length\n        ? []\n        : customerPhotos.map((photo) => photo.id),\n    )\n  }\n\n  const selectedPhotos = customerPhotos.filter((photo) =>\n    selectedPhotoIds.includes(photo.id),\n  )\n\n  async function photoToFile(photo: CustomerPhoto) {\n    const response = await fetch(photo.url)\n\n    if (!response.ok) {\n      throw new Error(\n        \`Fotografiju „\${photo.fileName}” nije moguće dohvatiti.\`,\n      )\n    }\n\n    const blob = await response.blob()\n    const type = blob.type || photo.mimeType || 'image/jpeg'\n\n    return new File(\n      [blob],\n      photo.fileName || \`fotografija-\${photo.id}.jpg\`,\n      { type },\n    )\n  }\n\n  async function handleDownloadSelectedPhotos() {\n    if (!selectedPhotos.length || photoActionBusy) return\n\n    try {\n      setPhotoActionBusy(true)\n\n      for (const photo of selectedPhotos) {\n        const response = await fetch(photo.url)\n        if (!response.ok) {\n          throw new Error(\n            \`Fotografiju „\${photo.fileName}” nije moguće preuzeti.\`,\n          )\n        }\n\n        const blob = await response.blob()\n        const objectUrl = URL.createObjectURL(blob)\n        const link = document.createElement('a')\n        link.href = objectUrl\n        link.download = photo.fileName || \`fotografija-\${photo.id}.jpg\`\n        document.body.appendChild(link)\n        link.click()\n        link.remove()\n        URL.revokeObjectURL(objectUrl)\n\n        // Mali razmak sprječava preglednik da proguta više uzastopnih preuzimanja.\n        await new Promise((resolve) => window.setTimeout(resolve, 120))\n      }\n    } catch (error) {\n      window.alert(\n        error instanceof Error\n          ? error.message\n          : 'Odabrane fotografije nije moguće preuzeti.',\n      )\n    } finally {\n      setPhotoActionBusy(false)\n    }\n  }\n\n  async function handleShareSelectedPhotos() {\n    if (!selectedPhotos.length || photoActionBusy) return\n\n    try {\n      setPhotoActionBusy(true)\n      const files = await Promise.all(selectedPhotos.map(photoToFile))\n\n      const shareData: ShareData = {\n        title: customer?.name\n          ? \`FERSYS fotografije – \${customer.name}\`\n          : 'FERSYS fotografije',\n        text: customer?.name\n          ? \`Fotografije investitora \${customer.name}\`\n          : 'Fotografije iz FERSYS-a',\n        files,\n      }\n\n      if (navigator.canShare?.({ files }) && navigator.share) {\n        await navigator.share(shareData)\n        return\n      }\n\n      if (navigator.share && files.length === 1) {\n        await navigator.share(shareData)\n        return\n      }\n\n      window.alert(\n        'Ovaj preglednik ne podržava izravno dijeljenje više fotografija. Koristi „Preuzmi odabrane”, a u FERSYS Android aplikaciji otvorit će se sistemski izbornik za WhatsApp, Viber i druge aplikacije.',\n      )\n    } catch (error) {\n      if (error instanceof DOMException && error.name === 'AbortError') {\n        return\n      }\n\n      window.alert(\n        error instanceof Error\n          ? error.message\n          : 'Odabrane fotografije nije moguće podijeliti.',\n      )\n    } finally {\n      setPhotoActionBusy(false)\n    }\n  }\n\n`

  source = source.replace(functionAnchor, `${helpers}${functionAnchor}`)

  const gridAnchor = `            ) : (\n              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">`

  if (!source.includes(gridAnchor)) {
    fail('Nije pronađena stvarna mreža fotografija u CustomerProfilePage.tsx.')
  }

  const toolbar = `            ) : (\n              <>\n                <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">\n                  <button\n                    type="button"\n                    onClick={toggleSelectAllPhotos}\n                    className="min-h-10 rounded-xl bg-slate-800 px-3 text-xs font-black text-white"\n                  >\n                    {selectedPhotoIds.length === customerPhotos.length\n                      ? 'Poništi sve'\n                      : 'Odaberi sve'}\n                  </button>\n\n                  <span className="mr-auto rounded-xl bg-blue-500/10 px-3 py-2 text-xs font-black text-blue-200">\n                    Odabrano: {selectedPhotoIds.length}\n                  </span>\n\n                  {selectedPhotoIds.length > 0 && (\n                    <>\n                      <button\n                        type="button"\n                        onClick={clearPhotoSelection}\n                        disabled={photoActionBusy}\n                        className="min-h-10 rounded-xl bg-slate-800 px-3 text-xs font-black text-slate-300 disabled:opacity-50"\n                      >\n                        Poništi\n                      </button>\n\n                      <button\n                        type="button"\n                        onClick={() => void handleDownloadSelectedPhotos()}\n                        disabled={photoActionBusy}\n                        className="min-h-10 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white disabled:opacity-50"\n                      >\n                        {photoActionBusy ? 'Pričekaj...' : 'Preuzmi odabrane'}\n                      </button>\n\n                      <button\n                        type="button"\n                        onClick={() => void handleShareSelectedPhotos()}\n                        disabled={photoActionBusy}\n                        className="min-h-10 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-50"\n                      >\n                        {photoActionBusy ? 'Pričekaj...' : 'Podijeli odabrane'}\n                      </button>\n                    </>\n                  )}\n                </div>\n\n                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">`

  source = source.replace(gridAnchor, toolbar)

  // Close the fragment after the photo grid. Use the exact boundary before the end of photos tab.
  const gridCloseAnchor = `              </div>\n            )}\n          </section>\n        )}\n\n        {activeTab === 'notes' && (`

  if (!source.includes(gridCloseAnchor)) {
    fail('Nije pronađen kraj mreže fotografija u CustomerProfilePage.tsx.')
  }

  source = source.replace(
    gridCloseAnchor,
    `              </div>\n              </>\n            )}\n          </section>\n        )}\n\n        {activeTab === 'notes' && (`,
  )

  // Add a real checkbox overlay to every photo card.
  const articleAnchor = `                    <article\n                      key={photo.id}\n                      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950"\n                    >`

  if (!source.includes(articleAnchor)) {
    fail('Nije pronađena kartica fotografije u CustomerProfilePage.tsx.')
  }

  source = source.replace(
    articleAnchor,
    `                    <article\n                      key={photo.id}\n                      className={\`relative overflow-hidden rounded-2xl border bg-slate-950 transition \${\n                        selectedPhotoIds.includes(photo.id)\n                          ? 'border-blue-500 ring-2 ring-blue-500/30'\n                          : 'border-slate-800'\n                      }\`}\n                    >\n                      <label\n                        className="absolute left-2 top-2 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-white/20 bg-slate-950/85 shadow-lg backdrop-blur"\n                        title="Odaberi fotografiju"\n                      >\n                        <input\n                          type="checkbox"\n                          checked={selectedPhotoIds.includes(photo.id)}\n                          onChange={() => togglePhotoSelection(photo.id)}\n                          className="h-5 w-5 cursor-pointer accent-blue-600"\n                        />\n                      </label>`,
  )

  fs.writeFileSync(path, source, 'utf8')
}

const actual = fs.readFileSync(path, 'utf8')
const required = [
  'selectedPhotoIds',
  'Preuzmi odabrane',
  'Podijeli odabrane',
  'toggleSelectAllPhotos',
  'handleDownloadSelectedPhotos',
  'handleShareSelectedPhotos',
  'type="checkbox"',
]

const missing = required.filter((token) => !actual.includes(token))
if (missing.length) {
  fail(`Zakrpa nije potvrđena u stvarnoj CustomerProfilePage.tsx. Nedostaje: ${missing.join(', ')}`)
}

console.log('POTVRĐENO: stvarni src/pages/CustomerProfilePage.tsx sada ima višestruki odabir fotografija.')
console.log('POTVRĐENO: postoje Preuzmi odabrane, Podijeli odabrane, Odaberi/Poništi sve i checkbox na svakoj fotografiji.')
console.log('SADA OBAVEZNO pokreni: npm run build')
