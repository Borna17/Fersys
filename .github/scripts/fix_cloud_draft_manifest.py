from pathlib import Path


def replace_once(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if new in text:
        print(f'{path}: already patched')
        return
    if old not in text:
        raise SystemExit(f'{path}: expected block not found')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'{path}: patched')


# Rebuild the unfinished-draft manifest from Supabase so a refresh, browser cache
# cleanup of localStorage, or another device does not hide a still-valid cloud draft.
replace_once(
    'src/services/drafts.service.ts',
    "export function getDraftManifestEntries() {\n  return readDraftManifest().sort(\n    (a, b) =>\n      new Date(b.updatedAt).getTime() -\n      new Date(a.updatedAt).getTime(),\n  )\n}\n",
    "export function getDraftManifestEntries() {\n  return readDraftManifest().sort(\n    (a, b) =>\n      new Date(b.updatedAt).getTime() -\n      new Date(a.updatedAt).getTime(),\n  )\n}\n\nexport async function refreshDraftManifestFromCloud():\nPromise<DraftManifestEntry[]> {\n  const localEntries =\n    getDraftManifestEntries()\n\n  if (!navigator.onLine) {\n    return localEntries\n  }\n\n  try {\n    const identity =\n      await getIdentity()\n\n    const { data, error } =\n      await supabase\n        .from('user_drafts')\n        .select('draft_type,draft_key,payload,updated_at,expires_at')\n        .eq('company_id', identity.companyId)\n        .eq('user_id', identity.userId)\n        .gt('expires_at', new Date().toISOString())\n        .order('updated_at', { ascending: false })\n\n    if (error) {\n      throw error\n    }\n\n    const cloudEntries: DraftManifestEntry[] = []\n\n    for (const row of data ?? []) {\n      const draftType =\n        String(row.draft_type ?? '') as DraftType\n      const draftKey =\n        String(row.draft_key ?? '')\n      const updatedAt =\n        String(row.updated_at ?? '')\n\n      if (!draftKey || !updatedAt) {\n        continue\n      }\n\n      const payload = row.payload\n      const meta =\n        draftMeta(draftType, draftKey, payload)\n\n      cloudEntries.push({\n        draftType,\n        draftKey,\n        label: meta.label,\n        route: meta.route,\n        updatedAt,\n      })\n\n      // Cloud is also copied back into IndexedDB. After one successful online\n      // refresh the same unfinished work can therefore be reopened offline.\n      await putLocal({\n        key: localKey(identity, draftType, draftKey),\n        companyId: identity.companyId,\n        userId: identity.userId,\n        draftType,\n        draftKey,\n        payload,\n        updatedAt,\n        syncState: 'synced',\n      })\n    }\n\n    const merged =\n      new Map<string, DraftManifestEntry>()\n\n    for (const entry of [\n      ...localEntries,\n      ...cloudEntries,\n    ]) {\n      const key =\n        `${entry.draftType}:${entry.draftKey}`\n      const existing =\n        merged.get(key)\n\n      if (\n        !existing ||\n        new Date(entry.updatedAt).getTime() >=\n          new Date(existing.updatedAt).getTime()\n      ) {\n        merged.set(key, entry)\n      }\n    }\n\n    const entries =\n      Array.from(merged.values())\n        .sort(\n          (a, b) =>\n            new Date(b.updatedAt).getTime() -\n            new Date(a.updatedAt).getTime(),\n        )\n        .slice(0, 100)\n\n    writeDraftManifest(entries)\n    return entries\n  } catch (error) {\n    console.warn(\n      '[FERSYS] Cloud popis nedovršenih unosa nije moguće osvježiti:',\n      error,\n    )\n    return localEntries\n  }\n}\n",
)

# Give structured work-order edit drafts a useful label in the unfinished list.
replace_once(
    'src/services/drafts.service.ts',
    "    case 'work-order':\n      return {\n        label: editId\n          ? 'Uređivanje radnog naloga'\n          : 'Novi radni nalog',",
    "    case 'work-order': {\n      const customerName =\n        typeof source?.customerName === 'string'\n          ? source.customerName.trim()\n          : typeof source?.investorName === 'string'\n            ? source.investorName.trim()\n            : ''\n      const title =\n        typeof source?.title === 'string'\n          ? source.title.trim()\n          : ''\n      const detail =\n        [customerName, title]\n          .filter(Boolean)\n          .join(' · ')\n\n      return {\n        label: editId\n          ? `Uređivanje radnog naloga${detail ? ` · ${detail}` : ''}`\n          : `Novi radni nalog${detail ? ` · ${detail}` : ''}`,",
)
replace_once(
    'src/services/drafts.service.ts',
    "        route: editId\n          ? `/work-orders/${editId}/edit`\n          : '/work-orders/new',\n      }\n    case 'offer':",
    "        route: editId\n          ? `/work-orders/${editId}/edit`\n          : '/work-orders/new',\n      }\n    }\n    case 'offer':",
)

# The global unfinished banner now hydrates from cloud on mount, reconnect and focus.
replace_once(
    'src/components/UniversalDraftProtection.tsx',
    "  getDraftManifestEntries,\n  loadUserDraft,",
    "  getDraftManifestEntries,\n  refreshDraftManifestFromCloud,\n  loadUserDraft,",
)
replace_once(
    'src/components/UniversalDraftProtection.tsx',
    "  const refresh = () => {\n    setEntries(getDraftManifestEntries())\n  }\n\n  useEffect(() => {\n    refresh()\n    const onChange = () => refresh()\n    window.addEventListener('fersys:draft-sync-change', onChange)\n    window.addEventListener('storage', onChange)\n    const timer = window.setInterval(refresh, 2500)\n    return () => {\n      window.removeEventListener('fersys:draft-sync-change', onChange)\n      window.removeEventListener('storage', onChange)\n      window.clearInterval(timer)\n    }\n  }, [])",
    "  const refresh = () => {\n    setEntries(getDraftManifestEntries())\n  }\n\n  useEffect(() => {\n    let disposed = false\n    let cloudRefreshRunning = false\n\n    const refreshCloud = async () => {\n      if (cloudRefreshRunning || !navigator.onLine) {\n        refresh()\n        return\n      }\n\n      cloudRefreshRunning = true\n      try {\n        const next =\n          await refreshDraftManifestFromCloud()\n        if (!disposed) {\n          setEntries(next)\n        }\n      } finally {\n        cloudRefreshRunning = false\n      }\n    }\n\n    void refreshCloud()\n\n    const onChange = () => refresh()\n    const onOnline = () => void refreshCloud()\n    const onFocus = () => void refreshCloud()\n\n    window.addEventListener('fersys:draft-sync-change', onChange)\n    window.addEventListener('storage', onChange)\n    window.addEventListener('online', onOnline)\n    window.addEventListener('focus', onFocus)\n\n    const localTimer =\n      window.setInterval(refresh, 2500)\n    const cloudTimer =\n      window.setInterval(() => void refreshCloud(), 60 * 1000)\n\n    return () => {\n      disposed = true\n      window.removeEventListener('fersys:draft-sync-change', onChange)\n      window.removeEventListener('storage', onChange)\n      window.removeEventListener('online', onOnline)\n      window.removeEventListener('focus', onFocus)\n      window.clearInterval(localTimer)\n      window.clearInterval(cloudTimer)\n    }\n  }, [])",
)

print('Cloud draft manifest recovery patch complete.')
