import fs from 'node:fs'

const file = 'src/pages/WorkOrderDetailsPage.tsx'
let source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')

function replaceOnce(search, replacement, label) {
  if (source.includes(replacement)) return
  const index = source.indexOf(search)
  if (index < 0) throw new Error(`Nedostaje blok: ${label}`)
  source = source.slice(0, index) + replacement + source.slice(index + search.length)
}

replaceOnce(
  "  Phone,\n  Trash2,\n",
  "  Phone,\n  Share2,\n  Trash2,\n",
  'Share2 import',
)

replaceOnce(
  "import {\n  calculateWorkOrderPricing,\n  materialLineTotal,\n} from '../utils/workOrderPricing'\n",
  "import {\n  calculateWorkOrderPricing,\n  materialLineTotal,\n} from '../utils/workOrderPricing'\nimport {\n  shareWorkOrderPdf,\n} from '../utils/shareWorkOrderPdf'\n",
  'share utility import',
)

replaceOnce(
  "  const [\n    isDeleting,\n    setIsDeleting,\n  ] =\n    useState(false)\n",
  "  const [\n    isDeleting,\n    setIsDeleting,\n  ] =\n    useState(false)\n\n  const [\n    isSharing,\n    setIsSharing,\n  ] =\n    useState(false)\n",
  'sharing state',
)

replaceOnce(
  "  async function handleDeleteOrder() {\n",
  `  async function handleSharePdf() {\n    if (\n      !order ||\n      isSharing ||\n      isDownloading ||\n      isDeleting\n    ) {\n      return\n    }\n\n    try {\n      setIsSharing(true)\n\n      const branding =\n        await getWorkOrderBrandingFromCompanySettings()\n\n      await shareWorkOrderPdf(\n        canViewPrices\n          ? order\n          : redactWorkOrderPrices(order),\n        branding,\n      )\n    } catch (error) {\n      const isAbort =\n        error instanceof DOMException &&\n        error.name === 'AbortError'\n\n      if (!isAbort) {\n        console.error(\n          'Dijeljenje radnog naloga nije uspjelo:',\n          error,\n        )\n\n        window.alert(\n          error instanceof Error\n            ? error.message\n            : 'Radni nalog nije moguće podijeliti.',\n        )\n      }\n    } finally {\n      setIsSharing(false)\n    }\n  }\n\n  async function handleDeleteOrder() {\n`,
  'share handler',
)

replaceOnce(
  "        <section className=\"grid grid-cols-3 gap-2\">\n",
  "        <section className=\"grid grid-cols-2 gap-2 sm:grid-cols-4\">\n",
  'action grid',
)

const navigationBlock = `          <ActionButton\n            icon={<Navigation size={19} />}\n            label=\"Navigacija\"\n            disabled={!hasAddress}\n            onClick={() => {\n              if (hasAddress) {\n                window.open(\n                  \`https://www.google.com/maps/search/?api=1&query=\${encodeURIComponent(\n                    order.address,\n                  )}\`,\n                  '_blank',\n                  'noopener,noreferrer',\n                )\n              }\n            }}\n          />\n`

replaceOnce(
  navigationBlock,
  navigationBlock + `\n          <ActionButton\n            icon={<Share2 size={19} />}\n            label={isSharing ? 'Priprema...' : 'Dijeli'}\n            disabled={isSharing || isDownloading || isDeleting}\n            onClick={() => {\n              void handleSharePdf()\n            }}\n          />\n`,
  'share action button',
)

fs.writeFileSync(file, source)
console.log('Patched WorkOrderDetailsPage share action.')
