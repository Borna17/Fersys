from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise SystemExit(f'Missing expected snippet: {label}')
    return text.replace(old, new, 1)


# ---------------------------------------------------------------------------
# OFFER PDF — preserve existing design, replace heuristic-only final layout
# with rendered A4 compaction/overflow handling.
# ---------------------------------------------------------------------------
offer_path = Path('src/utils/offerPdf.ts')
offer = offer_path.read_text(encoding='utf-8')

if "from './pdfLayoutEngine'" not in offer:
    offer = replace_once(
        offer,
        "import {\n  notifyDownloadError,\n  notifyDownloadPreparing,\n  saveBlobDownload,\n} from './downloadFeedback'\n",
        "import {\n  notifyDownloadError,\n  notifyDownloadPreparing,\n  saveBlobDownload,\n} from './downloadFeedback'\nimport {\n  stabilizeAdaptiveTableDocument,\n} from './pdfLayoutEngine'\n",
        'offer layout engine import',
    )

# Mark rows and table without changing classes/CSS.
offer = replace_once(
    offer,
    '''          <article\n            class="item-row ${''',
    '''          <article\n            data-pdf-row\n            class="item-row ${''',
    'offer row marker',
)
offer = replace_once(
    offer,
    '''        <section\n          class="items-wrap"\n        >''',
    '''        <section\n          data-pdf-table\n          class="items-wrap"\n        >''',
    'offer table marker',
)

# Keep final blocks as one movable semantic unit. display:contents leaves the
# existing visual box tree unchanged.
old_offer_final = '''        ${\n          page.final\n            ? `\n              ${notesAndTotalsHtml(\n                offer,\n                summary,\n              )}\n\n              ${signatureAndPaymentHtml(\n                offer,\n                settings,\n              )}\n            `\n            : ''\n        }'''
new_offer_final = '''        ${\n          page.final\n            ? `\n              <div data-pdf-final class="pdf-final-layout">\n                ${notesAndTotalsHtml(\n                  offer,\n                  summary,\n                )}\n\n                ${signatureAndPaymentHtml(\n                  offer,\n                  settings,\n                )}\n              </div>\n            `\n            : ''\n        }'''
offer = replace_once(offer, old_offer_final, new_offer_final, 'offer final wrapper')

# CSS helper only; display:contents means no visual change.
offer = replace_once(
    offer,
    '''    .summary-grid {\n      display: grid;''',
    '''    .pdf-final-layout { display: contents; }\n\n    .summary-grid {\n      display: grid;''',
    'offer final display contents',
)

# Add a hidden continuation page template to the generated document. It uses
# the same existing page builder, so continuation pages are visually identical.
old_offer_pages = '''  const pagesHtml =\n    pages\n      .map(\n        (\n          page,\n          pageIndex,\n        ) => {\n          const startIndex =\n            itemIndex\n\n          itemIndex +=\n            page.items.length\n\n          return buildFirstOrOnlyPage(\n            page,\n            pageIndex,\n            pages.length,\n            startIndex,\n            offer,\n            settings,\n            summary,\n          )\n        },\n      )\n      .join('')\n\n  return `<!doctype html>'''
new_offer_pages = '''  const pagesHtml =\n    pages\n      .map(\n        (\n          page,\n          pageIndex,\n        ) => {\n          const startIndex =\n            itemIndex\n\n          itemIndex +=\n            page.items.length\n\n          return buildFirstOrOnlyPage(\n            page,\n            pageIndex,\n            pages.length,\n            startIndex,\n            offer,\n            settings,\n            summary,\n          )\n        },\n      )\n      .join('')\n\n  const continuationTemplate =\n    buildFirstOrOnlyPage(\n      {\n        items: [],\n        first: false,\n        final: false,\n      },\n      0,\n      1,\n      0,\n      offer,\n      settings,\n      summary,\n    )\n\n  return `<!doctype html>'''
offer = replace_once(offer, old_offer_pages, new_offer_pages, 'offer continuation template variable')

offer = replace_once(
    offer,
    '''  <main class="pages">\n    ${pagesHtml}\n  </main>\n</body>''',
    '''  <main class="pages">\n    ${pagesHtml}\n  </main>\n\n  <template data-pdf-continuation-template>\n    ${continuationTemplate}\n  </template>\n</body>''',
    'offer continuation template html',
)

# Shared stabilizer. Footer is refreshed after pages are added/removed.
offer_helper_anchor = '''async function renderHtmlPagesToPdf(\n  html: string,'''
if 'async function stabilizeOfferPdfLayout(' not in offer:
    offer_helper = '''async function stabilizeOfferPdfLayout(\n  doc: Document,\n) {\n  const expectedRows =\n    doc.querySelectorAll('[data-pdf-row]').length\n\n  await stabilizeAdaptiveTableDocument(\n    doc,\n    {\n      pagesRootSelector: '.pages',\n      pageSelector: '.pages > .page',\n      tableSelector: '[data-pdf-table]',\n      rowSelector: '[data-pdf-row]',\n      finalSelector: '[data-pdf-final]',\n      continuationTemplateSelector:\n        'template[data-pdf-continuation-template]',\n      footerSelector: '.footer',\n      expectedRowCount: expectedRows,\n      updatePageMetadata: (page, index, total) => {\n        const counter = page.querySelector('.footer strong')\n        if (counter) counter.textContent = `${index + 1} / ${total}`\n      },\n    },\n  )\n}\n\n'''
    if offer_helper_anchor not in offer:
        raise SystemExit('Missing offer renderer anchor')
    offer = offer.replace(offer_helper_anchor, offer_helper + offer_helper_anchor, 1)

# Stabilize downloadable PDF after fonts/images are ready.
offer = replace_once(
    offer,
    '''    await doc.fonts?.ready\n    await waitForImages(doc)\n\n    const toolbar =''',
    '''    await doc.fonts?.ready\n    await waitForImages(doc)\n    await stabilizeOfferPdfLayout(doc)\n    await waitForImages(doc)\n\n    const toolbar =''',
    'offer renderer stabilization',
)

# Stabilize preview too, so what the user sees/prints matches downloaded PDF.
old_offer_preview = '''      previewWindow.document.write(\n        html,\n      )\n      previewWindow.document.close()'''
new_offer_preview = '''      previewWindow.document.write(\n        html,\n      )\n      previewWindow.document.close()\n\n      await previewWindow.document.fonts?.ready\n      await waitForImages(previewWindow.document)\n      await stabilizeOfferPdfLayout(previewWindow.document)'''
offer = replace_once(offer, old_offer_preview, new_offer_preview, 'offer preview stabilization')

offer_path.write_text(offer, encoding='utf-8')


# ---------------------------------------------------------------------------
# INVOICE PDF — same shared A4 engine, same current visual template.
# ---------------------------------------------------------------------------
invoice_path = Path('src/utils/invoicePdf.ts')
invoice = invoice_path.read_text(encoding='utf-8')

if "from './pdfLayoutEngine'" not in invoice:
    invoice = replace_once(
        invoice,
        "import { createHub3Pdf417DataUrl } from './hub3Barcode'\n",
        "import { createHub3Pdf417DataUrl } from './hub3Barcode'\nimport { stabilizeAdaptiveTableDocument } from './pdfLayoutEngine'\n",
        'invoice layout engine import',
    )

invoice = replace_once(
    invoice,
    '''    <div class="item-row">''',
    '''    <div class="item-row" data-pdf-row>''',
    'invoice row marker',
)

invoice = replace_once(
    invoice,
    '''    .summary-grid { display: grid;''',
    '''    .pdf-final-layout { display: contents; }\n    .summary-grid { display: grid;''',
    'invoice final display contents',
)

invoice = replace_once(
    invoice,
    '''        <div class="table table-${esc(settings.tableStyle)}">''',
    '''        <div class="table table-${esc(settings.tableStyle)}" data-pdf-table>''',
    'invoice table marker',
)

invoice = replace_once(
    invoice,
    '''        ${final ? finalHtml(invoice, settings, totals) : ''}''',
    '''        ${final ? `<div data-pdf-final class="pdf-final-layout">${finalHtml(invoice, settings, totals)}</div>` : ''}''',
    'invoice final wrapper',
)

# Build a hidden continuation template from the exact existing invoice markup.
old_invoice_return_anchor = '''  return `<!doctype html>\n<html lang="hr">'''
if 'const continuationTemplate =' not in invoice[invoice.find('export function buildInvoicePdfHtml'):invoice.find('async function resolvedPdfSettings')]:
    continuation_code = '''  const continuationTemplate = `\n    <section class="page">\n      ${settings.showWatermark && settings.watermarkText\n        ? `<div class="watermark">${esc(settings.watermarkText)}</div>`\n        : ''}\n      ${headerHtml(invoice, settings, true)}\n      ${sectionTitle('Stavke računa · nastavak', settings)}\n      <div class="table table-${esc(settings.tableStyle)}" data-pdf-table>\n        <div class="item-head">\n          <span>OPIS</span><span>KOL.</span><span>CIJENA</span><span>UKUPNO</span>\n        </div>\n      </div>\n      ${settings.showFooter ? `\n        <footer class="footer">\n          <span>${esc(settings.footerText || '')}</span>\n          <span>${esc(invoice.invoiceNumber)} · 1/1</span>\n        </footer>\n      ` : ''}\n    </section>\n  `\n\n'''
    build_start = invoice.find('export function buildInvoicePdfHtml')
    return_pos = invoice.find(old_invoice_return_anchor, build_start)
    if return_pos < 0:
        raise SystemExit('Missing invoice return anchor')
    invoice = invoice[:return_pos] + continuation_code + invoice[return_pos:]

invoice = replace_once(
    invoice,
    '''  <main class="pages">${htmlPages}</main>\n</body>''',
    '''  <main class="pages">${htmlPages}</main>\n  <template data-pdf-continuation-template>${continuationTemplate}</template>\n</body>''',
    'invoice continuation template html',
)

invoice_renderer_anchor = '''async function renderHtmlPagesToPdf(\n  html: string,'''
if 'async function stabilizeInvoicePdfLayout(' not in invoice:
    invoice_helper = '''async function stabilizeInvoicePdfLayout(\n  doc: Document,\n) {\n  const expectedRows = doc.querySelectorAll('[data-pdf-row]').length\n\n  await stabilizeAdaptiveTableDocument(doc, {\n    pagesRootSelector: '.pages',\n    pageSelector: '.pages > .page',\n    tableSelector: '[data-pdf-table]',\n    rowSelector: '[data-pdf-row]',\n    finalSelector: '[data-pdf-final]',\n    continuationTemplateSelector: 'template[data-pdf-continuation-template]',\n    footerSelector: '.footer',\n    expectedRowCount: expectedRows,\n    updatePageMetadata: (page, index, total) => {\n      const spans = page.querySelectorAll('.footer span')\n      const counter = spans[spans.length - 1]\n      if (counter) {\n        counter.textContent = `${index + 1}/${total}`\n      }\n    },\n  })\n}\n\n'''
    if invoice_renderer_anchor not in invoice:
        raise SystemExit('Missing invoice renderer anchor')
    invoice = invoice.replace(invoice_renderer_anchor, invoice_helper + invoice_renderer_anchor, 1)

invoice = replace_once(
    invoice,
    '''    await doc.fonts?.ready\n    await waitForImages(doc)\n\n    const toolbar =''',
    '''    await doc.fonts?.ready\n    await waitForImages(doc)\n    await stabilizeInvoicePdfLayout(doc)\n    await waitForImages(doc)\n\n    const toolbar =''',
    'invoice renderer stabilization',
)

old_invoice_preview = '''      previewWindow.document.open()\n      previewWindow.document.write(html)\n      previewWindow.document.close()'''
new_invoice_preview = '''      previewWindow.document.open()\n      previewWindow.document.write(html)\n      previewWindow.document.close()\n\n      await previewWindow.document.fonts?.ready\n      await waitForImages(previewWindow.document)\n      await stabilizeInvoicePdfLayout(previewWindow.document)'''
invoice = replace_once(invoice, old_invoice_preview, new_invoice_preview, 'invoice preview stabilization')

invoice_path.write_text(invoice, encoding='utf-8')


# ---------------------------------------------------------------------------
# WORK ORDER PDF — it already has rendered-height reflow. Harden its semantic
# order and integrity checks without changing the visual template.
# ---------------------------------------------------------------------------
work_path = Path('src/utils/workOrderPdf.ts')
work = work_path.read_text(encoding='utf-8')

# Photos are tracked individually for integrity checks.
if 'data-photo-card' not in work:
    work = replace_once(
        work,
        '''              <figure class="photo-card">''',
        '''              <figure class="photo-card" data-photo-card>''',
        'work order photo marker',
    )

# Rank-aware insertion anchor prevents totals/signature from ever being moved
# in front of photographs during backward compaction.
old_anchor_func = '''function insertionAnchor(page: HTMLElement) {\n  return (\n    page.querySelector('[data-pdf-block="photos"]') ||\n    page.querySelector('[data-pdf-block="totals"]') ||\n    page.querySelector('[data-pdf-block="signature"]') ||\n    page.querySelector('.footer')\n  ) as HTMLElement | null\n}\n'''
new_anchor_func = '''function insertionAnchor(page: HTMLElement) {\n  return (\n    page.querySelector('[data-pdf-block="photos"]') ||\n    page.querySelector('[data-pdf-block="totals"]') ||\n    page.querySelector('[data-pdf-block="signature"]') ||\n    page.querySelector('.footer')\n  ) as HTMLElement | null\n}\n\nfunction blockInsertionAnchor(\n  page: HTMLElement,\n  selector: string,\n) {\n  if (selector === '[data-pdf-block="photos"]') {\n    return (\n      page.querySelector('[data-pdf-block="totals"]') ||\n      page.querySelector('[data-pdf-block="signature"]') ||\n      page.querySelector('.footer')\n    ) as HTMLElement | null\n  }\n\n  if (selector === '[data-pdf-block="totals"]') {\n    return (\n      page.querySelector('[data-pdf-block="signature"]') ||\n      page.querySelector('.footer')\n    ) as HTMLElement | null\n  }\n\n  if (selector === '[data-pdf-block="signature"]') {\n    return page.querySelector('.footer') as HTMLElement | null\n  }\n\n  return insertionAnchor(page)\n}\n'''
if 'function blockInsertionAnchor(' not in work:
    work = replace_once(work, old_anchor_func, new_anchor_func, 'work order rank anchor')

# There are two generic block insertion sites. Replace only the exact local
# expressions that include selector context.
old_move_forward = '''  const before = insertionAnchor(next)\n  inner.insertBefore(block, before)\n  return true\n}\n\nfunction tryPullFirstMaterialBackward'''
new_move_forward = '''  const before = blockInsertionAnchor(next, selector)\n  inner.insertBefore(block, before)\n  return true\n}\n\nfunction tryPullFirstMaterialBackward'''
work = replace_once(work, old_move_forward, new_move_forward, 'work order forward block order')

old_pull = '''  const nextInner = pageInner(next)\n  const originalNextSibling = block.nextSibling\n  const before = insertionAnchor(current)\n  inner.insertBefore(block, before)'''
new_pull = '''  const nextInner = pageInner(next)\n  const originalNextSibling = block.nextSibling\n  const before = blockInsertionAnchor(current, selector)\n  inner.insertBefore(block, before)'''
work = replace_once(work, old_pull, new_pull, 'work order backward block order')

# Add photo preservation and semantic order assertions next to the existing
# material preservation assertion.
old_integrity = '''  const actualRows = target.querySelectorAll('[data-material-row]').length\n  if (actualRows !== order.materials.length) {\n    throw new Error(\n      `PDF materijal nije potpun (${actualRows}/${order.materials.length} stavki).`,\n    )\n  }\n}\n'''
new_integrity = '''  const actualRows = target.querySelectorAll('[data-material-row]').length\n  if (actualRows !== order.materials.length) {\n    throw new Error(\n      `PDF materijal nije potpun (${actualRows}/${order.materials.length} stavki).`,\n    )\n  }\n\n  const actualPhotos = target.querySelectorAll('[data-photo-card]').length\n  if (actualPhotos !== order.images.length) {\n    throw new Error(\n      `PDF fotografije nisu potpune (${actualPhotos}/${order.images.length}).`,\n    )\n  }\n\n  for (const page of renderedPages(target)) {\n    const blocks = [\n      page.querySelector('[data-pdf-block="materials"]'),\n      page.querySelector('[data-pdf-block="photos"]'),\n      page.querySelector('[data-pdf-block="totals"]'),\n      page.querySelector('[data-pdf-block="signature"]'),\n    ].filter(Boolean) as Element[]\n\n    for (let index = 1; index < blocks.length; index += 1) {\n      const relation = blocks[index - 1].compareDocumentPosition(blocks[index])\n      if (!(relation & Node.DOCUMENT_POSITION_FOLLOWING)) {\n        throw new Error('PDF blokovi nisu u ispravnom redoslijedu.')\n      }\n    }\n  }\n}\n'''
work = replace_once(work, old_integrity, new_integrity, 'work order integrity assertions')

work_path.write_text(work, encoding='utf-8')

print('Hardened offer, invoice and work-order pagination without changing document design.')
