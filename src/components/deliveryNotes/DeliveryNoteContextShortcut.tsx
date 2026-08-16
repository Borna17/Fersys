import {
  FileText,
  PackagePlus,
} from 'lucide-react'
import {
  useLocation,
  useNavigate,
} from 'react-router'

export default function DeliveryNoteContextShortcut() {
  const location =
    useLocation()

  const navigate =
    useNavigate()

  const workOrder =
    location.pathname.match(
      /^\/work-orders\/([^/]+)$/,
    )

  const offer =
    location.pathname.match(
      /^\/offers\/([^/]+)$/,
    )

  const customer =
    location.pathname.match(
      /^\/customers\/([^/]+)$/,
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
      className="fixed bottom-24 right-4 z-[65] inline-flex min-h-12 items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-600 px-4 text-sm font-black text-white shadow-2xl shadow-blue-950/40 transition active:scale-[0.98] md:bottom-7 md:right-7"
      title={label}
    >
      <PackagePlus
        size={18}
      />
      <span className="hidden sm:inline">
        {label}
      </span>
      <FileText
        size={16}
        className="sm:hidden"
      />
    </button>
  )
}
