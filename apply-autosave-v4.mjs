import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function filePath(rel) {
  return path.join(ROOT, rel)
}

function read(rel) {
  const file = filePath(rel)

  if (!fs.existsSync(file)) {
    throw new Error(`Nedostaje datoteka: ${rel}`)
  }

  return fs.readFileSync(file, 'utf8')
}

function write(rel, value) {
  fs.writeFileSync(
    filePath(rel),
    value,
    'utf8',
  )
}

function has(source, snippet) {
  return source.includes(snippet)
}

function insertImport(
  source,
  anchor,
) {
  if (
    has(
      source,
      "from '../services/drafts.service'",
    )
  ) {
    return source
  }

  const addition = `
import DraftAutosaveBadge, {
  type DraftAutosaveState,
} from '../components/DraftAutosaveBadge'
import {
  deleteUserDraft,
  formatDraftSavedAt,
  loadUserDraft,
  saveUserDraft,
} from '../services/drafts.service'
`

  const index =
    source.indexOf(anchor)

  if (index === -1) {
    throw new Error(
      `Nisam pronašao import marker: ${anchor}`,
    )
  }

  const lineEnd =
    source.indexOf('\n', index)

  return (
    source.slice(0, lineEnd + 1) +
    addition +
    source.slice(lineEnd + 1)
  )
}

function insertAfterRegex(
  source,
  regex,
  addition,
  sentinel,
  label,
) {
  if (has(source, sentinel)) {
    return source
  }

  const match =
    source.match(regex)

  if (
    !match ||
    match.index === undefined
  ) {
    throw new Error(
      `Nisam pronašao marker: ${label}`,
    )
  }

  const end =
    match.index +
    match[0].length

  return (
    source.slice(0, end) +
    addition +
    source.slice(end)
  )
}

function insertBefore(
  source,
  marker,
  addition,
  sentinel,
  label,
) {
  if (has(source, sentinel)) {
    return source
  }

  const index =
    source.indexOf(marker)

  if (index === -1) {
    throw new Error(
      `Nisam pronašao marker: ${label}`,
    )
  }

  return (
    source.slice(0, index) +
    addition +
    source.slice(index)
  )
}

function insertAfterOpeningTag(
  source,
  regex,
  addition,
  sentinel,
  label,
) {
  if (has(source, sentinel)) {
    return source
  }

  const match =
    source.match(regex)

  if (
    !match ||
    match.index === undefined
  ) {
    throw new Error(
      `Nisam pronašao JSX marker: ${label}`,
    )
  }

  const end =
    match.index +
    match[0].length

  return (
    source.slice(0, end) +
    '\n' +
    addition +
    source.slice(end)
  )
}

function injectBeforeRegexOptional(
  source,
  regex,
  addition,
  sentinel,
  label,
) {
  if (has(source, sentinel)) {
    return source
  }

  const match =
    source.match(regex)

  if (
    !match ||
    match.index === undefined
  ) {
    console.warn(
      `⚠️ Preskačem ${label} - marker nije pronađen.`,
    )
    return source
  }

  return (
    source.slice(0, match.index) +
    addition +
    source.slice(match.index)
  )
}

// ==================================================
// 1. RADNI NALOG
// ==================================================
{
  const rel =
    'src/pages/NewWorkOrderPage.tsx'

  let source = read(rel)

  source =
    insertImport(
      source,
      "import { fileToCompressedDataUrl } from '../utils/imageUtils'",
    )

  source =
    insertAfterRegex(
      source,
      /const\s*\[\s*isSavingTemplate,\s*setIsSavingTemplate,\s*\]\s*=\s*useState\(false\)/m,
      `

  const [
    autosaveState,
    setAutosaveState,
  ] = useState<DraftAutosaveState>('idle')

  const [
    autosaveText,
    setAutosaveText,
  ] = useState('')

  const [
    draftReady,
    setDraftReady,
  ] = useState(false)
`,
      "useState<DraftAutosaveState>('idle')",
      'autosave state radnog naloga',
    )

  source =
    insertBefore(
      source,
      '  const durationMinutes =',
      `

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const draft =
          await loadUserDraft<any>(
            'work-order',
            'new',
          )

        if (
          cancelled ||
          !draft
        ) {
          return
        }

        const value =
          draft.payload ?? {}

        setCustomerId(value.customerId ?? '')
        setCustomerName(value.customerName ?? '')
        setCustomerContactPerson(
          value.customerContactPerson ?? '',
        )
        setCustomerPhone(value.customerPhone ?? '')
        setCustomerEmail(value.customerEmail ?? '')
        setCustomerOib(value.customerOib ?? '')
        setAddress(value.address ?? '')
        setDate(value.date ?? date)
        setArrivalTime(value.arrivalTime ?? '')
        setDepartureTime(value.departureTime ?? '')
        setStatus(value.status ?? 'Novi')
        setPriority(value.priority ?? 'Normalan')
        setTitle(value.title ?? '')
        setDescription(value.description ?? '')
        setAssignedWorkers(
          Array.isArray(value.assignedWorkers)
            ? value.assignedWorkers
            : [],
        )
        setMaterials(
          Array.isArray(value.materials)
            ? value.materials
            : [],
        )
        setLabourPrice(value.labourPrice ?? '0')
        setVatRate(value.vatRate ?? '25')
        setPriceNote(value.priceNote ?? '')
        setInvestorName(value.investorName ?? '')
        setInvestorSignature(
          value.investorSignature ?? '',
        )
        setImages(
          Array.isArray(value.images)
            ? value.images
            : [],
        )
        setSelectedTemplateId(
          value.selectedTemplateId ?? '',
        )

        setAutosaveState('restored')
        setAutosaveText(
          \`Nastavljen nedovršeni radni nalog · \${formatDraftSavedAt(
            draft.updatedAt,
          )}\`,
        )
      } catch (error) {
        console.error(
          'Nacrt radnog naloga nije moguće učitati:',
          error,
        )
      } finally {
        if (!cancelled) {
          setDraftReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!draftReady) {
      return
    }

    const hasContent =
      Boolean(
        customerId ||
        title.trim() ||
        description.trim() ||
        materials.length ||
        images.length ||
        investorSignature,
      )

    if (!hasContent) {
      return
    }

    const timer =
      window.setTimeout(() => {
        void (async () => {
          try {
            setAutosaveState('saving')

            const savedAt =
              await saveUserDraft(
                'work-order',
                'new',
                {
                  customerId,
                  customerName,
                  customerContactPerson,
                  customerPhone,
                  customerEmail,
                  customerOib,
                  address,
                  date,
                  arrivalTime,
                  departureTime,
                  status,
                  priority,
                  title,
                  description,
                  assignedWorkers,
                  materials,
                  labourPrice,
                  vatRate,
                  priceNote,
                  investorName,
                  investorSignature,
                  images,
                  selectedTemplateId,
                },
              )

            setAutosaveState(
              navigator.onLine
                ? 'saved'
                : 'offline',
            )

            setAutosaveText(
              formatDraftSavedAt(
                savedAt,
              ),
            )
          } catch (error) {
            console.error(
              'Autosave radnog naloga nije uspio:',
              error,
            )
            setAutosaveState('offline')
            setAutosaveText(
              'Nacrt je spremljen lokalno.',
            )
          }
        })()
      }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    draftReady,
    customerId,
    customerName,
    customerContactPerson,
    customerPhone,
    customerEmail,
    customerOib,
    address,
    date,
    arrivalTime,
    departureTime,
    status,
    priority,
    title,
    description,
    assignedWorkers,
    materials,
    labourPrice,
    vatRate,
    priceNote,
    investorName,
    investorSignature,
    images,
    selectedTemplateId,
  ])

  async function discardWorkOrderDraft() {
    if (
      !window.confirm(
        'Odbaciti nedovršeni radni nalog?',
      )
    ) {
      return
    }

    await deleteUserDraft(
      'work-order',
      'new',
    )

    window.location.reload()
  }
`,
      'discardWorkOrderDraft()',
      'autosave logic radnog naloga',
    )

  source =
    injectBeforeRegexOptional(
      source,
      /navigate\s*\(\s*`\/work-orders\/\$\{createdOrder\.id\}`\s*\)/m,
      `      await deleteUserDraft(
        'work-order',
        'new',
      )

`,
      "deleteUserDraft(\n        'work-order'",
      'brisanje nacrta radnog naloga',
    )

  source =
    insertAfterOpeningTag(
      source,
      /<form\b[\s\S]*?>/,
      `      <DraftAutosaveBadge
        state={autosaveState}
        text={autosaveText}
        onDiscard={
          autosaveState !== 'idle'
            ? () =>
                void discardWorkOrderDraft()
            : undefined
        }
      />`,
      '<DraftAutosaveBadge',
      'badge radnog naloga',
    )

  write(rel, source)
  console.log('✅ Radni nalog')
}

// ==================================================
// 2. PONUDA
// ==================================================
{
  const rel =
    'src/pages/NewOfferPage.tsx'

  let source = read(rel)

  source =
    insertImport(
      source,
      "import FersysLoader from '../components/FersysLoader'",
    )

  source =
    insertAfterRegex(
      source,
      /export function NewOfferPage\(\) \{/m,
      `

  const [
    autosaveState,
    setAutosaveState,
  ] = useState<DraftAutosaveState>('idle')

  const [
    autosaveText,
    setAutosaveText,
  ] = useState('')

  const [
    draftReady,
    setDraftReady,
  ] = useState(false)
`,
      "useState<DraftAutosaveState>('idle')",
      'autosave state ponude',
    )

  source =
    insertBefore(
      source,
      '  const isEditing = Boolean(editingOffer)',
      `

  useEffect(() => {
    if (
      offerId ||
      duplicateId
    ) {
      setDraftReady(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const draft =
          await loadUserDraft<any>(
            'offer',
            'new',
          )

        if (
          cancelled ||
          !draft
        ) {
          return
        }

        const value =
          draft.payload ?? {}

        setDate(value.date ?? date)
        setValidUntil(value.validUntil ?? validUntil)
        setCustomerId(value.customerId ?? '')
        setCustomerType(value.customerType ?? 'Fizička osoba')
        setCustomerName(value.customerName ?? '')
        setOib(value.oib ?? '')
        setEmail(value.email ?? '')
        setPhone(value.phone ?? '')
        setAddress(value.address ?? '')
        setPostalCode(value.postalCode ?? '')
        setCity(value.city ?? 'Slavonski Brod')
        setDescription(value.description ?? '')
        setInternalNote(value.internalNote ?? '')
        setPaymentTerms(
          value.paymentTerms ??
            'Plaćanje po završetku radova.',
        )
        setResponsiblePerson(
          value.responsiblePerson ??
            responsiblePerson,
        )
        setItems(
          Array.isArray(value.items) &&
          value.items.length
            ? value.items
            : [createEmptyItem()],
        )
        setCustomerSearch(
          value.customerSearch ??
            value.customerName ??
            '',
        )

        setAutosaveState('restored')
        setAutosaveText(
          \`Nastavljena nedovršena ponuda · \${formatDraftSavedAt(
            draft.updatedAt,
          )}\`,
        )
      } finally {
        if (!cancelled) {
          setDraftReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [offerId, duplicateId])

  useEffect(() => {
    if (
      !draftReady ||
      offerId ||
      duplicateId
    ) {
      return
    }

    const hasContent =
      Boolean(
        customerName.trim() ||
        description.trim() ||
        items.some(
          (item) =>
            item.name.trim(),
        ),
      )

    if (!hasContent) {
      return
    }

    const timer =
      window.setTimeout(() => {
        void (async () => {
          setAutosaveState('saving')

          const savedAt =
            await saveUserDraft(
              'offer',
              'new',
              {
                date,
                validUntil,
                customerId,
                customerType,
                customerName,
                oib,
                email,
                phone,
                address,
                postalCode,
                city,
                description,
                internalNote,
                paymentTerms,
                responsiblePerson,
                items,
                customerSearch,
              },
            )

          setAutosaveState(
            navigator.onLine
              ? 'saved'
              : 'offline',
          )

          setAutosaveText(
            formatDraftSavedAt(
              savedAt,
            ),
          )
        })()
      }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    draftReady,
    offerId,
    duplicateId,
    date,
    validUntil,
    customerId,
    customerType,
    customerName,
    oib,
    email,
    phone,
    address,
    postalCode,
    city,
    description,
    internalNote,
    paymentTerms,
    responsiblePerson,
    items,
    customerSearch,
  ])

  async function discardOfferDraft() {
    if (
      !window.confirm(
        'Odbaciti nedovršenu ponudu?',
      )
    ) {
      return
    }

    await deleteUserDraft(
      'offer',
      'new',
    )

    window.location.reload()
  }
`,
      'discardOfferDraft()',
      'autosave logic ponude',
    )

  source =
    injectBeforeRegexOptional(
      source,
      /setOfferNumber\s*\(\s*savedOffer\.offerNumber\s*\)/m,
      `      if (
        !isEditing &&
        !isDuplicating
      ) {
        await deleteUserDraft(
          'offer',
          'new',
        )
      }

`,
      "deleteUserDraft(\n          'offer'",
      'brisanje nacrta ponude',
    )

  source =
    insertAfterOpeningTag(
      source,
      /<section className="mx-auto w-full max-w-\[1800px\] pb-12">/,
      `      <DraftAutosaveBadge
        state={autosaveState}
        text={autosaveText}
        onDiscard={
          !isEditing &&
          !isDuplicating &&
          autosaveState !== 'idle'
            ? () =>
                void discardOfferDraft()
            : undefined
        }
      />`,
      '<DraftAutosaveBadge',
      'badge ponude',
    )

  write(rel, source)
  console.log('✅ Ponuda')
}

// ==================================================
// 3. RAČUN
// ==================================================
{
  const rel =
    'src/pages/NewInvoicePage.tsx'

  let source = read(rel)

  source =
    insertImport(
      source,
      "import type { Customer as CompanyCustomer } from '../types/customer'",
    )

  source =
    insertAfterRegex(
      source,
      /export function NewInvoicePage\(\) \{/m,
      `

  const [
    autosaveState,
    setAutosaveState,
  ] = useState<DraftAutosaveState>('idle')

  const [
    autosaveText,
    setAutosaveText,
  ] = useState('')

  const [
    draftReady,
    setDraftReady,
  ] = useState(false)
`,
      "useState<DraftAutosaveState>('idle')",
      'autosave state računa',
    )

  source =
    insertBefore(
      source,
      '  const customerSuggestions = useMemo(() => {',
      `

  useEffect(() => {
    if (
      isEditing ||
      isDuplicating ||
      sourceOffer
    ) {
      setDraftReady(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const draft =
          await loadUserDraft<any>(
            'invoice',
            'new',
          )

        if (
          cancelled ||
          !draft
        ) {
          return
        }

        const value =
          draft.payload ?? {}

        setInvoiceNumber(value.invoiceNumber ?? invoiceNumber)
        setIssueDate(value.issueDate ?? issueDate)
        setServiceDate(value.serviceDate ?? serviceDate)
        setDueDate(value.dueDate ?? dueDate)
        setCustomerType(value.customerType ?? 'Fizička osoba')
        setCustomerName(value.customerName ?? '')
        setOib(value.oib ?? '')
        setEmail(value.email ?? '')
        setPhone(value.phone ?? '')
        setAddress(value.address ?? '')
        setCity(value.city ?? 'Slavonski Brod')
        setResponsiblePerson(
          value.responsiblePerson ??
            responsiblePerson,
        )
        setDescription(value.description ?? '')
        setInternalNote(value.internalNote ?? '')
        setPaymentMethod(
          value.paymentMethod ??
            'Transakcijski račun',
        )
        setPaymentModel(value.paymentModel ?? 'HR00')
        setPaymentReference(
          value.paymentReference ??
            paymentReference,
        )
        setIban(value.iban ?? '')
        setItems(
          Array.isArray(value.items) &&
          value.items.length
            ? value.items
            : [createEmptyItem()],
        )
        setCustomerSearch(
          value.customerSearch ??
            value.customerName ??
            '',
        )

        setAutosaveState('restored')
        setAutosaveText(
          \`Nastavljen nedovršeni račun · \${formatDraftSavedAt(
            draft.updatedAt,
          )}\`,
        )
      } finally {
        if (!cancelled) {
          setDraftReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (
      !draftReady ||
      isEditing ||
      isDuplicating ||
      sourceOffer
    ) {
      return
    }

    const hasContent =
      Boolean(
        customerName.trim() ||
        description.trim() ||
        items.some(
          (item) =>
            item.name.trim(),
        ),
      )

    if (!hasContent) {
      return
    }

    const timer =
      window.setTimeout(() => {
        void (async () => {
          setAutosaveState('saving')

          const savedAt =
            await saveUserDraft(
              'invoice',
              'new',
              {
                invoiceNumber,
                issueDate,
                serviceDate,
                dueDate,
                customerType,
                customerName,
                oib,
                email,
                phone,
                address,
                city,
                responsiblePerson,
                description,
                internalNote,
                paymentMethod,
                paymentModel,
                paymentReference,
                iban,
                items,
                customerSearch,
              },
            )

          setAutosaveState(
            navigator.onLine
              ? 'saved'
              : 'offline',
          )

          setAutosaveText(
            formatDraftSavedAt(
              savedAt,
            ),
          )
        })()
      }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    draftReady,
    isEditing,
    isDuplicating,
    sourceOffer,
    invoiceNumber,
    issueDate,
    serviceDate,
    dueDate,
    customerType,
    customerName,
    oib,
    email,
    phone,
    address,
    city,
    responsiblePerson,
    description,
    internalNote,
    paymentMethod,
    paymentModel,
    paymentReference,
    iban,
    items,
    customerSearch,
  ])

  async function discardInvoiceDraft() {
    if (
      !window.confirm(
        'Odbaciti nedovršeni račun?',
      )
    ) {
      return
    }

    await deleteUserDraft(
      'invoice',
      'new',
    )

    window.location.reload()
  }
`,
      'discardInvoiceDraft()',
      'autosave logic računa',
    )

  source =
    injectBeforeRegexOptional(
      source,
      /localStorage\.setItem\s*\(\s*STORAGE_KEY\s*,\s*JSON\.stringify\(updated\)\s*\)/m,
      ``,
      '__invoice_save_marker__',
      'marker spremanja računa',
    )

  if (
    !has(
      source,
      "deleteUserDraft(\n        'invoice'",
    )
  ) {
    source = source.replace(
      /localStorage\.setItem\s*\(\s*STORAGE_KEY\s*,\s*JSON\.stringify\(updated\)\s*\)/m,
      (match) =>
        `${match}

    if (
      !isEditing &&
      !isDuplicating &&
      !sourceOffer
    ) {
      void deleteUserDraft(
        'invoice',
        'new',
      )
    }`,
    )
  }

  source =
    insertAfterOpeningTag(
      source,
      /<section className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8">/,
      `      <DraftAutosaveBadge
        state={autosaveState}
        text={autosaveText}
        onDiscard={
          !isEditing &&
          !isDuplicating &&
          !sourceOffer &&
          autosaveState !== 'idle'
            ? () =>
                void discardInvoiceDraft()
            : undefined
        }
      />`,
      '<DraftAutosaveBadge',
      'badge računa',
    )

  write(rel, source)
  console.log('✅ Izlazni račun')
}

// ==================================================
// 4. NOVI ARTIKL
// ==================================================
{
  const rel =
    'src/pages/NewInventoryItemPage.tsx'

  let source = read(rel)

  source =
    insertImport(
      source,
      "import { fileToCompressedDataUrl } from '../utils/imageUtils'",
    )

  source =
    insertAfterRegex(
      source,
      /export function NewInventoryItemPage\(\) \{/m,
      `

  const [
    autosaveState,
    setAutosaveState,
  ] = useState<DraftAutosaveState>('idle')

  const [
    autosaveText,
    setAutosaveText,
  ] = useState('')

  const [
    draftReady,
    setDraftReady,
  ] = useState(false)
`,
      "useState<DraftAutosaveState>('idle')",
      'autosave state artikla',
    )

  source =
    insertBefore(
      source,
      '  const availableSubcategories = useMemo(',
      `

  useEffect(() => {
    if (id) {
      setDraftReady(true)
      return
    }

    let cancelled = false

    void (async () => {
      try {
        const draft =
          await loadUserDraft<any>(
            'inventory-item',
            'new',
          )

        if (
          cancelled ||
          !draft
        ) {
          return
        }

        const value =
          draft.payload ?? {}

        setForm({
          ...INITIAL_FORM,
          ...(value.form ?? {}),
        })

        setMainImage(value.mainImage ?? '')

        setAdditionalImages(
          Array.isArray(value.additionalImages)
            ? value.additionalImages
            : [],
        )

        if (
          Array.isArray(
            value.locationQuantities,
          )
        ) {
          setLocationQuantities(
            value.locationQuantities,
          )
        }

        setAutosaveState('restored')
        setAutosaveText(
          \`Nastavljen nedovršeni artikl · \${formatDraftSavedAt(
            draft.updatedAt,
          )}\`,
        )
      } finally {
        if (!cancelled) {
          setDraftReady(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])

  useEffect(() => {
    if (
      !draftReady ||
      id
    ) {
      return
    }

    const hasContent =
      Boolean(
        form.name.trim() ||
        form.shortName.trim() ||
        form.barcode.trim() ||
        form.description.trim() ||
        mainImage ||
        additionalImages.length ||
        locationQuantities.some(
          (location) =>
            location.quantity.trim(),
        ),
      )

    if (!hasContent) {
      return
    }

    const timer =
      window.setTimeout(() => {
        void (async () => {
          setAutosaveState('saving')

          const savedAt =
            await saveUserDraft(
              'inventory-item',
              'new',
              {
                form,
                mainImage,
                additionalImages,
                locationQuantities,
              },
            )

          setAutosaveState(
            navigator.onLine
              ? 'saved'
              : 'offline',
          )

          setAutosaveText(
            formatDraftSavedAt(
              savedAt,
            ),
          )
        })()
      }, 1200)

    return () => {
      window.clearTimeout(timer)
    }
  }, [
    draftReady,
    id,
    form,
    mainImage,
    additionalImages,
    locationQuantities,
  ])

  async function discardInventoryDraft() {
    if (
      !window.confirm(
        'Odbaciti nedovršeni artikl?',
      )
    ) {
      return
    }

    await deleteUserDraft(
      'inventory-item',
      'new',
    )

    window.location.reload()
  }
`,
      'discardInventoryDraft()',
      'autosave logic artikla',
    )

  source =
    injectBeforeRegexOptional(
      source,
      /navigate\s*\(\s*`\/inventory\/items\/\$\{created\.id\}`\s*\)/m,
      `      await deleteUserDraft(
        'inventory-item',
        'new',
      )

`,
      "deleteUserDraft(\n        'inventory-item'",
      'brisanje nacrta artikla',
    )

  source =
    insertAfterOpeningTag(
      source,
      /<form\b[\s\S]*?onSubmit=\{handleSubmit\}[\s\S]*?>/,
      `      <DraftAutosaveBadge
        state={autosaveState}
        text={autosaveText}
        onDiscard={
          !id &&
          autosaveState !== 'idle'
            ? () =>
                void discardInventoryDraft()
            : undefined
        }
      />`,
      '<DraftAutosaveBadge',
      'badge artikla',
    )

  write(rel, source)
  console.log('✅ Novi artikl')
}

console.log('')
console.log('✅ AUTOSAVE V4 ZAVRŠEN')
console.log('✅ Svaki korisnik ima samo svoje nacrte')
console.log('✅ Svaka firma ima odvojene nacrte')
console.log('✅ Lokalno + Supabase cloud spremanje')
console.log('')
console.log('Sada pokreni: npm run build')
