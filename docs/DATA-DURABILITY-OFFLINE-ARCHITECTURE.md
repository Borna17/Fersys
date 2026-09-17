# FERSYS Data Durability & Offline Architecture

Status: P0 / release blocker

## Non-negotiable guarantees

1. User input is persisted locally before any network request is allowed to block the UI.
2. A failed cloud save never deletes a local draft or recovery snapshot.
3. Existing records being edited keep recoverable versions; a server `updated_at` mismatch is a conflict, never a reason to destroy the draft.
4. Large attachments are queued separately from structured form data so photos/files cannot block text, materials, times, signatures or prices from being persisted.
5. Previously authenticated devices can open FERSYS offline using cached identity/company bootstrap data and locally cached business data.
6. Pending writes retry after reconnect/app resume. UI distinguishes: saved locally, syncing, synced, sync error/offline.
7. Recovery history is retained server-side for admin support. Admin can inspect/copy payload text and restore an appropriate snapshot.
8. Successful final cloud save creates/retains a recovery version before the active draft is cleaned up.
9. Destructive cleanup is explicit and bounded by retention policy; never performed merely because a newer server version exists.
10. All core forms use the same durability engine: work orders, offers, invoices, incoming invoices, delivery notes, customers, inventory, vehicles, employees and future forms.

## Performance model

- Local structured save target: effectively instant UI acknowledgement; no cloud round trip in the critical path.
- Autosave is debounced/coalesced so typing does not create a request storm.
- Cloud synchronization is background work and uses retry/backoff.
- Attachments use a separate queue with per-item state and retry.
- Large records must not repeatedly serialize/upload unchanged binary data as part of every keystroke autosave.

## Storage layers

### Device
- IndexedDB durable drafts/snapshots.
- Cached bootstrap: authenticated user id, company id, permissions needed for offline shell, last successful sync metadata.
- Outbox for pending mutations.
- Attachment queue for pending uploads.

### Supabase
- Canonical business records.
- `user_drafts` for cross-device unfinished work.
- recovery/version history with company/user/entity/entity_id/payload/reason/timestamps.
- admin-only recovery access through RLS/RPC; ordinary users can only access their own/company-authorized data.

## Conflict policy

Never silently discard either side. If local draft base differs from server:
- preserve local snapshot;
- preserve server state;
- mark conflict;
- allow user/admin to inspect/recover rather than deleting the local version.

## Offline startup

If the device has a previously verified session/bootstrap:
- render application shell from local bootstrap without waiting for Supabase;
- show Offline status;
- load cached entities;
- allow local edits/new drafts;
- queue writes;
- refresh auth/company/data after network returns.

A first-ever login still requires network access.

## Error UX

A cloud/network error must not imply data loss when local persistence succeeded. Standard message:

`Došlo je do problema sa sinkronizacijom. Vaše promjene su spremljene na ovom uređaju. Možete nastaviti s radom; FERSYS će ponovno pokušati sinkronizaciju kada veza bude dostupna.`

If local persistence itself fails, show a distinct high-priority warning and do not navigate away automatically.

## Release test matrix

Must pass before merge/release:
- new and edited small record;
- very large work order/offer;
- many photos/attachments;
- airplane mode before startup;
- network loss while typing;
- network loss during final save;
- force-close immediately after edit;
- app resume;
- backend timeout/5xx/auth refresh failure;
- offline -> online synchronization;
- two-device conflict;
- recovery from admin panel;
- copy raw text/payload from recovery snapshot;
- no regression in normal online save speed.
