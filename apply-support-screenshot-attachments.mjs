import fs from 'node:fs'
import path from 'node:path'

const root=process.cwd()
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const backupRoot=path.join(root,'.fersys-support-attachment-backup',stamp)
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8')}
function write(rel,text){const f=path.join(root,rel); const b=path.join(backupRoot,rel); fs.mkdirSync(path.dirname(b),{recursive:true}); fs.copyFileSync(f,b); fs.writeFileSync(f,text,'utf8'); console.log('✓ '+rel)}
function must(t,a,b,label){if(t.includes(b)) return t;if(!t.includes(a)) throw new Error('Nije pronađeno: '+label);return t.replace(a,b)}

// support service: upload + attachment URL for reply
{
 const rel='src/services/support.service.ts'; let t=read(rel)
 if(!t.includes('uploadSupportAttachment')){
  const anchor=`export type CreateSupportTicketInput = {\n  category: string`
  const helper=`const SUPPORT_BUCKET = 'support-attachments'\n\nexport async function uploadSupportAttachment(\n  file: File,\n): Promise<string> {\n  const { data: authData, error: authError } =\n    await supabase.auth.getUser()\n\n  if (authError || !authData.user) {\n    throw authError ?? new Error('Korisnik nije prijavljen.')\n  }\n\n  if (!file.type.startsWith('image/')) {\n    throw new Error('Možeš priložiti samo sliku.')\n  }\n\n  if (file.size > 8 * 1024 * 1024) {\n    throw new Error('Slika može imati najviše 8 MB.')\n  }\n\n  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'\n  const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : 'jpg'\n  const objectPath = \`${authData.user.id}/\${Date.now()}-\${crypto.randomUUID()}.\${safeExtension}\`\n\n  const { error: uploadError } = await supabase.storage\n    .from(SUPPORT_BUCKET)\n    .upload(objectPath, file, {\n      cacheControl: '3600',\n      upsert: false,\n      contentType: file.type,\n    })\n\n  if (uploadError) throw uploadError\n\n  const { data } = supabase.storage\n    .from(SUPPORT_BUCKET)\n    .getPublicUrl(objectPath)\n\n  return data.publicUrl\n}\n\nexport type CreateSupportTicketInput = {\n  category: string`
  t=must(t,anchor,helper,'upload helper')
 }
 t=t.replace(`export async function sendMySupportMessage(\n  ticketId: string,\n  message: string,\n): Promise<void> {`,`export async function sendMySupportMessage(\n  ticketId: string,\n  message: string,\n  attachmentUrl = '',\n): Promise<void> {`)
 t=t.replace(`requested_attachment_url: null,`,`requested_attachment_url:\n        attachmentUrl || null,`)
 write(rel,t)
}

// Support page UI
{
 const rel='src/pages/SupportPage.tsx'; let t=read(rel)
 t=t.replace(`  MessageSquareText,\n  RefreshCw,`,`  MessageSquareText,\n  ImagePlus,\n  Paperclip,\n  RefreshCw,`)
 t=t.replace(`  sendMySupportMessage,\n  type MySupportTicket,`,`  sendMySupportMessage,\n  uploadSupportAttachment,\n  type MySupportTicket,`)
 t=t.replace(`  const [reply, setReply] =\n    useState('')`,`  const [reply, setReply] =\n    useState('')\n  const [newAttachment, setNewAttachment] = useState<File | null>(null)\n  const [replyAttachment, setReplyAttachment] = useState<File | null>(null)`)
 t=t.replace(`      const ticketNumber =\n        await createSupportTicket({`,`      const attachmentUrl = newAttachment\n        ? await uploadSupportAttachment(newAttachment)\n        : ''\n\n      const ticketNumber =\n        await createSupportTicket({`)
 t=t.replace(`          contactPhone:\n            contactPhone.trim(),\n        })`,`          contactPhone:\n            contactPhone.trim(),\n          attachmentUrl,\n        })`)
 t=t.replace(`      setContactPhone('')`,`      setContactPhone('')\n      setNewAttachment(null)`)
 t=t.replace(`      await sendMySupportMessage(\n        selected.id,\n        reply.trim(),\n      )`,`      const attachmentUrl = replyAttachment\n        ? await uploadSupportAttachment(replyAttachment)\n        : ''\n\n      await sendMySupportMessage(\n        selected.id,\n        reply.trim(),\n        attachmentUrl,\n      )`)
 t=t.replace(`      setReply('')`,`      setReply('')\n      setReplyAttachment(null)`)
 const phone=`            <Field label="Kontakt telefon — opcionalno">\n              <input\n                value={contactPhone}`
 const attach=`            <Field label="Priloži screenshot — opcionalno">\n              <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-700 bg-slate-950 px-4 text-sm text-slate-300 transition hover:border-blue-500/60">\n                <ImagePlus size={20} className="shrink-0 text-blue-400" />\n                <span className="min-w-0 flex-1 truncate">\n                  {newAttachment ? newAttachment.name : 'Odaberi sliku iz galerije'}\n                </span>\n                <input\n                  type="file"\n                  accept="image/*"\n                  className="hidden"\n                  onChange={(event) => setNewAttachment(event.target.files?.[0] ?? null)}\n                />\n              </label>\n              {newAttachment && (\n                <button type="button" onClick={() => setNewAttachment(null)} className="mt-2 text-xs font-bold text-slate-500 hover:text-white">Ukloni prilog</button>\n              )}\n            </Field>\n\n            <Field label="Kontakt telefon — opcionalno">\n              <input\n                value={contactPhone}`
 t=must(t,phone,attach,'new ticket attachment')
 const replyBox=`                <div className="sticky bottom-0 mt-4 flex items-end gap-2 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 backdrop-blur-xl">`
 const replyNew=`                <div className="sticky bottom-0 mt-4 rounded-2xl border border-slate-800 bg-slate-900/95 p-2 backdrop-blur-xl">\n                  {replyAttachment && (\n                    <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-slate-800 px-3 py-2 text-xs text-slate-300">\n                      <span className="truncate">{replyAttachment.name}</span>\n                      <button type="button" onClick={() => setReplyAttachment(null)} className="shrink-0 text-slate-500 hover:text-white"><X size={15} /></button>\n                    </div>\n                  )}\n                  <div className="flex items-end gap-2">\n                    <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-2xl bg-slate-800 text-slate-400 active:scale-95">\n                      <Paperclip size={18} />\n                      <input type="file" accept="image/*" className="hidden" onChange={(event) => setReplyAttachment(event.target.files?.[0] ?? null)} />\n                    </label>`
 t=must(t,replyBox,replyNew,'reply attachment')
 // close inner flex before existing outer closing: insert before selected condition closing near send button block
 const needle=`                  </button>\n                </div>\n              )}`
 const repl=`                  </button>\n                  </div>\n                </div>\n              )}`
 t=must(t,needle,repl,'reply flex close')
 write(rel,t)
}
console.log('\n✓ Screenshot attachment UI + upload kod dodan.')
console.log('VAŽNO: prije testa pokreni SQL iz support-attachments.sql u Supabase SQL Editoru.')
console.log('Zatim npm run build')
