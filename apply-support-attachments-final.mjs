import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-support-attachments-backup', stamp)

function load(rel) {
  const file = path.join(root, rel)
  if (!fs.existsSync(file)) throw new Error(`Nedostaje ${rel}`)
  const original = fs.readFileSync(file, 'utf8')
  return {
    rel,
    file,
    eol: original.includes('\r\n') ? '\r\n' : '\n',
    text: original.replace(/\r\n/g, '\n'),
  }
}

function save(state) {
  const backup = path.join(backupRoot, state.rel)
  fs.mkdirSync(path.dirname(backup), { recursive: true })
  fs.copyFileSync(state.file, backup)
  const output =
    state.eol === '\r\n'
      ? state.text.replace(/\n/g, '\r\n')
      : state.text
  fs.writeFileSync(state.file, output, 'utf8')
  console.log(`✓ ${state.rel}`)
}

function replaceOnce(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) {
    throw new Error(`Nije pronađen očekivani dio: ${label}`)
  }
  return text.replace(oldText, newText)
}

function patchUserService() {
  const s = load('src/services/support.service.ts')

  const anchor = `export type CreateSupportTicketInput = {
  category: string`

  const helpers = `const SUPPORT_ATTACHMENTS_BUCKET =
  'support-attachments'

function isAbsoluteUrl(value: string) {
  return /^https?:\\/\\//i.test(value)
}

export function validateSupportImage(
  file: File,
): void {
  if (!file.type.startsWith('image/')) {
    throw new Error(
      'Možeš priložiti samo sliku ili screenshot.',
    )
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error(
      'Slika može imati najviše 8 MB.',
    )
  }
}

export async function uploadSupportAttachment(
  file: File,
): Promise<string> {
  validateSupportImage(file)

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) throw authError
  if (!user) {
    throw new Error(
      'Korisnik nije prijavljen.',
    )
  }

  const rawExtension =
    file.name.split('.').pop() ?? 'jpg'
  const extension =
    rawExtension
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') ||
    'jpg'

  const objectPath =
    user.id +
    '/' +
    Date.now() +
    '-' +
    crypto.randomUUID() +
    '.' +
    extension

  const { error: uploadError } =
    await supabase.storage
      .from(
        SUPPORT_ATTACHMENTS_BUCKET,
      )
      .upload(
        objectPath,
        file,
        {
          cacheControl: '3600',
          upsert: false,
          contentType:
            file.type ||
            'image/jpeg',
        },
      )

  if (uploadError) throw uploadError

  return objectPath
}

async function resolveSupportAttachment(
  storedValue: string,
): Promise<string> {
  const value = storedValue.trim()

  if (!value) return ''
  if (isAbsoluteUrl(value)) {
    return value
  }

  const { data, error } =
    await supabase.storage
      .from(
        SUPPORT_ATTACHMENTS_BUCKET,
      )
      .createSignedUrl(
        value,
        60 * 60,
      )

  if (error) {
    console.error(
      'Support attachment URL:',
      error,
    )
    return ''
  }

  return data.signedUrl
}

export type CreateSupportTicketInput = {
  category: string`

  if (!s.text.includes('uploadSupportAttachment')) {
    s.text = replaceOnce(
      s.text,
      anchor,
      helpers,
      'upload helper',
    )
  }

  s.text = replaceOnce(
    s.text,
`  return (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      ticketNumber: String(
        row.ticket_number ?? '',
      ),
      category: String(
        row.category ?? '',
      ),
      subject: String(
        row.subject ?? '',
      ),
      description: String(
        row.description ?? '',
      ),
      priority: String(
        row.priority ?? 'normal',
      ) as SupportTicketPriority,
      status: String(
        row.status ?? 'new',
      ) as SupportTicketStatus,
      module: String(row.module ?? ''),
      contactPhone: String(
        row.contact_phone ?? '',
      ),
      attachmentUrl: String(
        row.attachment_url ?? '',
      ),
      createdAt: String(
        row.created_at ?? '',
      ),
      updatedAt: String(
        row.updated_at ?? '',
      ),
    }),
  )`,
`  return Promise.all(
    (data ?? []).map(
      async (
        row: Record<string, unknown>,
      ) => ({
        id: String(row.id ?? ''),
        ticketNumber: String(
          row.ticket_number ?? '',
        ),
        category: String(
          row.category ?? '',
        ),
        subject: String(
          row.subject ?? '',
        ),
        description: String(
          row.description ?? '',
        ),
        priority: String(
          row.priority ?? 'normal',
        ) as SupportTicketPriority,
        status: String(
          row.status ?? 'new',
        ) as SupportTicketStatus,
        module: String(
          row.module ?? '',
        ),
        contactPhone: String(
          row.contact_phone ?? '',
        ),
        attachmentUrl:
          await resolveSupportAttachment(
            String(
              row.attachment_url ??
                '',
            ),
          ),
        createdAt: String(
          row.created_at ?? '',
        ),
        updatedAt: String(
          row.updated_at ?? '',
        ),
      }),
    ),
  )`,
    'ticket signed URLs',
  )

  s.text = replaceOnce(
    s.text,
`  return (data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: String(row.id ?? ''),
      ticketId: String(
        row.ticket_id ?? '',
      ),
      senderType: String(
        row.sender_type ?? 'user',
      ) as 'user' | 'admin',
      senderName: String(
        row.sender_name ?? '',
      ),
      message: String(
        row.message ?? '',
      ),
      attachmentUrl: String(
        row.attachment_url ?? '',
      ),
      createdAt: String(
        row.created_at ?? '',
      ),
      readByUserAt: row.read_by_user_at
        ? String(row.read_by_user_at)
        : null,
      readByAdminAt: row.read_by_admin_at
        ? String(row.read_by_admin_at)
        : null,
    }),
  )`,
`  return Promise.all(
    (data ?? []).map(
      async (
        row: Record<string, unknown>,
      ) => ({
        id: String(row.id ?? ''),
        ticketId: String(
          row.ticket_id ?? '',
        ),
        senderType: String(
          row.sender_type ?? 'user',
        ) as 'user' | 'admin',
        senderName: String(
          row.sender_name ?? '',
        ),
        message: String(
          row.message ?? '',
        ),
        attachmentUrl:
          await resolveSupportAttachment(
            String(
              row.attachment_url ??
                '',
            ),
          ),
        createdAt: String(
          row.created_at ?? '',
        ),
        readByUserAt:
          row.read_by_user_at
            ? String(
                row.read_by_user_at,
              )
            : null,
        readByAdminAt:
          row.read_by_admin_at
            ? String(
                row.read_by_admin_at,
              )
            : null,
      }),
    ),
  )`,
    'message signed URLs',
  )

  s.text = replaceOnce(
    s.text,
`export async function sendMySupportMessage(
  ticketId: string,
  message: string,
): Promise<void> {`,
`export async function sendMySupportMessage(
  ticketId: string,
  message: string,
  attachmentPath = '',
): Promise<void> {`,
    'reply signature',
  )

  s.text = replaceOnce(
    s.text,
`      requested_attachment_url: null,
    },
  )`,
`      requested_attachment_url:
        attachmentPath || null,
    },
  )`,
    'reply attachment RPC',
  )

  save(s)
}

function patchSupportPage() {
  const s = load('src/pages/SupportPage.tsx')

  s.text = replaceOnce(
    s.text,
`  MessageSquareText,
  RefreshCw,`,
`  MessageSquareText,
  ImagePlus,
  Paperclip,
  RefreshCw,`,
    'icons',
  )

  s.text = replaceOnce(
    s.text,
`  sendMySupportMessage,
  type MySupportTicket,`,
`  sendMySupportMessage,
  uploadSupportAttachment,
  validateSupportImage,
  type MySupportTicket,`,
    'service imports',
  )

  s.text = replaceOnce(
    s.text,
`  const [reply, setReply] =
    useState('')`,
`  const [reply, setReply] =
    useState('')
  const [
    newAttachment,
    setNewAttachment,
  ] = useState<File | null>(null)
  const [
    replyAttachment,
    setReplyAttachment,
  ] = useState<File | null>(null)`,
    'attachment state',
  )

  s.text = replaceOnce(
    s.text,
`      const ticketNumber =
        await createSupportTicket({`,
`      const attachmentPath =
        newAttachment
          ? await uploadSupportAttachment(
              newAttachment,
            )
          : ''

      const ticketNumber =
        await createSupportTicket({`,
    'new ticket upload',
  )

  s.text = replaceOnce(
    s.text,
`          contactPhone:
            contactPhone.trim(),
        })`,
`          contactPhone:
            contactPhone.trim(),
          attachmentUrl:
            attachmentPath,
        })`,
    'ticket attachment RPC',
  )

  s.text = replaceOnce(
    s.text,
`      setContactPhone('')

      await load()`,
`      setContactPhone('')
      setNewAttachment(null)

      await load()`,
    'reset new attachment',
  )

  s.text = replaceOnce(
    s.text,
`    if (
      !selected ||
      reply.trim().length < 1
    ) {
      return
    }`,
`    if (
      !selected ||
      (
        reply.trim().length < 1 &&
        !replyAttachment
      )
    ) {
      return
    }`,
    'image-only reply',
  )

  s.text = replaceOnce(
    s.text,
`      await sendMySupportMessage(
        selected.id,
        reply.trim(),
      )

      setReply('')`,
`      const attachmentPath =
        replyAttachment
          ? await uploadSupportAttachment(
              replyAttachment,
            )
          : ''

      await sendMySupportMessage(
        selected.id,
        reply.trim() ||
          'Priložen screenshot.',
        attachmentPath,
      )

      setReply('')
      setReplyAttachment(null)`,
    'reply upload',
  )

  s.text = replaceOnce(
    s.text,
`  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-10 sm:space-y-6">`,
`  function chooseNewAttachment(
    file: File | null,
  ) {
    if (!file) return

    try {
      validateSupportImage(file)
      setNewAttachment(file)
      setError('')
    } catch (value) {
      setNewAttachment(null)
      setError(
        value instanceof Error
          ? value.message
          : 'Slika nije valjana.',
      )
    }
  }

  function chooseReplyAttachment(
    file: File | null,
  ) {
    if (!file) return

    try {
      validateSupportImage(file)
      setReplyAttachment(file)
      setError('')
    } catch (value) {
      setReplyAttachment(null)
      setError(
        value instanceof Error
          ? value.message
          : 'Slika nije valjana.',
      )
    }
  }

  return (
    <section className="mx-auto w-full max-w-[1500px] space-y-4 pb-10 sm:space-y-6">`,
    'attachment handlers',
  )

  const contactField = `            <Field label="Kontakt telefon — opcionalno">
              <input
                value={contactPhone}
                onChange={(event) =>
                  setContactPhone(
                    event.target.value,
                  )
                }
                placeholder="+385..."
                className={inputClass}
              />
            </Field>`

  s.text = replaceOnce(
    s.text,
    contactField,
`            <Field label="Priloži screenshot — opcionalno">
              <label className="mt-2 flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 text-sm text-slate-300 transition hover:border-blue-500/60">
                <ImagePlus
                  size={20}
                  className="shrink-0 text-blue-400"
                />

                <span className="min-w-0 flex-1 truncate">
                  {newAttachment
                    ? newAttachment.name
                    : 'Odaberi sliku iz galerije'}
                </span>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    chooseNewAttachment(
                      event.target.files?.[0] ??
                        null,
                    )
                    event.target.value = ''
                  }}
                />
              </label>

              {newAttachment && (
                <button
                  type="button"
                  onClick={() =>
                    setNewAttachment(null)
                  }
                  className="mt-2 text-xs font-black text-red-300"
                >
                  Ukloni prilog
                </button>
              )}

              <p className="mt-2 text-xs font-normal leading-5 text-slate-500">
                Slika do 8 MB.
              </p>
            </Field>

${contactField}`,
    'new ticket attachment UI',
  )

  s.text = replaceOnce(
    s.text,
`                <div className="sticky bottom-0 mt-4 flex items-end gap-2 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 backdrop-blur-xl">
                  <textarea
                    value={reply}
                    onChange={(event) =>
                      setReply(
                        event.target.value,
                      )
                    }
                    placeholder="Napiši poruku podršci..."
                    className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                  />

                  <button
                    type="button"
                    disabled={
                      sending ||
                      !reply.trim()
                    }
                    onClick={() =>
                      void sendReply()
                    }
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white disabled:opacity-50"
                  >
                    <Send size={20} />
                  </button>
                </div>`,
`                <div className="sticky bottom-0 mt-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 backdrop-blur-xl">
                  {replyAttachment && (
                    <div className="mb-2 flex items-center justify-between gap-3 rounded-xl bg-slate-800 px-3 py-2 text-xs">
                      <span className="min-w-0 truncate text-slate-300">
                        {replyAttachment.name}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setReplyAttachment(
                            null,
                          )
                        }
                        className="shrink-0 text-slate-500 hover:text-white"
                        aria-label="Ukloni prilog"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <label
                      className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-slate-800 text-slate-400 transition active:scale-95 hover:text-white"
                      title="Priloži screenshot"
                    >
                      <Paperclip size={18} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          chooseReplyAttachment(
                            event.target.files?.[0] ??
                              null,
                          )
                          event.target.value = ''
                        }}
                      />
                    </label>

                    <textarea
                      value={reply}
                      onChange={(event) =>
                        setReply(
                          event.target.value,
                        )
                      }
                      placeholder="Napiši poruku podršci..."
                      className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl border border-slate-700 bg-slate-950 p-3 text-sm text-white outline-none focus:border-blue-500"
                    />

                    <button
                      type="button"
                      disabled={
                        sending ||
                        (
                          !reply.trim() &&
                          !replyAttachment
                        )
                      }
                      onClick={() =>
                        void sendReply()
                      }
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>`,
    'reply attachment UI',
  )

  s.text = replaceOnce(
    s.text,
`        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {message.message}
        </p>
        <p className="mt-2 text-[11px] opacity-60">`,
`        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {message.message}
        </p>

        {message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block overflow-hidden rounded-xl border border-white/10 bg-black/15"
            title="Otvori screenshot"
          >
            <img
              src={message.attachmentUrl}
              alt="Priloženi screenshot"
              className="max-h-72 w-full object-contain"
              loading="lazy"
            />
          </a>
        )}

        <p className="mt-2 text-[11px] opacity-60">`,
    'user chat image preview',
  )

  save(s)
}

function patchAdminService() {
  const s = load(
    'src/admin/services/support.service.ts',
  )

  if (
    !s.text.includes(
      'resolveSupportAttachment',
    )
  ) {
    s.text = replaceOnce(
      s.text,
`import { supabase } from '../../lib/supabase'

export type SupportTicketStatus =`,
`import { supabase } from '../../lib/supabase'

const SUPPORT_ATTACHMENTS_BUCKET =
  'support-attachments'

function isAbsoluteUrl(value: string) {
  return /^https?:\\/\\//i.test(value)
}

async function resolveSupportAttachment(
  storedValue: string,
): Promise<string> {
  const value = storedValue.trim()

  if (!value) return ''
  if (isAbsoluteUrl(value)) {
    return value
  }

  const { data, error } =
    await supabase.storage
      .from(
        SUPPORT_ATTACHMENTS_BUCKET,
      )
      .createSignedUrl(
        value,
        60 * 60,
      )

  if (error) {
    console.error(
      'Admin support attachment URL:',
      error,
    )
    return ''
  }

  return data.signedUrl
}

export type SupportTicketStatus =`,
      'admin signed URL helper',
    )
  }

  s.text = replaceOnce(
    s.text,
`  internalNote: string
  createdAt: string`,
`  internalNote: string
  attachmentUrl: string
  createdAt: string`,
    'admin ticket attachment type',
  )

  s.text = replaceOnce(
    s.text,
`  return (data ?? []).map(
    (
      row:
        Record<string, unknown>,
    ) => ({
      id: String(
        row.id ?? '',
      ),
      companyId: String(
        row.company_id ?? '',
      ),
      companyName: String(
        row.company_name ?? '',
      ),
      requesterName: String(
        row.requester_name ?? '',
      ),
      requesterEmail: String(
        row.requester_email ?? '',
      ),
      subject: String(
        row.subject ?? '',
      ),
      message: String(
        row.message ?? '',
      ),
      status:
        mapDbStatus(
          row.status,
        ),
      priority:
        mapDbPriority(
          row.priority,
        ),
      internalNote: String(
        row.internal_note ?? '',
      ),
      createdAt: String(
        row.created_at ?? '',
      ),
      updatedAt: String(
        row.updated_at ?? '',
      ),
    }),
  )`,
`  return Promise.all(
    (data ?? []).map(
      async (
        row:
          Record<string, unknown>,
      ) => ({
        id: String(
          row.id ?? '',
        ),
        companyId: String(
          row.company_id ?? '',
        ),
        companyName: String(
          row.company_name ?? '',
        ),
        requesterName: String(
          row.requester_name ?? '',
        ),
        requesterEmail: String(
          row.requester_email ?? '',
        ),
        subject: String(
          row.subject ?? '',
        ),
        message: String(
          row.message ?? '',
        ),
        status:
          mapDbStatus(
            row.status,
          ),
        priority:
          mapDbPriority(
            row.priority,
          ),
        internalNote: String(
          row.internal_note ?? '',
        ),
        attachmentUrl:
          await resolveSupportAttachment(
            String(
              row.attachment_url ??
                '',
            ),
          ),
        createdAt: String(
          row.created_at ?? '',
        ),
        updatedAt: String(
          row.updated_at ?? '',
        ),
      }),
    ),
  )`,
    'admin ticket signed URL',
  )

  s.text = replaceOnce(
    s.text,
`  return (data ?? []).map(
    (
      row:
        Record<string, unknown>,
    ) => ({
      id: String(
        row.id ?? '',
      ),
      ticketId: String(
        row.ticket_id ?? '',
      ),
      senderType: String(
        row.sender_type ??
        'user',
      ) as
        | 'user'
        | 'admin',
      senderName: String(
        row.sender_name ?? '',
      ),
      message: String(
        row.message ?? '',
      ),
      attachmentUrl: String(
        row.attachment_url ??
        '',
      ),
      createdAt: String(
        row.created_at ?? '',
      ),
      readByUserAt:
        row.read_by_user_at
          ? String(
              row.read_by_user_at,
            )
          : null,
      readByAdminAt:
        row.read_by_admin_at
          ? String(
              row.read_by_admin_at,
            )
          : null,
    }),
  )`,
`  return Promise.all(
    (data ?? []).map(
      async (
        row:
          Record<string, unknown>,
      ) => ({
        id: String(
          row.id ?? '',
        ),
        ticketId: String(
          row.ticket_id ?? '',
        ),
        senderType: String(
          row.sender_type ??
          'user',
        ) as
          | 'user'
          | 'admin',
        senderName: String(
          row.sender_name ?? '',
        ),
        message: String(
          row.message ?? '',
        ),
        attachmentUrl:
          await resolveSupportAttachment(
            String(
              row.attachment_url ??
                '',
            ),
          ),
        createdAt: String(
          row.created_at ?? '',
        ),
        readByUserAt:
          row.read_by_user_at
            ? String(
                row.read_by_user_at,
              )
            : null,
        readByAdminAt:
          row.read_by_admin_at
            ? String(
                row.read_by_admin_at,
              )
            : null,
      }),
    ),
  )`,
    'admin message signed URL',
  )

  save(s)
}

function patchAdminPage() {
  const s = load(
    'src/admin/AdminSupportPage.tsx',
  )

  s.text = replaceOnce(
    s.text,
`            attachmentUrl: '',
            createdAt:`,
`            attachmentUrl:
              ticket.attachmentUrl,
            createdAt:`,
    'fallback ticket attachment',
  )

  s.text = replaceOnce(
    s.text,
`          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>
              Poslano:{' '}
              <strong className="text-slate-300">
                {formatDateTime(
                  ticket.createdAt,
                )}
              </strong>
            </span>

            <span>
              Zadnja promjena:{' '}
              <strong className="text-slate-300">
                {formatDateTime(
                  ticket.updatedAt,
                )}
              </strong>
            </span>
          </div>`,
`          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
            <span>
              Poslano:{' '}
              <strong className="text-slate-300">
                {formatDateTime(
                  ticket.createdAt,
                )}
              </strong>
            </span>

            <span>
              Zadnja promjena:{' '}
              <strong className="text-slate-300">
                {formatDateTime(
                  ticket.updatedAt,
                )}
              </strong>
            </span>
          </div>

          {ticket.attachmentUrl && (
            <a
              href={ticket.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 block max-w-xl overflow-hidden rounded-2xl border border-blue-500/20 bg-slate-950/60 p-2"
            >
              <p className="mb-2 px-1 text-xs font-black uppercase tracking-wide text-blue-300">
                Priloženi screenshot
              </p>
              <img
                src={ticket.attachmentUrl}
                alt="Screenshot support zahtjeva"
                className="max-h-80 w-full rounded-xl object-contain"
                loading="lazy"
              />
            </a>
          )}`,
    'admin ticket image preview',
  )

  s.text = replaceOnce(
    s.text,
`        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {message.message}
        </p>

        <p
          className={`,
`        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
          {message.message}
        </p>

        {message.attachmentUrl && (
          <a
            href={message.attachmentUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block overflow-hidden rounded-xl border border-white/10 bg-black/15"
            title="Otvori screenshot"
          >
            <img
              src={message.attachmentUrl}
              alt="Priloženi screenshot"
              className="max-h-80 w-full object-contain"
              loading="lazy"
            />
          </a>
        )}

        <p
          className={`,
    'admin chat image preview',
  )

  save(s)
}

try {
  console.log(
    'FERSYS Support Attachments FINAL',
  )
  console.log(`Backup: ${backupRoot}`)

  patchUserService()
  patchSupportPage()
  patchAdminService()
  patchAdminPage()

  console.log('')
  console.log('✓ Sve 4 datoteke su usklađene.')
  console.log(
    '✓ Privitci su privatni; prikaz koristi signed URL.',
  )
  console.log('Sada pokreni: npm run build')
} catch (error) {
  console.error('')
  console.error(
    '✗ Zaustavljeno:',
    error instanceof Error
      ? error.message
      : error,
  )
  console.error(`Backup: ${backupRoot}`)
  process.exit(1)
}

