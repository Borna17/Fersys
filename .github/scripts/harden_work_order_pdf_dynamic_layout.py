from pathlib import Path

path = Path('src/utils/workOrderPdf.ts')
text = path.read_text(encoding='utf-8')

replacements = {
'''    <section>\n      ${sectionTitle(\n        branding.customDescriptionLabel || 'Opis radova',''': '''    <section data-pdf-block="description">\n      ${sectionTitle(\n        branding.customDescriptionLabel || 'Opis radova',''',
'''    <section>\n      ${sectionTitle(\n        branding.customMaterialsLabel || 'Utrošeni materijal',''': '''    <section data-pdf-block="materials">\n      ${sectionTitle(\n        branding.customMaterialsLabel || 'Utrošeni materijal',''',
'''              <article class="material-row">''': '''              <article class="material-row" data-material-row>''',
'''    <section>\n      ${sectionTitle(\n        branding.customPhotosLabel || 'Fotografije',''': '''    <section data-pdf-block="photos">\n      ${sectionTitle(\n        branding.customPhotosLabel || 'Fotografije',''',
'''    <section class="totals-section">''': '''    <section class="totals-section" data-pdf-block="totals">''',
'''    <section class="signature-section">''': '''    <section class="signature-section" data-pdf-block="signature">''',
}

for old, new in replacements.items():
    if old not in text:
        raise SystemExit(f'Missing expected snippet for replacement: {old[:80]!r}')
    text = text.replace(old, new, 1)

anchor = '''async function buildPdfDocument(\n  order: WorkOrder,\n  branding: WorkOrderBranding,\n) {'''
if anchor not in text:
    raise SystemExit('buildPdfDocument anchor not found')

helper = r'''
type RenderedPdfPage = HTMLElement & {
  dataset: DOMStringMap
}

function renderedPages(target: HTMLElement) {
  return Array.from(
    target.querySelectorAll('[data-pdf-page]'),
  ) as RenderedPdfPage[]
}

function pageInner(page: HTMLElement) {
  return page.querySelector('.page-inner') as HTMLElement | null
}

function pageOverflows(page: HTMLElement) {
  const inner = pageInner(page)
  if (!inner) return false
  return inner.scrollHeight > inner.clientHeight + 2
}

function materialRows(page: HTMLElement) {
  return Array.from(
    page.querySelectorAll('[data-material-row]'),
  ) as HTMLElement[]
}

function materialSection(page: HTMLElement) {
  return page.querySelector(
    '[data-pdf-block="materials"]',
  ) as HTMLElement | null
}

function materialsContainer(page: HTMLElement) {
  return page.querySelector(
    '[data-pdf-block="materials"] .materials',
  ) as HTMLElement | null
}

function insertionAnchor(page: HTMLElement) {
  return (
    page.querySelector('[data-pdf-block="photos"]') ||
    page.querySelector('[data-pdf-block="totals"]') ||
    page.querySelector('[data-pdf-block="signature"]') ||
    page.querySelector('.footer')
  ) as HTMLElement | null
}

function ensureMaterialSection(
  page: HTMLElement,
  sourceSection: HTMLElement,
) {
  const existing = materialSection(page)
  if (existing) {
    return existing.querySelector('.materials') as HTMLElement
  }

  const clone = sourceSection.cloneNode(true) as HTMLElement
  const container = clone.querySelector('.materials') as HTMLElement
  container.replaceChildren()

  const inner = pageInner(page)
  if (!inner) {
    throw new Error('PDF stranica nema unutarnji sadržaj.')
  }

  const before = insertionAnchor(page)
  inner.insertBefore(clone, before)
  return container
}

function cleanupEmptyMaterialSection(page: HTMLElement) {
  const section = materialSection(page)
  if (!section) return
  if (!section.querySelector('[data-material-row]')) {
    section.remove()
  }
}

function createContinuationPage(
  target: HTMLElement,
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const temp = document.createElement('div')
  const blank: PdfPage = {
    materials: [],
    materialStartIndex: 0,
    photos: [],
    first: false,
    last: false,
    showTotals: false,
  }

  temp.innerHTML = pageHtml(
    blank,
    1,
    1,
    order,
    branding,
    appearance,
  )

  const page = temp.firstElementChild as RenderedPdfPage | null
  if (!page) {
    throw new Error('Nastavna PDF stranica nije se mogla napraviti.')
  }

  target.appendChild(page)
  return page
}

function nextPageOrCreate(
  target: HTMLElement,
  page: HTMLElement,
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const pages = renderedPages(target)
  const index = pages.indexOf(page as RenderedPdfPage)
  if (index >= 0 && pages[index + 1]) return pages[index + 1]
  return createContinuationPage(target, order, branding, appearance)
}

function moveLastMaterialRowForward(
  target: HTMLElement,
  page: HTMLElement,
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const rows = materialRows(page)
  const row = rows[rows.length - 1]
  const sourceSection = materialSection(page)
  if (!row || !sourceSection) return false

  const next = nextPageOrCreate(
    target,
    page,
    order,
    branding,
    appearance,
  )
  const nextContainer = ensureMaterialSection(next, sourceSection)
  nextContainer.prepend(row)
  cleanupEmptyMaterialSection(page)
  return true
}

function moveBlockForward(
  target: HTMLElement,
  page: HTMLElement,
  selector: string,
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  const block = page.querySelector(selector) as HTMLElement | null
  if (!block) return false

  const next = nextPageOrCreate(
    target,
    page,
    order,
    branding,
    appearance,
  )
  const inner = pageInner(next)
  if (!inner) return false

  const before = insertionAnchor(next)
  inner.insertBefore(block, before)
  return true
}

function tryPullFirstMaterialBackward(
  current: HTMLElement,
  next: HTMLElement,
) {
  const sourceSection = materialSection(next)
  const row = materialRows(next)[0]
  if (!sourceSection || !row) return false

  const currentContainer = ensureMaterialSection(current, sourceSection)
  currentContainer.appendChild(row)

  if (pageOverflows(current)) {
    const sourceContainer = ensureMaterialSection(next, sourceSection)
    sourceContainer.prepend(row)
    cleanupEmptyMaterialSection(current)
    return false
  }

  cleanupEmptyMaterialSection(next)
  return true
}

function tryPullWholeBlockBackward(
  current: HTMLElement,
  next: HTMLElement,
  selector: string,
) {
  const block = next.querySelector(selector) as HTMLElement | null
  if (!block || current.querySelector(selector)) return false

  const inner = pageInner(current)
  if (!inner) return false

  const nextInner = pageInner(next)
  const originalNextSibling = block.nextSibling
  const before = insertionAnchor(current)
  inner.insertBefore(block, before)

  if (pageOverflows(current)) {
    if (nextInner) {
      nextInner.insertBefore(block, originalNextSibling)
    }
    return false
  }

  return true
}

function isVisuallyEmptyContinuation(page: HTMLElement) {
  if (page.classList.contains('first-pdf-page')) return false
  return !page.querySelector(
    '[data-material-row], [data-pdf-block="photos"], [data-pdf-block="totals"], [data-pdf-block="signature"]',
  )
}

function refreshPageMetadata(
  target: HTMLElement,
  order: WorkOrder,
  appearance: DocumentAppearance,
) {
  const pages = renderedPages(target)
  pages.forEach((page, index) => {
    page.classList.toggle('first-pdf-page', index === 0)
    page.classList.toggle('final-pdf-page', index === pages.length - 1)

    const footer = page.querySelector('.footer')
    if (footer && appearance.showFooter) {
      const spans = footer.querySelectorAll('span')
      const counter = spans[spans.length - 1]
      if (counter) {
        counter.textContent = `${order.orderNumber} · ${index + 1}/${pages.length}`
      }
    }
  })
}

async function reflowRenderedPdfPages(
  target: HTMLElement,
  order: WorkOrder,
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {
  // The original pagination is only an initial guess. From this point on the
  // browser's rendered dimensions are the source of truth.
  for (let pass = 0; pass < 12; pass += 1) {
    let changed = false
    const pages = renderedPages(target)

    for (const page of pages) {
      let guard = 0
      while (pageOverflows(page) && guard < 100) {
        guard += 1

        if (
          moveLastMaterialRowForward(
            target,
            page,
            order,
            branding,
            appearance,
          )
        ) {
          changed = true
          continue
        }

        if (
          moveBlockForward(
            target,
            page,
            '[data-pdf-block="photos"]',
            order,
            branding,
            appearance,
          )
        ) {
          changed = true
          continue
        }

        if (
          moveBlockForward(
            target,
            page,
            '[data-pdf-block="signature"]',
            order,
            branding,
            appearance,
          )
        ) {
          changed = true
          continue
        }

        if (
          moveBlockForward(
            target,
            page,
            '[data-pdf-block="totals"]',
            order,
            branding,
            appearance,
          )
        ) {
          changed = true
          continue
        }

        // If header/info/description alone is taller than one A4 page, do not
        // silently crop it. This is intentionally a hard failure rather than a
        // corrupt PDF; normal long descriptions are handled by moving every
        // following block to continuation pages.
        throw new Error(
          'Sadržaj zaglavlja i opisa radova ne stane na jednu A4 stranicu. Skrati opis ili podijeli opis u više odjeljaka.',
        )
      }
    }

    // Compact material rows and whole photo blocks backward into genuinely
    // available rendered space. This removes the large blank gaps created by
    // fixed row-count heuristics without ever allowing an overflow.
    const compactPages = renderedPages(target)
    for (let index = 0; index < compactPages.length - 1; index += 1) {
      const current = compactPages[index]
      const next = compactPages[index + 1]

      let pulled = true
      while (pulled) {
        pulled = tryPullFirstMaterialBackward(current, next)
        if (pulled) changed = true
      }

      if (
        tryPullWholeBlockBackward(
          current,
          next,
          '[data-pdf-block="photos"]',
        )
      ) {
        changed = true
      }
    }

    renderedPages(target)
      .filter(isVisuallyEmptyContinuation)
      .forEach((page) => {
        page.remove()
        changed = true
      })

    refreshPageMetadata(target, order, appearance)

    // Final-page photo CSS can change measured height. Allow one layout frame
    // before deciding the pass is stable.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    )

    if (!changed) break
  }

  refreshPageMetadata(target, order, appearance)

  const overflow = renderedPages(target).find(pageOverflows)
  if (overflow) {
    throw new Error(
      'Automatski raspored PDF-a nije uspio smjestiti sav sadržaj bez rezanja.',
    )
  }

  const actualRows = target.querySelectorAll('[data-material-row]').length
  if (actualRows !== order.materials.length) {
    throw new Error(
      `PDF materijal nije potpun (${actualRows}/${order.materials.length} stavki).`,
    )
  }
}

'''

text = text.replace(anchor, helper + anchor, 1)

old_call = '''    await document.fonts?.ready\n    await waitForImages(target)\n\n    const pages = Array.from(\n      target.querySelectorAll('[data-pdf-page]'),\n    ) as HTMLElement[]'''
new_call = '''    await document.fonts?.ready\n    await waitForImages(target)\n    await reflowRenderedPdfPages(\n      target,\n      order,\n      branding,\n      appearance,\n    )\n    await waitForImages(target)\n\n    const pages = renderedPages(target)'''
if old_call not in text:
    raise SystemExit('PDF render call anchor not found')
text = text.replace(old_call, new_call, 1)

# Make overflow visible to our measurement engine, but keep page clipping as a
# final safety boundary for html2canvas. The inner content is what is measured.
if 'overflow: hidden;\n      flex-direction: column;' not in text:
    raise SystemExit('pdf-page overflow CSS anchor not found')

path.write_text(text, encoding='utf-8')
print('Dynamic rendered-height PDF reflow patch applied.')
