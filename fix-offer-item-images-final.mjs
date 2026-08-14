import fs from 'node:fs'
import path from 'node:path'

const rel = 'src/pages/NewOfferPage.tsx'
const file = path.join(process.cwd(), rel)
if (!fs.existsSync(file)) throw new Error(`Nedostaje ${rel}`)

const original = fs.readFileSync(file, 'utf8')
const eol = original.includes('\r\n') ? '\r\n' : '\n'
let text = original.replace(/\r\n/g, '\n')

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backup = path.join(process.cwd(), '.fersys-offer-images-backup', stamp, rel)

function rep(oldText, newText, label) {
  if (text.includes(newText)) return
  if (!text.includes(oldText)) throw new Error(`Nije pronađeno: ${label}`)
  text = text.replace(oldText, newText)
}

rep(
`  ImagePlus,
  Plus,`,
`  ImagePlus,
  Link2,
  Loader2,
  Plus,`,
'icons',
)

rep(
`  const [
    items,
    setItems,
  ] =
    useState<OfferItem[]>([
      createEmptyItem(),
    ])`,
`  const [
    items,
    setItems,
  ] =
    useState<OfferItem[]>([
      createEmptyItem(),
    ])

  const [
    itemImageUrls,
    setItemImageUrls,
  ] = useState<Record<string, string>>({})

  const [
    loadingImageItemId,
    setLoadingImageItemId,
  ] = useState<string | null>(null)`,
'image url state',
)

rep(
`      setItems(
        (currentItems) =>
          currentItems.map(
            (item) =>
              item.id ===
              itemId
                ? {
                    ...item,
                    imageDataUrl:
                      compressed,
                    imageName:
                      file.name,
                  }
                : item,
          ),
      )

      setErrors(`,
`      setItems(
        (currentItems) =>
          currentItems.map(
            (item) =>
              item.id ===
              itemId
                ? {
                    ...item,
                    imageDataUrl:
                      compressed,
                    imageName:
                      file.name,
                  }
                : item,
          ),
      )

      setItemImageUrls(
        (current) => ({
          ...current,
          [itemId]: '',
        }),
      )

      setErrors(`,
'gallery clear url',
)

const anchor = `  function removeItemImage(
    itemId: string,
  ) {`

const urlHandler = `  async function handleItemImageUrl(
    itemId: string,
  ) {
    const rawUrl =
      (itemImageUrls[itemId] ?? '').trim()

    if (!rawUrl) {
      setErrors((current) => ({
        ...current,
        items:
          'Zalijepi izravni link do slike.',
      }))
      return
    }

    let parsedUrl: URL

    try {
      parsedUrl = new URL(rawUrl)
    } catch {
      setErrors((current) => ({
        ...current,
        items:
          'Link slike nije ispravan.',
      }))
      return
    }

    if (
      parsedUrl.protocol !== 'https:' &&
      parsedUrl.protocol !== 'http:'
    ) {
      setErrors((current) => ({
        ...current,
        items:
          'Link slike mora počinjati s http:// ili https://.',
      }))
      return
    }

    try {
      setLoadingImageItemId(itemId)

      const response =
        await fetch(parsedUrl.toString(), {
          mode: 'cors',
          cache: 'no-store',
        })

      if (!response.ok) {
        throw new Error(
          'Slika nije dostupna.',
        )
      }

      const blob = await response.blob()

      if (!blob.type.startsWith('image/')) {
        throw new Error(
          'Link ne vodi na sliku.',
        )
      }

      if (blob.size > 12 * 1024 * 1024) {
        throw new Error(
          'Slika može imati najviše 12 MB.',
        )
      }

      const pathName =
        parsedUrl.pathname
          .split('/')
          .filter(Boolean)
          .pop()

      const fileName =
        pathName ||
        \`slika-\${Date.now()}.jpg\`

      const remoteFile =
        new File(
          [blob],
          fileName,
          {
            type:
              blob.type ||
              'image/jpeg',
          },
        )

      const originalImage =
        await readImageFile(remoteFile)

      const compressed =
        await compressImage(
          originalImage,
        )

      setItems(
        (currentItems) =>
          currentItems.map(
            (item) =>
              item.id === itemId
                ? {
                    ...item,
                    imageDataUrl:
                      compressed,
                    imageName:
                      fileName,
                  }
                : item,
          ),
      )

      setErrors((current) => ({
        ...current,
        items: '',
      }))
    } catch (error) {
      setErrors((current) => ({
        ...current,
        items:
          error instanceof Error &&
          error.message !== 'Failed to fetch'
            ? error.message
            : 'Web stranica ne dopušta FERSYS-u preuzimanje te slike. Preuzmi sliku na uređaj pa odaberi „Iz galerije”.',
      }))
    } finally {
      setLoadingImageItemId(null)
    }
  }

${anchor}`

rep(anchor, urlHandler, 'url handler')

rep(
`    setItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === itemId
              ? {
                  ...item,
                  imageDataUrl:
                    undefined,
                  imageName:
                    undefined,
                }
              : item,
        ),
    )
  }

  function addItem() {`,
`    setItems(
      (currentItems) =>
        currentItems.map(
          (item) =>
            item.id === itemId
              ? {
                  ...item,
                  imageDataUrl:
                    undefined,
                  imageName:
                    undefined,
                }
              : item,
        ),
    )

    setItemImageUrls(
      (current) => ({
        ...current,
        [itemId]: '',
      }),
    )
  }

  function addItem() {`,
'remove clears url',
)

text = text.replace(
  `                          capture="environment"\n`,
  '',
)

const oldUi = `                    <div className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl bg-slate-800/55 p-3">
                      <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-500/10 px-3 text-xs font-black text-violet-200">
                        <ImagePlus
                          size={17}
                        />
                        {item.imageDataUrl
                          ? 'Promijeni sliku'
                          : 'Dodaj sliku'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(event) => {
                            void handleItemImage(
                              item.id,
                              event.target.files?.[0],
                            )
                            event.currentTarget.value =
                              ''
                          }}
                        />
                      </label>

                      <p className="text-right">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-slate-600">
                          Ukupno
                        </span>
                        <span className="mt-1 block text-sm font-black text-white">
                          {formatCurrency(
                            calculateItemTotal(
                              item,
                            ),
                          )}
                        </span>
                      </p>
                    </div>`

const newUi = `                    <div className="rounded-2xl bg-slate-800/55 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-wider text-slate-600">
                            Slika stavke
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Opcionalno · galerija ili web link
                          </p>
                        </div>

                        <p className="shrink-0 text-right">
                          <span className="block text-[9px] font-black uppercase tracking-wider text-slate-600">
                            Ukupno
                          </span>
                          <span className="mt-1 block text-sm font-black text-white">
                            {formatCurrency(
                              calculateItemTotal(
                                item,
                              ),
                            )}
                          </span>
                        </p>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_auto]">
                        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white active:scale-[0.99]">
                          <ImagePlus size={17} />
                          {item.imageDataUrl
                            ? 'Promijeni iz galerije'
                            : 'Iz galerije'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              void handleItemImage(
                                item.id,
                                event.target.files?.[0],
                              )
                              event.currentTarget.value =
                                ''
                            }}
                          />
                        </label>

                        <div className="relative min-w-0">
                          <Link2
                            size={16}
                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                          />
                          <input
                            type="url"
                            inputMode="url"
                            value={
                              itemImageUrls[
                                item.id
                              ] ?? ''
                            }
                            onChange={(event) =>
                              setItemImageUrls(
                                (current) => ({
                                  ...current,
                                  [item.id]:
                                    event.target.value,
                                }),
                              )
                            }
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                void handleItemImageUrl(
                                  item.id,
                                )
                              }
                            }}
                            placeholder="https://.../slika.jpg"
                            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 pl-9 pr-3 text-xs text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={
                            loadingImageItemId ===
                            item.id
                          }
                          onClick={() =>
                            void handleItemImageUrl(
                              item.id,
                            )
                          }
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 text-xs font-black text-white disabled:opacity-50"
                        >
                          {loadingImageItemId === item.id ? (
                            <Loader2
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Link2 size={16} />
                          )}
                          Učitaj link
                        </button>
                      </div>

                      <p className="mt-2 text-[11px] leading-5 text-slate-500">
                        Kod web linka FERSYS pokušava preuzeti i spremiti vlastitu komprimiranu kopiju slike. Ako web stranica blokira preuzimanje, spremi sliku na uređaj i odaberi je iz galerije.
                      </p>
                    </div>`

rep(oldUi, newUi, 'image ui')

fs.mkdirSync(path.dirname(backup), { recursive: true })
fs.copyFileSync(file, backup)
fs.writeFileSync(
  file,
  eol === '\r\n'
    ? text.replace(/\n/g, '\r\n')
    : text,
  'utf8',
)

console.log('✓ NewOfferPage.tsx ažuriran.')
console.log('✓ Galerija + URL slike rade uz postojeći PDF i servis.')
console.log('Sada pokreni: npm run build')
