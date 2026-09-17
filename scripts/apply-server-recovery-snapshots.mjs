import fs from 'node:fs'

const path = 'src/services/drafts.service.ts'
let source = fs.readFileSync(path, 'utf8')

const marker = `  if (error) {\n    throw error\n  }\n\n  await putLocal({\n    ...envelope,\n    syncState:\n      'synced',\n  })`

if (!source.includes(marker)) throw new Error('uploadEnvelope success marker not found')

const replacement = `  if (error) {\n    throw error\n  }\n\n  // Recovery history is append-only and must never block normal draft sync.\n  // The latest user_drafts row remains the fast current state, while these\n  // snapshots give Admin Recovery older versions after a failed/overwritten save.\n  try {\n    const { error: recoveryError } = await supabase\n      .from('recovery_snapshots')\n      .insert({\n        company_id: envelope.companyId,\n        user_id: envelope.userId,\n        draft_type: envelope.draftType,\n        draft_key: envelope.draftKey,\n        payload: envelope.payload,\n        reason: 'draft_sync',\n        source_updated_at: envelope.updatedAt,\n      })\n\n    if (recoveryError) {\n      console.warn('[FERSYS] Recovery snapshot nije spremljen:', recoveryError)\n    }\n  } catch (recoveryError) {\n    console.warn('[FERSYS] Recovery snapshot trenutno nije dostupan:', recoveryError)\n  }\n\n  await putLocal({\n    ...envelope,\n    syncState:\n      'synced',\n  })`

source = source.replace(marker, replacement)
fs.writeFileSync(path, source)
