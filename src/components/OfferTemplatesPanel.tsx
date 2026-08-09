import {
  BookmarkPlus,
  Check,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  useEffect,
  useMemo,
  useState,
} from 'react'

import type { OfferItem } from '../types/offers'
import {
  createOfferTemplate,
  deleteOfferTemplate,
  getOfferTemplates,
  updateOfferTemplate,
  type OfferTemplate,
} from '../services/offerTemplates.service'

type Props = {
  description: string
  paymentTerms: string
  items: OfferItem[]

  onApply: (
    template: OfferTemplate,
  ) => void
}

export default function OfferTemplatesPanel({
  description,
  paymentTerms,
  items,
  onApply,
}: Props) {
  const [
    templates,
    setTemplates,
  ] = useState<OfferTemplate[]>([])

  const [
    search,
    setSearch,
  ] = useState('')

  const [
    selectedId,
    setSelectedId,
  ] = useState('')

  const [
    isLoading,
    setIsLoading,
  ] = useState(true)

  const [
    isSaving,
    setIsSaving,
  ] = useState(false)

  const [
    showModal,
    setShowModal,
  ] = useState(false)

  const [
    templateName,
    setTemplateName,
  ] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setIsLoading(true)

        const data =
          await getOfferTemplates()

        if (!cancelled) {
          setTemplates(data)
        }
      } catch (error) {
        console.error(
          'Predloške ponuda nije moguće učitati:',
          error,
        )
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const filtered =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLocaleLowerCase(
            'hr-HR',
          )

      if (!value) {
        return templates
      }

      return templates.filter(
        (template) =>
          [
            template.name,
            template.description,
            ...template.items.map(
              (item) =>
                `${item.name} ${item.description}`,
            ),
          ]
            .join(' ')
            .toLocaleLowerCase(
              'hr-HR',
            )
            .includes(value),
      )
    }, [
      templates,
      search,
    ])

  function apply(
    template: OfferTemplate,
  ) {
    setSelectedId(
      template.id,
    )

    onApply(template)
  }

  function openSave() {
    if (
      !description.trim() &&
      items.filter(
        (item) =>
          item.name.trim(),
      ).length === 0
    ) {
      alert(
        'Prvo unesite opis ili stavke ponude.',
      )
      return
    }

    const selected =
      templates.find(
        (template) =>
          template.id ===
          selectedId,
      )

    setTemplateName(
      selected?.name ||
      items.find(
        (item) =>
          item.name.trim(),
      )?.name ||
      '',
    )

    setShowModal(true)
  }

  async function save(
    updateExisting: boolean,
  ) {
    const name =
      templateName.trim()

    if (!name) {
      alert(
        'Unesite naziv predloška.',
      )
      return
    }

    try {
      setIsSaving(true)

      const input = {
        name,
        description,
        paymentTerms,
        items,
      }

      const selected =
        templates.find(
          (template) =>
            template.id ===
            selectedId,
        )

      const saved =
        updateExisting &&
        selected
          ? await updateOfferTemplate(
              selected.id,
              input,
            )
          : await createOfferTemplate(
              input,
            )

      setTemplates(
        (current) => {
          const exists =
            current.some(
              (template) =>
                template.id ===
                saved.id,
            )

          return (
            exists
              ? current.map(
                  (template) =>
                    template.id ===
                    saved.id
                      ? saved
                      : template,
                )
              : [
                  ...current,
                  saved,
                ]
          ).sort(
            (a, b) =>
              a.name.localeCompare(
                b.name,
                'hr',
              ),
          )
        },
      )

      setSelectedId(
        saved.id,
      )

      setShowModal(false)
      setTemplateName('')
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Predložak nije moguće spremiti.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  async function remove(
    template: OfferTemplate,
  ) {
    if (
      !window.confirm(
        `Obrisati predložak "${template.name}"?`,
      )
    ) {
      return
    }

    try {
      await deleteOfferTemplate(
        template.id,
      )

      setTemplates(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              template.id,
          ),
      )

      if (
        selectedId ===
        template.id
      ) {
        setSelectedId('')
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Predložak nije moguće obrisati.',
      )
    }
  }

  return (
    <>
      <section className="rounded-3xl border border-violet-500/20 bg-slate-900 p-5 shadow-xl shadow-black/5 lg:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-400">
              Predlošci
            </p>

            <h2 className="mt-1 text-xl font-black text-white">
              Predlošci ponuda
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Spremi česte ponude i kasnije jednim klikom ubaci opis, uvjete plaćanja, stavke, cijene, popuste i PDV.
            </p>
          </div>

          <button
            type="button"
            onClick={openSave}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white hover:bg-violet-500"
          >
            <BookmarkPlus size={18} />
            Spremi kao predložak
          </button>
        </div>

        <div className="relative mt-5">
          <Search
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
            placeholder="Pretraži predloške ponuda..."
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 pl-11 pr-4 text-sm text-white outline-none focus:border-violet-500"
          />
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">
            Učitavanje predložaka...
          </p>
        ) : filtered.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-500">
            Još nema spremljenih predložaka ponuda.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map(
              (template) => {
                const active =
                  selectedId ===
                  template.id

                return (
                  <div
                    key={
                      template.id
                    }
                    className={`rounded-xl border p-3 ${
                      active
                        ? 'border-violet-500/50 bg-violet-500/10'
                        : 'border-slate-800 bg-slate-950/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        apply(
                          template,
                        )
                      }
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                            active
                              ? 'bg-violet-600 text-white'
                              : 'bg-slate-800 text-violet-300'
                          }`}
                        >
                          {active ? (
                            <Check
                              size={17}
                            />
                          ) : (
                            <BookmarkPlus
                              size={17}
                            />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-black text-white">
                            {
                              template.name
                            }
                          </p>

                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {template.description ||
                              'Predložak ponude'}
                          </p>

                          <p className="mt-2 text-[11px] font-bold text-slate-600">
                            {
                              template.items.length
                            }{' '}
                            stavki
                          </p>
                        </div>
                      </div>
                    </button>

                    <div className="mt-3 flex justify-end border-t border-slate-800 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          void remove(
                            template,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2
                          size={13}
                        />
                        Obriši
                      </button>
                    </div>
                  </div>
                )
              },
            )}
          </div>
        )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-400">
                  Predložak ponude
                </p>

                <h2 className="mt-2 text-2xl font-black text-white">
                  Spremi ponudu za ubuduće
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowModal(
                    false,
                  )
                }
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-bold text-slate-300">
                Naziv predloška
              </span>

              <input
                autoFocus
                value={
                  templateName
                }
                onChange={(event) =>
                  setTemplateName(
                    event.target.value,
                  )
                }
                placeholder="Npr. Montaža klime 3.5 kW"
                className="mt-2 h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-white outline-none focus:border-violet-500"
              />
            </label>

            <p className="mt-4 text-sm leading-6 text-slate-500">
              Spremit će se opis, uvjeti plaćanja te sve stavke s količinama, cijenama, popustom i PDV-om. Investitor, broj ponude i datumi se ne spremaju.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowModal(
                    false,
                  )
                }
                className="h-11 rounded-xl bg-slate-800 px-4 font-bold text-white"
              >
                Odustani
              </button>

              {selectedId &&
                templates.some(
                  (template) =>
                    template.id ===
                    selectedId,
                ) && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() =>
                      void save(true)
                    }
                    className="h-11 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 font-bold text-blue-300 disabled:opacity-50"
                  >
                    Ažuriraj postojeći
                  </button>
                )}

              <button
                type="button"
                disabled={isSaving}
                onClick={() =>
                  void save(false)
                }
                className="h-11 rounded-xl bg-violet-600 px-4 font-bold text-white disabled:opacity-50"
              >
                {isSaving
                  ? 'Spremanje...'
                  : 'Spremi novi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
