import {
  useState,
} from 'react'
import {
  Share2,
} from 'lucide-react'
import {
  useLocation,
} from 'react-router'

import {
  parseEmployeePermissions,
  resolvePermissions,
  type CompanyRole,
  type MemberStatus,
} from '../auth/permissions'
import {
  supabase,
} from '../lib/supabase'
import {
  getWorkOrderById,
  redactWorkOrderPrices,
} from '../services/workOrders.service'
import {
  getWorkOrderBrandingFromCompanySettings,
} from '../services/workOrderBranding.service'
import {
  getWorkOrderPdfBlob,
} from '../utils/workOrderPdf'

type CurrentAccessRow = {
  role: CompanyRole
  status: MemberStatus
  permissions: unknown
}

function safeFileName(value: string) {
  return (
    value
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-') ||
    'radni-nalog'
  )
}

async function canViewWorkOrderPrices() {
  const { data, error } =
    await supabase.rpc(
      'get_current_user_access',
    )

  if (error) {
    throw error
  }

  const row = Array.isArray(data)
    ? data[0]
    : data

  if (!row) {
    return false
  }

  const access =
    row as CurrentAccessRow

  if (access.status !== 'active') {
    return false
  }

  const resolved =
    resolvePermissions(
      access.role,
      parseEmployeePermissions(
        access.permissions,
      ),
    )

  return Boolean(
    resolved['workOrders.viewPrices'],
  )
}

export function WorkOrderShareAction() {
  const location = useLocation()
  const [isSharing, setIsSharing] =
    useState(false)

  const match =
    location.pathname.match(
      /^\/work-orders\/([^/]+)\/?$/,
    )

  if (!match) {
    return null
  }

  const orderId =
    decodeURIComponent(match[1])

  async function handleShare() {
    if (isSharing) return

    try {
      setIsSharing(true)

      const [
        order,
        branding,
        mayViewPrices,
      ] = await Promise.all([
        getWorkOrderById(orderId),
        getWorkOrderBrandingFromCompanySettings(),
        canViewWorkOrderPrices(),
      ])

      if (!order) {
        throw new Error(
          'Radni nalog nije pronađen.',
        )
      }

      const pdfOrder =
        mayViewPrices
          ? order
          : redactWorkOrderPrices(
              order,
            )

      const blob =
        await getWorkOrderPdfBlob(
          pdfOrder,
          branding,
        )

      const fileName =
        `${safeFileName(
          order.orderNumber ||
            'radni-nalog',
        )}.pdf`

      const file = new File(
        [blob],
        fileName,
        {
          type: 'application/pdf',
        },
      )

      const shareData: ShareData = {
        title: `Radni nalog ${order.orderNumber}`,
        text: `Radni nalog ${order.orderNumber} - ${order.customerName || order.title}`,
        files: [file],
      }

      if (
        navigator.share &&
        (!navigator.canShare ||
          navigator.canShare(
            shareData,
          ))
      ) {
        await navigator.share(
          shareData,
        )
        return
      }

      const url =
        URL.createObjectURL(blob)
      const anchor =
        document.createElement('a')

      anchor.href = url
      anchor.download = fileName
      anchor.click()

      window.setTimeout(
        () =>
          URL.revokeObjectURL(url),
        2000,
      )

      window.alert(
        'Ovaj uređaj ne podržava izravno dijeljenje PDF-a. PDF je preuzet pa ga možete poslati kroz WhatsApp, Viber ili drugu aplikaciju.',
      )
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return
      }

      console.error(
        'Dijeljenje radnog naloga nije uspjelo:',
        error,
      )

      window.alert(
        error instanceof Error
          ? error.message
          : 'Radni nalog nije moguće podijeliti.',
      )
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() =>
        void handleShare()
      }
      disabled={isSharing}
      className="fixed bottom-[5.75rem] right-4 z-50 flex h-12 items-center justify-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-600 px-4 text-sm font-black text-white shadow-2xl shadow-black/30 disabled:opacity-60 sm:bottom-6 sm:right-6"
      aria-label="Podijeli radni nalog"
      title="Podijeli PDF radnog naloga"
    >
      <Share2 size={18} />
      <span>
        {isSharing
          ? 'Priprema...'
          : 'Dijeli'}
      </span>
    </button>
  )
}
