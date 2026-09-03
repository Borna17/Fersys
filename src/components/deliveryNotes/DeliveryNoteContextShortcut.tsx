import {
  FileText,
  PackagePlus,
} from 'lucide-react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

const SAVED_DOCUMENT_ID =
  '[0-9a-f-]{20,}'

export default function DeliveryNoteContextShortcut() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  /*
   * Shortcut smije postojati samo na već spremljenom dokumentu.
   * Rute poput /offers/new i /work-orders/new prije su pogrešno
   * tretirale "new" kao ID dokumenta i prekrivale glavni Spremi gumb.
   */
  const workOrder =
    location.pathname.match(
      new RegExp(
        `^/work-orders/(${SAVED_DOCUMENT_ID})$`,
        'i',
      ),
    )

  const offer =
    location.pathname.match(
      new RegExp(
        `^/offers/(${SAVED_DOCUMENT_ID})$`,
        'i',
      ),
    )

  const customer =
    location.pathname.match(
      new RegExp(
        `^/customers/(${SAVED_DOCUMENT_ID})$`,
        'i',
      ),
    )

  let path = ''
  let label = ''

  if (workOrder) {
    path =
      `/inventory/delivery-notes/new?fromWorkOrder=${encodeURIComponent(
        workOrder[1],
      )}`
    label =
      'Izradi otpremnicu'
  } else if (offer) {
    path =
      `/inventory/delivery-notes/new?fromOffer=${encodeURIComponent(
        offer[1],
      )}`
    label =
      'Otpremnica iz ponude'
  } else if (customer) {
    path =
      `/inventory/delivery-notes/new?customerId=${encodeURIComponent(
        customer[1],
      )}`
    label =
      'Nova otpremnica'
  }

  if (!path) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() =>
        navigate(path)
      }
      className="fixed right-[-0.45rem] top-[68%] z-[58] inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-l-2xl rounded-r-none border border-r-0 border-blue-400/20 bg-blue-600 p-0 text-white shadow-xl shadow-blue-950/35 transition active:scale-[0.96] sm:right-3 sm:w-auto sm:min-w-12 sm:translate-y-0 sm:gap-2 sm:rounded-2xl sm:border-r sm:px-3 md:bottom-7 md:right-7 md:top-auto"
      title={label}
      aria-label={label}
    >
      <PackagePlus
        size={18}
      />
      <span className="hidden sm:inline text-sm font-black">
        {label}
      </span>
      <FileText
        size={15}
        className="sm:hidden"
      />
    </button>
  )
}
