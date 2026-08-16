import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Mail,
  Pencil,
  ReceiptText,
  Share2,
} from 'lucide-react'
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  useNavigate,
  useParams,
} from 'react-router'

import {
  SignaturePad,
} from '../components/SignaturePad'
import {
  cancelDeliveryNote,
  getDeliveryNoteById,
  markDeliveryNoteDelivered,
} from '../services/deliveryNotes.service'
import {
  deliveryNoteStatusLabels,
  type DeliveryNote,
} from '../types/deliveryNote'
import {
  prepareDeliveryNoteInvoiceBridge,
} from '../utils/deliveryNoteInvoiceBridge'
import {
  downloadDeliveryNotePdf,
  shareDeliveryNotePdf,
} from '../utils/deliveryNotePdf'

function formatDate(
  value: string,
) {
  if (!value) {
    return '—'
  }

  const date =
    new Date(
      `${value}T12:00:00`,
    )

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'hr-HR',
  ).format(date)
}

export function DeliveryNoteDetailsPage() {
  const {
    id = '',
  } =
    useParams()

  const navigate =
    useNavigate()

  const [
    note,
    setNote,
  ] =
    useState<
      DeliveryNote | null
    >(null)

  const [
    loading,
    setLoading,
  ] = useState(true)

  const [
    busy,
    setBusy,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')

  const [
    receivedBy,
    setReceivedBy,
  ] = useState('')

  const [
    receivedSignature,
    setReceivedSignature,
  ] = useState('')

  useEffect(() => {
    let cancelled =
      false

    void (async () => {
      try {
        setLoading(true)
        setError('')

        const value =
          await getDeliveryNoteById(
            id,
          )

        if (
          !cancelled
        ) {
          setNote(value)

          if (value) {
            setReceivedBy(
              value.receivedBy,
            )
            setReceivedSignature(
              value.receivedSignature,
            )
          }
        }
      } catch (value) {
        if (
          !cancelled
        ) {
          setError(
            value instanceof
              Error
              ? value.message
              : 'Otpremnicu nije moguće učitati.',
          )
        }
      } finally {
        if (
          !cancelled
        ) {
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  async function download() {
    if (
      !note ||
      busy
    ) {
      return
    }

    try {
      setBusy(true)
      setError('')
      await downloadDeliveryNotePdf(
        note,
      )
    } catch (value) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'PDF nije moguće izraditi.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function share() {
    if (
      !note ||
      busy
    ) {
      return
    }

    try {
      setBusy(true)
      setError('')
      await shareDeliveryNotePdf(
        note,
      )
    } catch (value) {
      if (
        value instanceof
          DOMException &&
        value.name ===
          'AbortError'
      ) {
        return
      }

      setError(
        value instanceof
          Error
          ? value.message
          : 'Dokument nije moguće podijeliti.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function markDelivered() {
    if (
      !note ||
      busy
    ) {
      return
    }

    try {
      setBusy(true)
      setError('')

      const updated =
        await markDeliveryNoteDelivered(
          note,
          receivedBy,
          receivedSignature,
        )

      setNote(updated)
    } catch (value) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'Status nije moguće promijeniti.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function cancel() {
    if (
      !note ||
      busy
    ) {
      return
    }

    try {
      setBusy(true)
      setError('')

      const updated =
        await cancelDeliveryNote(
          note,
        )

      setNote(updated)
    } catch (value) {
      setError(
        value instanceof
          Error
          ? value.message
          : 'Otpremnicu nije moguće stornirati.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2
          size={32}
          className="animate-spin text-blue-400"
        />
      </div>
    )
  }

  if (
    error &&
    !note
  ) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-center text-red-200">
        {error}
      </div>
    )
  }

  if (!note) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center text-white">
        Otpremnica nije pronađena.
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[1450px] space-y-5 pb-20">
      <button
        type="button"
        onClick={() =>
          navigate(
            '/inventory/delivery-notes',
          )
        }
        className="inline-flex items-center gap-2 text-sm font-black text-slate-400"
      >
        <ArrowLeft
          size={18}
        />
        Otpremnice
      </button>

      <header className="rounded-[2rem] border border-blue-500/15 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/40 p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
              OTPREMNICA
            </p>

            <h1 className="mt-2 text-3xl font-black text-white">
              {note.number}
            </h1>

            <div className="mt-3 flex flex-wrap gap-2">
              <Status
                status={
                  note.status
                }
              />

              {note.inventoryPosted && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase text-emerald-300">
                  Skladište knjiženo
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {note.status ===
              'draft' && (
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/inventory/delivery-notes/new?edit=${note.id}`,
                  )
                }
                className={buttonSecondary}
              >
                <Pencil
                  size={17}
                />
                Uredi nacrt
              </button>
            )}

            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                void download()
              }
              className={buttonSecondary}
            >
              <Download
                size={17}
              />
              PDF
            </button>

            <button
              type="button"
              disabled={
                busy
              }
              onClick={() =>
                void share()
              }
              className={buttonPrimary}
            >
              <Share2
                size={17}
              />
              Podijeli PDF
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
        <div className="space-y-5">
          <Card
            title="Primatelj i isporuka"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Info
                label="Investitor / primatelj"
                value={
                  note.customerName
                }
              />
              <Info
                label="OIB"
                value={
                  note.customerOib ||
                  '—'
                }
              />
              <Info
                label="Datum i vrijeme"
                value={`${formatDate(
                  note.deliveryDate,
                )}${note.deliveryTime
                  ? ` · ${note.deliveryTime}`
                  : ''}`}
              />
              <Info
                label="Adresa"
                value={
                  note.deliveryAddress ||
                  '—'
                }
              />
              <Info
                label="Mjesto"
                value={
                  note.deliveryPlace ||
                  '—'
                }
              />
              <Info
                label="Vozilo"
                value={
                  note.vehicleRegistration ||
                  '—'
                }
              />
            </div>
          </Card>

          <Card
            title="Stavke"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left">
                <thead className="text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-3">
                      #
                    </th>
                    <th className="px-3 py-3">
                      Naziv
                    </th>
                    <th className="px-3 py-3">
                      Šifra
                    </th>
                    <th className="px-3 py-3 text-right">
                      Količina
                    </th>
                    <th className="px-3 py-3 text-center">
                      JM
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {note.items.map(
                    (
                      item,
                      index,
                    ) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-t border-slate-800 text-sm text-slate-200"
                      >
                        <td className="px-3 py-4 text-slate-500">
                          {index +
                            1}
                        </td>
                        <td className="px-3 py-4">
                          <strong className="font-black text-white">
                            {item.name}
                          </strong>
                          {item.description && (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.description}
                            </p>
                          )}
                          {item.note && (
                            <p className="mt-1 text-[11px] text-slate-600">
                              {item.note}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-4 text-slate-400">
                          {item.code ||
                            '—'}
                        </td>
                        <td className="px-3 py-4 text-right font-black">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-4 text-center">
                          {item.unit}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {note.note && (
            <Card
              title="Napomena"
            >
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {note.note}
              </p>
            </Card>
          )}

          <Card
            title="Potpisi"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <SignatureView
                title="Predao"
                name={
                  note.deliveredBy
                }
                signature={
                  note.deliveredSignature
                }
              />

              <SignatureView
                title="Preuzeo"
                name={
                  note.receivedBy
                }
                signature={
                  note.receivedSignature
                }
              />
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card
            title="Povezani dokumenti"
          >
            <div className="space-y-3">
              <Related
                label="Radni nalog"
                value={
                  note.workOrderNumber
                }
                onClick={
                  note.workOrderId
                    ? () =>
                        navigate(
                          `/work-orders/${note.workOrderId}`,
                        )
                    : undefined
                }
              />

              <Related
                label="Ponuda"
                value={
                  note.offerNumber
                }
                onClick={
                  note.offerId
                    ? () =>
                        navigate(
                          `/offers/${note.offerId}`,
                        )
                    : undefined
                }
              />

              <Related
                label="Račun"
                value={
                  note.invoiceNumber
                }
                onClick={
                  note.invoiceId
                    ? () =>
                        navigate(
                          `/invoices/${note.invoiceId}/edit`,
                        )
                    : undefined
                }
              />
            </div>
          </Card>

          {note.status !==
            'cancelled' && (
            <Card
              title="Sljedeći korak"
            >
              <button
                type="button"
                onClick={() =>
                  navigate(
                    prepareDeliveryNoteInvoiceBridge(
                      note,
                    ),
                  )
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-black text-white"
              >
                <ReceiptText
                  size={18}
                />
                Izradi račun iz otpremnice
              </button>

              {note.customerEmail && (
                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      `mailto:${encodeURIComponent(
                        note.customerEmail,
                      )}?subject=${encodeURIComponent(
                        `Otpremnica ${note.number}`,
                      )}&body=${encodeURIComponent(
                        `Poštovani,\n\nu privitku / dijeljenju dostavljamo otpremnicu ${note.number}.\n\nFERSYS`,
                      )}`
                  }}
                  className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-white"
                >
                  <Mail
                    size={18}
                  />
                  Otvori e-mail
                </button>
              )}
            </Card>
          )}

          {note.status ===
            'issued' && (
            <Card
              title="Potvrda isporuke"
            >
              <label className={labelClass}>
                Preuzeo
                <input
                  value={
                    receivedBy
                  }
                  onChange={(
                    event,
                  ) =>
                    setReceivedBy(
                      event
                        .target
                        .value,
                    )
                  }
                  className={inputClass}
                />
              </label>

              <div className="mt-4">
                <SignaturePad
                  title="Potpis primatelja"
                  value={
                    receivedSignature
                  }
                  onChange={
                    setReceivedSignature
                  }
                />
              </div>

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  void markDelivered()
                }
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-black text-white disabled:opacity-50"
              >
                <CheckCircle2
                  size={18}
                />
                Označi kao isporučeno
              </button>
            </Card>
          )}

          {note.status !==
            'draft' &&
            note.status !==
              'cancelled' && (
              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() =>
                  void cancel()
                }
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 text-sm font-black text-red-300 disabled:opacity-50"
              >
                <Ban
                  size={18}
                />
                Storniraj otpremnicu
              </button>
            )}
        </div>
      </div>
    </section>
  )
}

const buttonPrimary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-50'

const buttonSecondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 text-sm font-black text-white disabled:opacity-50'

const inputClass =
  'mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500'

const labelClass =
  'text-xs font-black uppercase tracking-wide text-slate-500'

function Card({
  title,
  children,
}: {
  title: string
  children:
    ReactNode
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-4 font-black text-white">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Info({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-white">
        {value}
      </p>
    </div>
  )
}

function SignatureView({
  title,
  name,
  signature,
}: {
  title: string
  name: string
  signature: string
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <p className="text-[10px] font-black uppercase text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-sm font-black text-white">
        {name || '—'}
      </p>

      {signature ? (
        <div className="mt-3 overflow-hidden rounded-xl bg-white">
          <img
            src={
              signature
            }
            alt={title}
            className="h-28 w-full object-contain"
          />
        </div>
      ) : (
        <div className="mt-3 grid h-28 place-items-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-600">
          Nema potpisa
        </div>
      )}
    </div>
  )
}

function Related({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      disabled={
        !value
      }
      onClick={
        onClick
      }
      className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-left disabled:opacity-50"
    >
      <span>
        <span className="block text-[10px] font-black uppercase text-slate-500">
          {label}
        </span>
        <span className="mt-1 block text-sm font-black text-white">
          {value ||
            'Nije povezano'}
        </span>
      </span>

      <FileText
        size={18}
        className="text-slate-500"
      />
    </button>
  )
}

function Status({
  status,
}: {
  status:
    DeliveryNote['status']
}) {
  const className =
    status ===
    'delivered'
      ? 'bg-emerald-500/10 text-emerald-300'
      : status ===
          'cancelled'
        ? 'bg-red-500/10 text-red-300'
        : status ===
            'issued'
          ? 'bg-blue-500/10 text-blue-300'
          : 'bg-slate-700 text-slate-300'

  return (
    <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${className}`}>
      {
        deliveryNoteStatusLabels[
          status
        ]
      }
    </span>
  )
}

export default DeliveryNoteDetailsPage
