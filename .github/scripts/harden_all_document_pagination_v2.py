from pathlib import Path

# Offer and invoice may already have the shared adaptive engine from an earlier
# generated commit. Only run the legacy transformation when either document is
# still missing it; otherwise keep the current visual source untouched.
offer_path = Path('src/utils/offerPdf.ts')
invoice_path = Path('src/utils/invoicePdf.ts')
offer = offer_path.read_text(encoding='utf-8')
invoice = invoice_path.read_text(encoding='utf-8')

if (
    'stabilizeOfferPdfLayout' not in offer
    or 'stabilizeInvoicePdfLayout' not in invoice
):
    base = Path('.github/scripts/harden_all_document_pagination.py')
    source = base.read_text(encoding='utf-8')
    marker = '# ---------------------------------------------------------------------------\n# WORK ORDER PDF'
    if marker not in source:
        raise SystemExit('Work-order marker missing in base pagination script')
    exec(compile(source.split(marker, 1)[0], str(base), 'exec'))
    offer = offer_path.read_text(encoding='utf-8')
    invoice = invoice_path.read_text(encoding='utf-8')

# Preserve the invoice-number prefix while adaptive pagination refreshes page
# counters. Only the page number changes; the current footer design/content
# remains otherwise identical.
old_counter = """      if (counter) {
        counter.textContent = `${index + 1}/${total}`
      }
"""
new_counter = """      if (counter) {
        const prefix = (counter.textContent || '').split('·')[0]?.trim()
        counter.textContent = prefix
          ? `${prefix} · ${index + 1}/${total}`
          : `${index + 1}/${total}`
      }
"""
if old_counter in invoice:
    invoice = invoice.replace(old_counter, new_counter, 1)
elif new_counter not in invoice:
    raise SystemExit('Invoice adaptive footer counter anchor missing')
invoice_path.write_text(invoice, encoding='utf-8')

# Current work-order renderer already has rendered-height reflow and
# selector-aware ordering. Add preservation/order assertions without altering
# any visual markup or CSS.
path = Path('src/utils/workOrderPdf.ts')
text = path.read_text(encoding='utf-8')

if 'data-photo-card' not in text:
    old = '              <figure class="photo-card">'
    new = '              <figure class="photo-card" data-photo-card>'
    if old not in text:
        raise SystemExit('Work-order photo marker anchor missing')
    text = text.replace(old, new, 1)

if 'PDF fotografije nisu potpune' not in text:
    old = """  const actualRows = target.querySelectorAll('[data-material-row]').length
  if (actualRows !== order.materials.length) {
    throw new Error(
      `PDF materijal nije potpun (${actualRows}/${order.materials.length} stavki).`,
    )
  }
}
"""
    new = """  const actualRows = target.querySelectorAll('[data-material-row]').length
  if (actualRows !== order.materials.length) {
    throw new Error(
      `PDF materijal nije potpun (${actualRows}/${order.materials.length} stavki).`,
    )
  }

  const actualPhotos = target.querySelectorAll('[data-photo-card]').length
  if (actualPhotos !== order.images.length) {
    throw new Error(
      `PDF fotografije nisu potpune (${actualPhotos}/${order.images.length}).`,
    )
  }

  for (const page of renderedPages(target)) {
    const blocks = [
      page.querySelector('[data-pdf-block="materials"]'),
      page.querySelector('[data-pdf-block="photos"]'),
      page.querySelector('[data-pdf-block="totals"]'),
      page.querySelector('[data-pdf-block="signature"]'),
    ].filter(Boolean) as Element[]

    for (let index = 1; index < blocks.length; index += 1) {
      const relation = blocks[index - 1].compareDocumentPosition(blocks[index])
      if (!(relation & Node.DOCUMENT_POSITION_FOLLOWING)) {
        throw new Error('PDF blokovi nisu u ispravnom redoslijedu.')
      }
    }
  }
}
"""
    if old not in text:
        raise SystemExit('Work-order integrity anchor missing')
    text = text.replace(old, new, 1)

path.write_text(text, encoding='utf-8')
print('Adaptive pagination applied to offer, invoice and work order.')
