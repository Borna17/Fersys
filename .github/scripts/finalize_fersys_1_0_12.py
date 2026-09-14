from pathlib import Path


def replace(path, old, new, required=True):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        if required:
            raise SystemExit(f'Anchor not found in {path}: {old[:80]!r}')
        return False
    p.write_text(text.replace(old, new), encoding='utf-8')
    return True

# Fix corrupted Croatian quantity label in the work-order editor and keep the PDF safe
# on embedded/native fonts that have previously rendered diacritics as boxes.
for name in ['src/pages/EditWorkOrderPage.tsx', 'src/pages/NewWorkOrderPage.tsx', 'src/utils/workOrderPdf.ts']:
    p = Path(name)
    text = p.read_text(encoding='utf-8')
    text = text.replace('KoliÄina', 'Kolicina').replace('Količina', 'Kolicina')
    p.write_text(text, encoding='utf-8')

ai = Path('src/pages/AiAssistantPage.tsx')
text = ai.read_text(encoding='utf-8')
text = text.replace("from '@capacitor-community/speech-recognition'", "from '@capgo/capacitor-speech-recognition'")
if "../services/drafts.service" not in text:
    text = text.replace(
        "import { updateWorkOrderQuickStatus } from '../services/quickStatus.service'",
        "import { updateWorkOrderQuickStatus } from '../services/quickStatus.service'\nimport { saveUserDraft } from '../services/drafts.service'\nimport { tryHandleEmployeeTimeAiCommand } from '../services/employeeTime.service'",
    )
old_create = """    if (action.type === 'create_work_order') {
      sessionStorage.setItem(
        'fersys_ai_work_order_prefill',
        JSON.stringify(payload),
      )
      navigate('/work-orders/new')
      return
    }
"""
new_create = """    if (action.type === 'create_work_order') {
      const aiDraft = {
        ...payload,
        date: String(payload.date ?? '').trim() || new Date().toISOString().slice(0, 10),
        status: String(payload.status ?? '').trim() || 'Novi',
        priority: String(payload.priority ?? '').trim() || 'Normalan',
        title: String(payload.title ?? payload.workOrderTitle ?? '').trim(),
        description: String(payload.description ?? payload.workDescription ?? payload.notes ?? '').trim(),
        customerName: String(payload.customerName ?? payload.customer ?? '').trim(),
        investorName: String(payload.investorName ?? payload.contactPerson ?? '').trim(),
        address: String(payload.address ?? payload.location ?? '').trim(),
      }

      // AI nacrt se odmah sprema u isti cloud/local autosave sustav kao ručno
      // izrađen radni nalog. Tako se ne može izgubiti zatvaranjem ekrana.
      await saveUserDraft('work-order', 'new', aiDraft)
      sessionStorage.setItem(
        'fersys_ai_work_order_prefill',
        JSON.stringify(aiDraft),
      )
      navigate('/work-orders/new')
      return
    }
"""
if old_create in text:
    text = text.replace(old_create, new_create)
else:
    raise SystemExit('AI create_work_order anchor missing')
old_ask = """    try {
      const response =
        await askAiAssistant(
          clean,
          conversation,
        )
"""
new_ask = """    try {
      const employeeTimeResult =
        await tryHandleEmployeeTimeAiCommand(clean)

      if (employeeTimeResult) {
        setMessages((current) => [
          ...current,
          createMessage('assistant', employeeTimeResult),
        ])
        return
      }

      const response =
        await askAiAssistant(
          clean,
          conversation,
        )
"""
if old_ask in text:
    text = text.replace(old_ask, new_ask)
else:
    raise SystemExit('AI sendMessage anchor missing')
ai.write_text(text, encoding='utf-8')

# AI-created cloud draft must restore immediately without asking the user to confirm
# the draft they just requested in the previous screen.
replace(
    'src/pages/NewWorkOrderPage.tsx',
    """        const continueDraft = window.confirm(
          `Pronađen je nedovršeni radni nalog (${formatDraftSavedAt(draft.updatedAt)}).\\n\\nOK = nastavi nedovršeni nalog\\nOdustani = odbaci ga i započni novi.`,
        )
""",
    """        const isAiDraft = Boolean(
          sessionStorage.getItem('fersys_ai_work_order_prefill'),
        )
        const continueDraft = isAiDraft || window.confirm(
          `Pronađen je nedovršeni radni nalog (${formatDraftSavedAt(draft.updatedAt)}).\\n\\nOK = nastavi nedovršeni nalog\\nOdustani = odbaci ga i započni novi.`,
        )
""",
)

# Record completed work-order duration in employee time tracking. source_ref makes this
# idempotent if a completed order is saved more than once.
time_path = Path('src/services/employeeTime.service.ts')
time_text = time_path.read_text(encoding='utf-8')
if 'recordWorkOrderHoursFromCompletedOrder' not in time_text:
    time_text += r'''

export async function recordWorkOrderHoursFromCompletedOrder(workOrderId: string) {
  const companyId = await currentCompanyId()
  const { data: order, error } = await supabase
    .from('work_orders')
    .select('id, company_id, work_date, duration_minutes, assigned_workers, status')
    .eq('id', workOrderId)
    .eq('company_id', companyId)
    .maybeSingle()
  if (error) throw error
  if (!order || order.status !== 'Završen') return

  const durationHours = Math.max(0, Number(order.duration_minutes) || 0) / 60
  const names = Array.isArray(order.assigned_workers)
    ? order.assigned_workers.filter((value): value is string => typeof value === 'string')
    : []
  if (!durationHours || !names.length) return

  const workers = await getWorkforcePeople()
  for (const name of names) {
    const key = normalized(name.trim())
    const worker = workers.find((candidate) => normalized(candidate.fullName.trim()) === key)
    if (!worker) continue
    await saveEmployeeTimeEntry({
      workerId: worker.id,
      workOrderId,
      workDate: order.work_date,
      startTime: '',
      endTime: '',
      breakMinutes: 0,
      regularHours: durationHours,
      overtimeHours: 0,
      nightHours: 0,
      sundayHours: 0,
      holidayHours: 0,
      vacationHours: 0,
      sickLeaveHours: 0,
      paidLeaveHours: 0,
      travelHours: 0,
      note: 'Automatski iz završenog radnog naloga',
      source: 'work_order',
      sourceRef: `work-order:${workOrderId}`,
    })
  }
}
'''
    time_path.write_text(time_text, encoding='utf-8')

# Work-order normal save path.
wo = Path('src/services/workOrders.service.ts')
wo_text = wo.read_text(encoding='utf-8')
if "recordWorkOrderHoursFromCompletedOrder" not in wo_text:
    wo_text = wo_text.replace(
        "import { readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'",
        "import { readRuntimeCache, writeRuntimeCache } from './runtimeCache.service'\nimport { recordWorkOrderHoursFromCompletedOrder } from './employeeTime.service'",
    )
    anchor = """  if (
    input.status === 'Završen' &&
    existing.status !== 'Završen'
  ) {
"""
    replacement = """  if (
    input.status === 'Završen' &&
    existing.status !== 'Završen'
  ) {
    void recordWorkOrderHoursFromCompletedOrder(workOrderId).catch((timeError) => {
      console.warn('[FERSYS] Radni sati iz završenog naloga nisu evidentirani:', timeError)
    })
"""
    if anchor not in wo_text:
        raise SystemExit('workOrders completed anchor missing')
    wo_text = wo_text.replace(anchor, replacement)
    wo.write_text(wo_text, encoding='utf-8')

# Quick-status completion path.
quick = Path('src/services/quickStatus.service.ts')
q = quick.read_text(encoding='utf-8')
if "recordWorkOrderHoursFromCompletedOrder" not in q:
    q = q.replace(
        "import type {\n  CloudWorkOrderStatus,\n} from './workOrders.service'",
        "import type {\n  CloudWorkOrderStatus,\n} from './workOrders.service'\nimport { recordWorkOrderHoursFromCompletedOrder } from './employeeTime.service'",
    )
    q = q.replace(
        """  if (error) {
    throw new Error(
      `Status radnog naloga nije moguće spremiti: ${error.message}`,
    )
  }
}
""",
        """  if (error) {
    throw new Error(
      `Status radnog naloga nije moguće spremiti: ${error.message}`,
    )
  }

  if (status === 'Završen') {
    await recordWorkOrderHoursFromCompletedOrder(workOrderId).catch((timeError) => {
      console.warn('[FERSYS] Radni sati iz završenog naloga nisu evidentirani:', timeError)
    })
  }
}
""",
    )
    quick.write_text(q, encoding='utf-8')

# Automatically make all current FERSYS employees available in the time module.
page = Path('src/pages/EmployeeTimePage.tsx')
page_text = page.read_text(encoding='utf-8')
page_text = page_text.replace(
    "useEffect(() => { void load() }, [year, month])",
    """useEffect(() => {
    void (async () => {
      try {
        await syncAppEmployees(await getEmployees())
      } catch (syncError) {
        console.warn('[FERSYS] Zaposlenike nije moguće automatski povezati s evidencijom sati:', syncError)
      }
      await load()
    })()
  }, [year, month])""",
)
page.write_text(page_text, encoding='utf-8')

print('FERSYS 1.0.12 stabilization source patches applied.')
