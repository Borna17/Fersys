import fs from 'node:fs'

const path = 'src/pages/EditWorkOrderPage.tsx'
let s = fs.readFileSync(path, 'utf8')

function replaceOnce(oldText, newText, label) {
  if (!s.includes(oldText)) throw new Error(`Missing anchor: ${label}`)
  s = s.replace(oldText, newText)
}

replaceOnce(
`  const pendingDraftDirtyRef = useRef(false)\n`,
`  const pendingDraftDirtyRef = useRef(false)\n  const [staleRecoveryDraft, setStaleRecoveryDraft] = useState<any>(null)\n`,
'stale recovery state',
)

replaceOnce(
`        } else if (draft) {\n          // Never destroy a recoverable local edit because the server base changed.\n          // Keep both versions and surface recovery instead of silently deleting user work.\n          setAutosaveState('restored')\n          setAutosaveText(\n            \`Pronađene su sačuvane izmjene iz prethodne verzije · \${formatDraftSavedAt(draft.updatedAt)}\`,\n          )\n        }\n`,
`        } else if (draft) {\n          // Keep stale edits recoverable instead of silently deleting or applying them.\n          setStaleRecoveryDraft(draft)\n          setAutosaveState('restored')\n          setAutosaveText(\n            \`Pronađene su sačuvane izmjene iz prethodne verzije · \${formatDraftSavedAt(draft.updatedAt)}\`,\n          )\n        }\n`,
'stale recovery capture',
)

replaceOnce(
`        setDraftReady(true)\n        if (!sameBase) {\n          setAutosaveState('saved')\n          setAutosaveText('Automatsko spremanje uključeno')\n        }\n`,
`        setDraftReady(true)\n        if (!sameBase && !draft) {\n          setAutosaveState('saved')\n          setAutosaveText('Automatsko spremanje uključeno')\n        }\n`,
'preserve stale recovery message',
)

replaceOnce(
`  async function submit(event: FormEvent<HTMLFormElement>) {\n`,
`  function restoreStaleRecoveryDraft() {\n    const value = staleRecoveryDraft?.payload\n    if (!value) return\n\n    setCustomerId(value.customerId ?? customerId)\n    setCustomerName(value.customerName ?? customerName)\n    setCustomerContactPerson(value.customerContactPerson ?? customerContactPerson)\n    setCustomerPhone(value.customerPhone ?? customerPhone)\n    setCustomerEmail(value.customerEmail ?? customerEmail)\n    setCustomerOib(value.customerOib ?? customerOib)\n    setAddress(value.address ?? address)\n    setDate(value.date ?? date)\n    setArrivalTime(value.arrivalTime ?? arrivalTime)\n    setDepartureTime(value.departureTime ?? departureTime)\n    setStatus(value.status ?? status)\n    setPriority(value.priority ?? priority)\n    setTitle(value.title ?? title)\n    setDescription(value.description ?? description)\n    if (Array.isArray(value.assignedWorkers)) setAssignedWorkers(value.assignedWorkers)\n    if (Array.isArray(value.materials)) setMaterials(value.materials)\n    setLabourPrice(value.labourPrice ?? labourPrice)\n    setDiscountRate(value.discountRate ?? discountRate)\n    setVatRate(value.vatRate ?? vatRate)\n    setPriceNote(value.priceNote ?? priceNote)\n    setInvestorName(value.investorName ?? investorName)\n    setInvestorSignature(value.investorSignature ?? investorSignature)\n    if (Array.isArray(value.images)) setImages(value.images)\n    setStaleRecoveryDraft(null)\n    setAutosaveState('restored')\n    setAutosaveText('Vraćene su sačuvane izmjene. Pregledajte ih prije spremanja.')\n  }\n\n  async function submit(event: FormEvent<HTMLFormElement>) {\n`,
'restore function',
)

replaceOnce(
`    try {\n      setIsSaving(true)\n      const saved = await updateWorkOrder(id, {\n`,
`    const recoveryPayload = {\n      baseUpdatedAt, customerId, customerName, customerContactPerson, customerPhone,\n      customerEmail, customerOib, address, date, arrivalTime, departureTime, status,\n      priority, title, description, assignedWorkers, materials, labourPrice, discountRate,\n      vatRate, priceNote, investorName, investorSignature, images,\n    }\n\n    try {\n      setIsSaving(true)\n      // Persist the exact form state locally before the network becomes critical.\n      await saveUserDraft('work-order', \`edit:\${id}\`, recoveryPayload)\n      pendingDraftDirtyRef.current = false\n      const saved = await updateWorkOrder(id, {\n`,
'pre-save local snapshot',
)

replaceOnce(
`    } catch (error) {\n      alert(\n`,
`    } catch (error) {\n      // Keep a fresh local recovery copy even when the canonical save fails.\n      try {\n        await saveUserDraft('work-order', \`edit:\${id}\`, recoveryPayload)\n      } catch (draftError) {\n        console.error('Recovery snapshot nakon greške spremanja nije uspio:', draftError)\n      }\n      setAutosaveState('offline')\n      setAutosaveText('Izmjene su sačuvane kao nacrt za oporavak.')\n      alert(\n`,
'save failure recovery',
)

replaceOnce(
`      <DraftAutosaveBadge state={autosaveState} text={autosaveText} />\n      <form\n`,
`      <DraftAutosaveBadge state={autosaveState} text={autosaveText} />\n      {staleRecoveryDraft ? (\n        <section className="mx-auto mb-4 w-full max-w-[1500px] rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-100">\n          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">\n            <div>\n              <p className="font-black">Pronađene su ranije nespremljene izmjene</p>\n              <p className="mt-1 text-sm text-amber-200">Server ima noviju verziju pa ih FERSYS nije automatski pregazio. Možete ih sigurno vratiti i pregledati.</p>\n            </div>\n            <button type="button" onClick={restoreStaleRecoveryDraft} className="min-h-11 shrink-0 rounded-xl bg-amber-400 px-4 font-black text-slate-950">\n              Vrati izmjene\n            </button>\n          </div>\n        </section>\n      ) : null}\n      <form\n`,
'recovery banner',
)

fs.writeFileSync(path, s)
