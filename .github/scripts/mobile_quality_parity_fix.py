from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# 1) Mobile sidebar cleanup: settings are already available from profile menu.
path = Path('src/components/Sidebar.tsx')
text = path.read_text(encoding='utf-8')
pattern = re.compile(r'''\n\s*<NavLink\n\s*to="/account"[\s\S]*?Moje postavke[\s\S]*?</NavLink>\n\n\s*\{can\('settings\.manage'\) && \([\s\S]*?Postavke firme[\s\S]*?</NavLink>\n\s*\)\}''', re.M)
next_text, count = pattern.subn('\n', text, count=1)
if count != 1:
    raise SystemExit('Sidebar settings block not found')
path.write_text(next_text, encoding='utf-8')

# 2) Google Calendar: persist native GIS token and auto-sync saved events.
path = Path('src/pages/CalendarPage.tsx')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "type GoogleTokenResponse = {\n  access_token?: string\n  error?: string\n}",
    "type GoogleTokenResponse = {\n  access_token?: string\n  error?: string\n  expires_in?: number\n}",
    'GoogleTokenResponse',
)
anchor = "function getStoredGoogleAccessToken() {\n  const token = window.localStorage.getItem(GOOGLE_TOKEN_KEY) ?? ''\n  const expiresAt = Number(window.localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY) ?? 0)\n\n  if (!token || !expiresAt || Date.now() >= expiresAt) {\n    window.localStorage.removeItem(GOOGLE_TOKEN_KEY)\n    window.localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY)\n    return ''\n  }\n\n  return token\n}\n"
helper = anchor + "\nfunction storeGoogleAccessToken(token: string, expiresIn = 3600) {\n  const safeLifetime = Math.max(60, Number(expiresIn || 3600) - 60)\n  window.localStorage.setItem(GOOGLE_TOKEN_KEY, token)\n  window.localStorage.setItem(\n    GOOGLE_TOKEN_EXPIRY_KEY,\n    String(Date.now() + safeLifetime * 1000),\n  )\n}\n\nfunction clearGoogleAccessToken() {\n  window.localStorage.removeItem(GOOGLE_TOKEN_KEY)\n  window.localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY)\n}\n"
text = replace_once(text, anchor, helper, 'Google token helper')
old_callback = """            setGoogleAccessToken(\n              response.access_token,\n            )\n            setMessage(\n              'Google Kalendar je povezan.',\n            )"""
new_callback = """            storeGoogleAccessToken(\n              response.access_token,\n              response.expires_in ?? 3600,\n            )\n            setGoogleAccessToken(\n              response.access_token,\n            )\n            window.dispatchEvent(\n              new CustomEvent('fersys:google-calendar-connected'),\n            )\n            setMessage(\n              'Google Kalendar je povezan.',\n            )"""
text = replace_once(text, old_callback, new_callback, 'Google callback persistence')
text = text.replace(
    "    window.localStorage.removeItem(\n      GOOGLE_TOKEN_KEY,\n    )\n    window.localStorage.removeItem(\n      GOOGLE_TOKEN_EXPIRY_KEY,\n    )",
    "    clearGoogleAccessToken()",
    1,
)
# Auto sync after local save. Function declaration is hoisted.
old_saved_message = """      setSelectedDate(\n        form.date,\n      )\n      setIsModalOpen(false)\n      setEditingEventId('')\n      setMessage(editingEventId ? 'Termin je izmijenjen. Svi s pristupom kalendaru dobit će obavijest.' : 'Termin je spremljen. Svi s pristupom kalendaru dobit će obavijest.')"""
new_saved_message = """      setSelectedDate(\n        form.date,\n      )\n      setIsModalOpen(false)\n      setEditingEventId('')\n      setMessage(editingEventId ? 'Termin je izmijenjen. Svi s pristupom kalendaru dobit će obavijest.' : 'Termin je spremljen. Svi s pristupom kalendaru dobit će obavijest.')\n\n      if (googleAccessToken) {\n        await sendToGoogle(saved)\n      }"""
text = replace_once(text, old_saved_message, new_saved_message, 'Auto Google sync')
# Remove early-return for already linked event.
early = """    if (\n      calendarEvent.googleEventId\n    ) {\n      setMessage(\n        'Termin je već povezan s Google Kalendarom.',\n      )\n      return\n    }\n\n"""
if early not in text:
    raise SystemExit('Google early return not found')
text = text.replace(early, '', 1)
# Swap POST endpoint/method to POST-or-PATCH.
old_fetch = """      const response =\n        await fetch(\n          'https://www.googleapis.com/calendar/v3/calendars/primary/events',\n          {\n            method: 'POST',"""
new_fetch = """      const googleUrl = calendarEvent.googleEventId\n        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEvent.googleEventId)}`\n        : 'https://www.googleapis.com/calendar/v3/calendars/primary/events'\n\n      const response =\n        await fetch(\n          googleUrl,\n          {\n            method: calendarEvent.googleEventId ? 'PATCH' : 'POST',"""
text = replace_once(text, old_fetch, new_fetch, 'Google POST/PATCH')
old_api_error = """      if (!response.ok) {\n        throw new Error(\n          'Google API greška.',\n        )\n      }"""
new_api_error = """      if (!response.ok) {\n        if (response.status === 401 || response.status === 403) {\n          clearGoogleAccessToken()\n          setGoogleAccessToken('')\n          throw new Error('Google veza je istekla. Ponovno poveži Google Kalendar.')\n        }\n        throw new Error(\n          'Google API greška.',\n        )\n      }"""
# Replace the last relevant occurrence in sendToGoogle, but okay if import one is first: do both for robust expiry.
text = text.replace(old_api_error, new_api_error)
old_google_id = """            googleEventId:\n              googleEvent.id ??\n              '',"""
new_google_id = """            googleEventId:\n              googleEvent.id ??\n              calendarEvent.googleEventId ??\n              '',"""
text = replace_once(text, old_google_id, new_google_id, 'Google event id preserve')
text = text.replace(
    "        'Termin je poslan u Google Kalendar.',",
    "        calendarEvent.googleEventId\n          ? 'Termin je ažuriran i u Google Kalendaru.'\n          : 'Termin je poslan u Google Kalendar.',",
    1,
)
path.write_text(text, encoding='utf-8')

# 3) Work-order drafts: ignore ghost/empty drafts and ask before restoring.
path = Path('src/pages/NewWorkOrderPage.tsx')
text = path.read_text(encoding='utf-8')
insert_after = """const EMERGENCY_DRAFT_KEY =\n  'fersys_emergency_new_work_order_v1'\n"""
helper = insert_after + """\nfunction hasMeaningfulWorkOrderDraft(\n  value: Record<string, any>,\n) {\n  return Boolean(\n    value.customerId ||\n    String(value.customerName ?? '').trim() ||\n    String(value.address ?? '').trim() ||\n    value.arrivalTime ||\n    value.departureTime ||\n    String(value.title ?? '').trim() ||\n    String(value.description ?? '').trim() ||\n    (Array.isArray(value.assignedWorkers) && value.assignedWorkers.length) ||\n    (Array.isArray(value.materials) && value.materials.length) ||\n    (Array.isArray(value.images) && value.images.length) ||\n    String(value.investorName ?? '').trim() ||\n    value.investorSignature\n  )\n}\n"""
text = replace_once(text, insert_after, helper, 'Draft meaningful helper')
old_value = """        const value =\n          draft.payload ?? {}\n\n        setCustomerId("""
new_value = """        const value =\n          draft.payload ?? {}\n\n        if (!hasMeaningfulWorkOrderDraft(value)) {\n          await deleteUserDraft('work-order', 'new')\n          localStorage.removeItem(EMERGENCY_DRAFT_KEY)\n          if (!cancelled) setDraftReady(true)\n          return\n        }\n\n        const continueDraft = window.confirm(\n          `Pronađen je nedovršeni radni nalog (${formatDraftSavedAt(draft.updatedAt)}).\\n\\nOK = nastavi nedovršeni nalog\\nOdustani = odbaci ga i započni novi.`,\n        )\n\n        if (!continueDraft) {\n          await deleteUserDraft('work-order', 'new')\n          localStorage.removeItem(EMERGENCY_DRAFT_KEY)\n          if (!cancelled) setDraftReady(true)\n          return\n        }\n\n        setCustomerId("""
text = replace_once(text, old_value, new_value, 'Draft restore choice')
path.write_text(text, encoding='utf-8')

print('mobile quality parity patch applied')
