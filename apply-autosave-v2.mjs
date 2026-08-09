import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()

function read(rel) {
  const file = path.join(ROOT, rel)

  if (!fs.existsSync(file)) {
    throw new Error(`Nedostaje datoteka: ${rel}`)
  }

  return fs.readFileSync(file, 'utf8')
}

function write(rel, value) {
  fs.writeFileSync(
    path.join(ROOT, rel),
    value,
    'utf8',
  )
}

function ensureImport(
  source,
  anchor,
) {
  if (
    source.includes(
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

function addBefore(
  source,
  marker,
  addition,
  label,
) {
  if (
    source.includes(
      addition.trim(),
    )
  ) {
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

function addAfterRegex(
  source,
  regex,
  addition,
  label,
) {
  if (
    source.includes(
      addition.trim(),
    )
  ) {
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

function replaceOnce(
  source,
  marker,
  replacement,
  label,
) {
  if (
    source.includes(
      replacement.trim(),
    )
  ) {
    return source
  }

  if (!source.includes(marker)) {
    throw new Error(
      `Nisam pronašao marker: ${label}`,
    )
  }

  return source.replace(
    marker,
    replacement,
  )
}

function injectAfterOpeningTag(
  source,
  regex,
  addition,
  label,
) {
  if (
    source.includes(
      addition.trim(),
    )
  ) {
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

// --------------------------------------------------
// RADNI NALOG
// --------------------------------------------------
{
  const file =
    'src/pages/NewWorkOrderPage.tsx'

  let source =
    read(file)

  source =
    ensureImport(
      source,
      "import { fileToCompressedDataUrl } from '../utils/imageUtils'",
    )

  source =
    addAfterRegex(
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
      'autosave state NewWorkOrderPage',
    )

  const logic = `

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

    setAutosaveState('saving')

    const timer =
      window.setTimeout(() => {
        void (async () => {
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
`

  source =
    addBefore(
      source,
      '  const durationMinutes =',
      logic,
      'draft logic NewWorkOrderPage',
    )

  source =
    replaceOnce(
      source,
      `      navigate(
        \`/work-orders/\${createdOrder.id}\`,
      )`,
      `      await deleteUserDraft(
        'work-order',
        'new',
      )

      navigate(
        \`/work-orders/\${createdOrder.id}\`,
      )`,
      'clear work order draft',
    )

  source =
    injectAfterOpeningTag(
      source,
      /<form[\s\S]*?>/,
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
      'form NewWorkOrderPage',
    )

  write(file, source)
}

// --------------------------------------------------
// PONUDA
// --------------------------------------------------
{
  const file =
    'src/pages/NewOfferPage.tsx'

  let source =
    read(file)

  source =
    ensureImport(
      source,
      "import FersysLoader from '../components/FersysLoader'",
    )

  source =
    addAfterRegex(
      source,
      /const\s*\[\s*saveMessage,\s*setSaveMessage,\s*\]\s*=\s*useState\(''\)/m,
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
      'state NewOfferPage',
    )

  const logic = `

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
        setValidUntil(
          value.validUntil ?? validUntil,
        )
        setCustomerId(value.customerId ?? '')
        setCustomerType(
          value.customerType ?? 'Fizička osoba',
        )
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
`

  source =
    addBefore(
      source,
      '  const isEditing = Boolean(editingOffer)',
      logic,
      'logic NewOfferPage',
    )

  source =
    replaceOnce(
      source,
      '      setOfferNumber(savedOffer.offerNumber)',
      `      if (
        !isEditing &&
        !isDuplicating
      ) {
        await deleteUserDraft(
          'offer',
          'new',
        )
      }

      setOfferNumber(savedOffer.offerNumber)`,
      'clear offer draft',
    )

  source =
    injectAfterOpeningTag(
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
      'section NewOfferPage',
    )

  write(file, source)
}

// --------------------------------------------------
// RAČUN
// --------------------------------------------------
{
  const file =
    'src/pages/NewInvoicePage.tsx'

  let source =
    read(file)

  source =
    ensureImport(
      source,
      "import type { Customer as CompanyCustomer } from '../types/customer'",
    )

  source =
    addAfterRegex(
      source,
      /const\s*\[\s*customerLoadError,\s*setCustomerLoadError,\s*\]\s*=\s*useState\(''\)/m,
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
      'state NewInvoicePage',
    )

  const logic = `

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

        setInvoiceNumber(
          value.invoiceNumber ??
            invoiceNumber,
        )
        setIssueDate(
          value.issueDate ??
            issueDate,
        )
        setServiceDate(
          value.serviceDate ??
            serviceDate,
        )
        setDueDate(
          value.dueDate ??
            dueDate,
        )
        setCustomerType(
          value.customerType ??
            'Fizička osoba',
        )
        setCustomerName(
          value.customerName ?? '',
        )
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
        setPaymentModel(
          value.paymentModel ??
            'HR00',
        )
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
`

  source =
    addBefore(
      source,
      '  const customerSuggestions = useMemo(() => {',
      logic,
      'logic NewInvoicePage',
    )

  source =
    replaceOnce(
      source,
      '    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))',
      `    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

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
      'clear invoice draft',
    )

  source =
    injectAfterOpeningTag(
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
      'section NewInvoicePage',
    )

  write(file, source)
}

// --------------------------------------------------
// NOVI ARTIKL
// --------------------------------------------------
{
  const file =
    'src/pages/NewInventoryItemPage.tsx'

  let source =
    read(file)

  source =
    ensureImport(
      source,
      "import { fileToCompressedDataUrl } from '../utils/imageUtils'",
    )

  source =
    addAfterRegex(
      source,
      /const\s*\[\s*errorMessage,\s*setErrorMessage,\s*\]\s*=\s*useState\(''\)/m,
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
      'state Inventory',
    )

  const logic = `

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

        setMainImage(
          value.mainImage ?? '',
        )

        setAdditionalImages(
          Array.isArray(
            value.additionalImages,
          )
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
`

  source =
    addBefore(
      source,
      '  const availableSubcategories = useMemo(',
      logic,
      'logic Inventory',
    )

  source =
    replaceOnce(
      source,
      `      navigate(
        \`/inventory/items/\${created.id}\`,
      )`,
      `      await deleteUserDraft(
        'inventory-item',
        'new',
      )

      navigate(
        \`/inventory/items/\${created.id}\`,
      )`,
      'clear inventory draft',
    )

  source =
    injectAfterOpeningTag(
      source,
      /<form[\s\S]*?onSubmit=\{handleSubmit\}[\s\S]*?>/,
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
      'form Inventory',
    )

  write(file, source)
}

console.log('')
console.log('✅ Autosave V2 je dodan.')
console.log('✅ Radni nalog')
console.log('✅ Ponuda')
console.log('✅ Izlazni račun')
console.log('✅ Novi artikl')
console.log('✅ Svaki USER je potpuno odvojen.')
console.log('✅ Svaka FIRMA je potpuno odvojena.')
console.log('')
console.log('Sada pokreni: npm run build')
