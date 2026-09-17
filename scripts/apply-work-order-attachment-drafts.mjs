import fs from 'node:fs'

const path = 'src/pages/EditWorkOrderPage.tsx'
let source = fs.readFileSync(path, 'utf8')

function replaceOnce(from, to, label) {
  if (!source.includes(from)) throw new Error(`Missing patch anchor: ${label}`)
  source = source.replace(from, to)
}

replaceOnce(
  "import { getWorkOrderEditAccess } from '../services/workOrderAccess.service'\n",
  "import { getWorkOrderEditAccess } from '../services/workOrderAccess.service'\nimport {\n  deleteWorkOrderAttachmentDraft,\n  loadWorkOrderAttachmentDraft,\n  saveWorkOrderAttachmentDraft,\n} from '../services/workOrderAttachmentDrafts.service'\n",
  'attachment imports',
)

replaceOnce(
  "        const draft = await loadUserDraft<any>('work-order', draftKey)\n        const value = draft?.payload ?? null\n",
  "        const [draft, attachmentDraft] = await Promise.all([\n          loadUserDraft<any>('work-order', draftKey),\n          loadWorkOrderAttachmentDraft(id),\n        ])\n        const value = draft?.payload ?? null\n",
  'parallel draft load',
)

replaceOnce(
  "        setInvestorSignature(savedOrder.investorSignature)\n        setImages(savedOrder.images)\n        setBaseUpdatedAt(savedOrder.updatedAt)\n",
  "        setInvestorSignature(savedOrder.investorSignature)\n        setImages(savedOrder.images)\n        setBaseUpdatedAt(savedOrder.updatedAt)\n",
  'saved attachment baseline',
)

replaceOnce(
  "          setInvestorSignature(value.investorSignature ?? savedOrder.investorSignature)\n          setImages(Array.isArray(value.images) ? value.images : savedOrder.images)\n",
  "          setInvestorSignature(attachmentDraft?.investorSignature ?? value.investorSignature ?? savedOrder.investorSignature)\n          setImages(attachmentDraft?.images ?? (Array.isArray(value.images) ? value.images : savedOrder.images))\n",
  'same-base attachment recovery',
)

replaceOnce(
  "          investorName: sameBase ? value.investorName ?? savedOrder.investorName : savedOrder.investorName,\n          investorSignature: sameBase ? value.investorSignature ?? savedOrder.investorSignature : savedOrder.investorSignature,\n          images: sameBase && Array.isArray(value.images) ? value.images : savedOrder.images,\n",
  "          investorName: sameBase ? value.investorName ?? savedOrder.investorName : savedOrder.investorName,\n",
  'remove binary baseline',
)

replaceOnce(
  "      priceNote, investorName, investorSignature, images,\n    }\n",
  "      priceNote, investorName,\n    }\n",
  'remove binary autosave payload',
)

replaceOnce(
  "      investorSignature, images,\n    })\n",
  "    })\n",
  'remove binary serialization',
)

replaceOnce(
  "    vatRate, priceNote, investorName, investorSignature, images,\n  ])\n\n  useEffect(() => {\n    if (!draftReady || !id) return\n",
  "    vatRate, priceNote, investorName,\n  ])\n\n  useEffect(() => {\n    if (!draftReady || !id || saveSucceededRef.current) return\n\n    const timer = window.setTimeout(() => {\n      void saveWorkOrderAttachmentDraft(id, images, investorSignature).catch((error) => {\n        console.error('Lokalno spremanje fotografija/potpisa nije uspjelo:', error)\n      })\n    }, 400)\n\n    return () => window.clearTimeout(timer)\n  }, [draftReady, id, images, investorSignature])\n\n  useEffect(() => {\n    if (!draftReady || !id) return\n",
  'separate attachment autosave effect',
)

replaceOnce(
  "      priority, title, description, assignedWorkers, materials, labourPrice, discountRate,\n      vatRate, priceNote, investorName, investorSignature, images,\n    }\n",
  "      priority, title, description, assignedWorkers, materials, labourPrice, discountRate,\n      vatRate, priceNote, investorName,\n    }\n",
  'remove binary recovery payload',
)

replaceOnce(
  "      await saveUserDraft('work-order', `edit:${id}`, recoveryPayload)\n      pendingDraftDirtyRef.current = false\n",
  "      await Promise.all([\n        saveUserDraft('work-order', `edit:${id}`, recoveryPayload),\n        saveWorkOrderAttachmentDraft(id, images, investorSignature),\n      ])\n      pendingDraftDirtyRef.current = false\n",
  'pre-save attachment durability',
)

replaceOnce(
  "      await deleteUserDraft('work-order', `edit:${id}`)\n",
  "      await Promise.all([\n        deleteUserDraft('work-order', `edit:${id}`),\n        deleteWorkOrderAttachmentDraft(id),\n      ])\n",
  'delete attachment draft after success',
)

fs.writeFileSync(path, source)
console.log('Work-order binary attachment drafts separated from structured autosave')
