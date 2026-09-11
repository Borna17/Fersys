from pathlib import Path


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# 1) Mobile sidebar cleanup: settings are already available from the profile menu.
path = Path('src/components/Sidebar.tsx')
text = path.read_text(encoding='utf-8')
start = text.find('      <NavLink\n        to="/account"')
end_marker = '      <UserCard\n'
end = text.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Sidebar settings block not found')
text = text[:start] + text[end:]
path.write_text(text, encoding='utf-8')

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
old_saved_message = """      setSelectedDate(\n        form.date,\n      )\n      setIsModalOpen(false)\n      setEditingEventId('')\n      setMessage(editingEventId ? 'Termin je izmijenjen. Svi s pristupom kalendaru dobit će obavijest.' : 'Termin je spremljen. Svi s pristupom kalendaru dobit će obavijest.')"""
new_saved_message = """      setSelectedDate(\n        form.date,\n      )\n      setIsModalOpen(false)\n      setEditingEventId('')\n      setMessage(editingEventId ? 'Termin je izmijenjen. Svi s pristupom kalendaru dobit će obavijest.' : 'Termin je spremljen. Svi s pristupom kalendaru dobit će obavijest.')\n\n      if (googleAccessToken) {\n        await sendToGoogle(saved)\n      }"""
text = replace_once(text, old_saved_message, new_saved_message, 'Auto Google sync')
early = """    if (\n      calendarEvent.googleEventId\n    ) {\n      setMessage(\n        'Termin je već povezan s Google Kalendarom.',\n      )\n      return\n    }\n\n"""
if early not in text:
    raise SystemExit('Google early return not found')
text = text.replace(early, '', 1)
old_fetch = """      const response =\n        await fetch(\n          'https://www.googleapis.com/calendar/v3/calendars/primary/events',\n          {\n            method: 'POST',"""
new_fetch = """      const googleUrl = calendarEvent.googleEventId\n        ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(calendarEvent.googleEventId)}`\n        : 'https://www.googleapis.com/calendar/v3/calendars/primary/events'\n\n      const response =\n        await fetch(\n          googleUrl,\n          {\n            method: calendarEvent.googleEventId ? 'PATCH' : 'POST',"""
text = replace_once(text, old_fetch, new_fetch, 'Google POST/PATCH')
old_api_error = """      if (!response.ok) {\n        throw new Error(\n          'Google API greška.',\n        )\n      }"""
new_api_error = """      if (!response.ok) {\n        if (response.status === 401 || response.status === 403) {\n          clearGoogleAccessToken()\n          setGoogleAccessToken('')\n          throw new Error('Google veza je istekla. Ponovno poveži Google Kalendar.')\n        }\n        throw new Error(\n          'Google API greška.',\n        )\n      }"""
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

# 4) Email Center campaigns also create in-app/push notifications.
path = Path('src/admin/services/emailCenter.service.ts')
text = path.read_text(encoding='utf-8')
return_anchor = """  return {\n    success:\n      Boolean(\n        data.success,\n      ),\n    campaignId:\n      String(\n        data.campaignId ??\n          '',\n      ),"""
notify_prefix = """  const campaignId =\n    String(\n      data.campaignId ?? '',\n    )\n\n  try {\n    const { error: notificationError } =\n      await supabase.functions.invoke(\n        'campaign-notifications',\n        {\n          body: {\n            campaignId,\n            title: input.subject,\n            htmlBody: input.htmlBody,\n            route: '/dashboard',\n          },\n        },\n      )\n\n    if (notificationError) {\n      console.warn(\n        'Kampanja je poslana e-mailom, ali app/push obavijest nije uspjela:',\n        notificationError,\n      )\n    }\n  } catch (notificationError) {\n    console.warn(\n      'Kampanja je poslana e-mailom, ali app/push obavijest nije uspjela:',\n      notificationError,\n    )\n  }\n\n  return {\n    success:\n      Boolean(\n        data.success,\n      ),\n    campaignId,"""
text = replace_once(text, return_anchor, notify_prefix, 'Email campaign app notification')
path.write_text(text, encoding='utf-8')

print('mobile quality parity patch applied')
