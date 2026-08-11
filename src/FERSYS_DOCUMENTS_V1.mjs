// FERSYS_DOCUMENTS_V1.mjs
// Stavi u FERSYS-WINDOWS/src i pokreni: node .\src\FERSYS_DOCUMENTS_V1.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
let root = here
for (let i=0;i<8 && !fs.existsSync(path.join(root,'package.json'));i++) root=path.dirname(root)
if (!fs.existsSync(path.join(root,'package.json'))) throw new Error('Stavi file u FERSYS-WINDOWS/src.')

const targets = {
  work:path.join(root,'src/utils/workOrderPdf.ts'),
  offer:path.join(root,'src/utils/offerPdf.ts'),
  invoice:path.join(root,'src/utils/invoicePdf.ts')
}
for (const p of Object.values(targets)) if(!fs.existsSync(p)) throw new Error(`Nedostaje ${p}`)

const backup=path.join(root,'.fersys-backup-documents-v1',new Date().toISOString().replace(/[:.]/g,'-'))
fs.mkdirSync(backup,{recursive:true})
for(const p of Object.values(targets)) fs.copyFileSync(p,path.join(backup,path.basename(p)))

function inject(source, functionName, marker, css){
  if(source.includes(marker)) return source
  const s=source.indexOf(`function ${functionName}`)
  if(s<0) throw new Error(`Nema ${functionName}`)
  const e=source.indexOf('\n  `\n}',s)
  if(e<0) throw new Error(`Nema kraj ${functionName}`)
  return source.slice(0,e)+`\n\n    /* ${marker} */\n${css}\n`+source.slice(e)
}

let w=fs.readFileSync(targets.work,'utf8')
w=w.replace('order.materials.slice(0, 7)','order.materials.slice(0, order.images.length ? 6 : 9)')
w=inject(w,'commonCss','FERSYS_WORKORDER_FINAL_V1',`
    .header { padding-top:28px; padding-bottom:20px; }
    .page-content { padding-left:54px; padding-right:54px; }
    .company-name { font-size:24px; }
    .company-details { font-size:11.5px; line-height:1.5; }
    .document-number { font-size:22px; }
    .info-grid { gap:12px; margin-bottom:18px; }
    .info-card { min-height:108px; padding:14px 16px; }
    .customer-name { font-size:16px; }
    .info-line,.meta-row { font-size:11.5px; }
    .section { margin-top:17px; }
    .section-title { margin-bottom:9px; font-size:14px; }
    .description-box { padding:12px 15px; }
    .normal-text { font-size:11.5px; line-height:1.5; }
    table { font-size:10.8px; }
    th { padding:8px 9px; font-size:9.5px; }
    td { padding:7px 9px; }
    .signature-area { break-inside:avoid; page-break-inside:avoid; }
`)
fs.writeFileSync(targets.work,w)

let o=fs.readFileSync(targets.offer,'utf8')
o=inject(o,'documentCss','FERSYS_OFFER_FINAL_V1',`
    .page { padding:12mm 13mm 11mm; }
    .page::before { height:4mm; }
    .header { padding-top:5mm; padding-bottom:14px; border-bottom:0; }
    .company h1 { font-size:21px; }
    .subtitle { font-size:9px; }
    .seller-lines { font-size:8.5px; line-height:1.45; }
    .heading { min-width:175px; }
    .heading h2 { font-size:31px; letter-spacing:-.03em; }
    .kicker { font-size:8px; }
    .number { padding:5px 10px; font-size:9.5px; }
    .summary { margin-top:13px; border-radius:12px; }
    .summary>div { padding:9px 10px; }
    .summary span { font-size:7.5px; }
    .summary strong { font-size:9.5px; }
    .summary .total { background:var(--soft); }
    .summary .total strong { font-size:12px; }
    .party-grid { gap:12px; margin-top:13px; }
    .card { padding:12px 13px; border-radius:12px; }
    .card h3 { font-size:7.8px; }
    .party-name { font-size:13px; }
    .party-details { font-size:8.5px; }
    .description { margin-top:12px; padding:10px 12px; font-size:9px; line-height:1.5; }
    .section-title { margin:15px 0 7px; font-size:11px; }
    table { font-size:8.4px; }
    th { padding:7px 5px; background:var(--primary); font-size:7.2px; }
    td { padding:7px 5px; }
    td strong { font-size:8.5px; }
    td p { font-size:7.4px; line-height:1.35; }
    .bottom { grid-template-columns:minmax(0,1fr) 235px; gap:14px; margin-top:13px; }
    .payment-card,.terms-card { padding:10px 11px; border-radius:11px; }
    .terms-card p,.payment-row,.total-row { font-size:8.2px; }
    .total-row { padding:6px 8px; }
    .total-row.grand { padding:10px 9px; font-size:12px; }
    .signature { margin-top:18px; }
    footer { margin-top:13px; font-size:7px; }
`)
o=o.replace('<div class="kicker">Komercijalni dokument</div>','<div class="kicker">Ponuda za izvođenje radova / usluga</div>')
o=o.replace('<h3>Investitor / naručitelj</h3>','<h3>Za naručitelja</h3>')
fs.writeFileSync(targets.offer,o)

let i=fs.readFileSync(targets.invoice,'utf8')
i=inject(i,'documentCss','FERSYS_INVOICE_FINAL_V1',`
    :root { --invoice-dark:#111827; }
    .page { padding:11mm 13mm 11mm; }
    .page::before { height:1.5mm; background:var(--invoice-dark); }
    .header { padding-top:4mm; padding-bottom:13px; border-bottom:2px solid var(--invoice-dark); }
    .company h1 { font-size:20px; }
    .subtitle { font-size:8.5px; }
    .seller-lines { font-size:8.4px; line-height:1.45; }
    .heading h2 { color:var(--invoice-dark); font-size:30px; letter-spacing:-.02em; }
    .kicker { color:var(--muted); font-size:7.8px; }
    .number { border-radius:6px; background:#f1f5f9; color:var(--invoice-dark); font-size:9.5px; }
    .summary { margin-top:13px; border-radius:7px; }
    .summary>div { padding:9px 10px; background:#fff; }
    .summary span { font-size:7.4px; }
    .summary strong { font-size:9.4px; }
    .summary .total { background:var(--invoice-dark); }
    .summary .total span,.summary .total strong { color:#fff; }
    .summary .total strong { font-size:12.5px; }
    .party-grid { gap:12px; margin-top:13px; }
    .card { padding:11px 12px; border-radius:7px; }
    .card h3 { font-size:7.7px; }
    .party-name { font-size:12.5px; }
    .party-details { font-size:8.4px; }
    .description { margin-top:11px; border-left-color:var(--invoice-dark); background:#f8fafc; font-size:8.8px; }
    .section-title { margin:14px 0 7px; font-size:10.5px; }
    table { font-size:8.3px; }
    th { padding:7px 5px; background:var(--invoice-dark); font-size:7.1px; }
    td { padding:7px 5px; }
    td strong { font-size:8.4px; }
    td p { font-size:7.3px; }
    .bottom { grid-template-columns:minmax(0,1fr) 245px; gap:15px; margin-top:14px; }
    .payment-card,.terms-card { border-radius:7px; background:#f8fafc; padding:10px 11px; }
    .payment-row,.terms-card p,.total-row { font-size:8.2px; }
    .total-row { padding:6px 8px; }
    .total-row.grand { padding:11px 9px; background:var(--invoice-dark); color:#fff; font-size:12.5px; }
    .signature { margin-top:17px; }
    footer { font-size:7px; }
`)
i=i.replace('<div class="kicker">Komercijalni dokument</div>','<div class="kicker">Dokument za plaćanje</div>')
i=i.replace('<h3>Investitor / naručitelj</h3>','<h3>Kupac / primatelj računa</h3>')
fs.writeFileSync(targets.invoice,i)

console.log('✅ Radni nalog, ponuda i račun ažurirani.')
console.log('✅ Backup:',backup)
console.log('Sada RUČNO pokreni: npm run build')
