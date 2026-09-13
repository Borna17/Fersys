export type AdaptiveTableLayoutConfig = {
  pagesRootSelector: string
  pageSelector: string
  tableSelector: string
  rowSelector: string
  finalSelector: string
  continuationTemplateSelector: string
  footerSelector?: string
  expectedRowCount?: number
  tolerancePx?: number
  maxPasses?: number
  updatePageMetadata?: (
    page: HTMLElement,
    pageIndex: number,
    totalPages: number,
  ) => void
}

function asElements<T extends Element>(
  root: ParentNode,
  selector: string,
) {
  return Array.from(root.querySelectorAll(selector)) as T[]
}

export function pdfPageOverflows(
  page: HTMLElement,
  tolerancePx = 2,
) {
  return page.scrollHeight > page.clientHeight + tolerancePx
}

function rowsOnPage(
  page: HTMLElement,
  config: AdaptiveTableLayoutConfig,
) {
  return asElements<HTMLElement>(page, config.rowSelector)
}

function tableOnPage(
  page: HTMLElement,
  config: AdaptiveTableLayoutConfig,
) {
  return page.querySelector(config.tableSelector) as HTMLElement | null
}

function finalOnPage(
  page: HTMLElement,
  config: AdaptiveTableLayoutConfig,
) {
  return page.querySelector(config.finalSelector) as HTMLElement | null
}

function insertRowAtStart(
  page: HTMLElement,
  row: HTMLElement,
  config: AdaptiveTableLayoutConfig,
) {
  const table = tableOnPage(page, config)
  if (!table) {
    throw new Error('PDF nastavna stranica nema tablicu stavki.')
  }

  const firstRow = table.querySelector(config.rowSelector)
  table.insertBefore(row, firstRow)
}

function appendRow(
  page: HTMLElement,
  row: HTMLElement,
  config: AdaptiveTableLayoutConfig,
) {
  const table = tableOnPage(page, config)
  if (!table) {
    throw new Error('PDF stranica nema tablicu stavki.')
  }
  table.appendChild(row)
}

function insertFinalBeforeFooter(
  page: HTMLElement,
  block: HTMLElement,
  config: AdaptiveTableLayoutConfig,
) {
  const footer = config.footerSelector
    ? page.querySelector(config.footerSelector)
    : null

  // Offer pages keep their document flow inside .page-content. When the
  // optional footer is hidden we still need to insert the closing block into
  // that same content container rather than directly under .page.
  const content =
    footer?.parentElement ||
    tableOnPage(page, config)?.parentElement ||
    page

  content.insertBefore(block, footer)
}

function cloneContinuationPage(
  doc: Document,
  config: AdaptiveTableLayoutConfig,
) {
  const template = doc.querySelector(
    config.continuationTemplateSelector,
  ) as HTMLTemplateElement | null

  const page = template?.content.firstElementChild?.cloneNode(true) as HTMLElement | null
  if (!page) {
    throw new Error('PDF nastavna stranica nije dostupna.')
  }
  return page
}

function pages(
  doc: Document,
  config: AdaptiveTableLayoutConfig,
) {
  return asElements<HTMLElement>(doc, config.pageSelector)
}

function pageIsEmpty(
  page: HTMLElement,
  config: AdaptiveTableLayoutConfig,
) {
  return (
    rowsOnPage(page, config).length === 0 &&
    !finalOnPage(page, config)
  )
}

function refreshMetadata(
  doc: Document,
  config: AdaptiveTableLayoutConfig,
) {
  const allPages = pages(doc, config)
  allPages.forEach((page, index) => {
    page.dataset.pdfPageIndex = String(index)
    page.dataset.pdfPageCount = String(allPages.length)
    config.updatePageMetadata?.(page, index, allPages.length)
  })
}

function assertIntegrity(
  doc: Document,
  config: AdaptiveTableLayoutConfig,
) {
  const allPages = pages(doc, config)
  const overflow = allPages.find((page) =>
    pdfPageOverflows(page, config.tolerancePx),
  )

  if (overflow) {
    throw new Error('PDF sadržaj prelazi A4 stranicu nakon automatskog slaganja.')
  }

  if (typeof config.expectedRowCount === 'number') {
    const actual = doc.querySelectorAll(config.rowSelector).length
    if (actual !== config.expectedRowCount) {
      throw new Error(
        `PDF nema sve stavke (${actual}/${config.expectedRowCount}).`,
      )
    }
  }

  const finalBlocks = doc.querySelectorAll(config.finalSelector).length
  if (finalBlocks !== 1) {
    throw new Error(`PDF završni blok nije jednoznačan (${finalBlocks}).`)
  }
}

/**
 * FERSYS A4 layout engine.
 *
 * Existing document HTML/CSS remains untouched visually. The engine only
 * redistributes rendered rows and the existing final block after the browser
 * has loaded fonts/images. The browser's real pixel measurements are the
 * source of truth; fixed row-count heuristics are only a bootstrap.
 */
export async function stabilizeAdaptiveTableDocument(
  doc: Document,
  config: AdaptiveTableLayoutConfig,
) {
  const root = doc.querySelector(config.pagesRootSelector) as HTMLElement | null
  if (!root) throw new Error('PDF spremnik stranica nije pronađen.')

  const tolerance = config.tolerancePx ?? 2
  const maxPasses = config.maxPasses ?? 30

  for (let pass = 0; pass < maxPasses; pass += 1) {
    let changed = false
    let allPages = pages(doc, config)

    // Overflow is resolved forward. Keep the closing block whole and move it
    // before rows only when rows already occupy too much of the current page.
    for (let index = 0; index < allPages.length; index += 1) {
      const page = allPages[index]
      let guard = 0

      while (pdfPageOverflows(page, tolerance) && guard < 200) {
        guard += 1
        const pageRows = rowsOnPage(page, config)
        const final = finalOnPage(page, config)

        if (final && pageRows.length > 0) {
          let next = allPages[index + 1]
          if (!next) {
            next = cloneContinuationPage(doc, config)
            root.appendChild(next)
            allPages = pages(doc, config)
          }
          insertFinalBeforeFooter(next, final, config)
          changed = true
          continue
        }

        const row = pageRows[pageRows.length - 1]
        if (row) {
          let next = allPages[index + 1]
          if (!next) {
            next = cloneContinuationPage(doc, config)
            root.appendChild(next)
            allPages = pages(doc, config)
          }
          insertRowAtStart(next, row, config)
          changed = true
          continue
        }

        // A single non-splittable closing block (or fixed header) is taller
        // than an A4 page. Do not silently crop it.
        throw new Error('Jedan PDF blok je previsok za jednu A4 stranicu.')
      }
    }

    // Fill earlier pages using measured free space. A row is moved back only
    // if the rendered page still fits afterwards. This eliminates unnecessary
    // blank areas and cases such as 5 rows + 3 rows with room left on page 1.
    allPages = pages(doc, config)
    for (let index = 0; index < allPages.length - 1; index += 1) {
      const current = allPages[index]
      const next = allPages[index + 1]

      while (true) {
        const row = rowsOnPage(next, config)[0]
        if (!row) break

        const nextFirstRow = row.nextSibling
        appendRow(current, row, config)

        if (pdfPageOverflows(current, tolerance)) {
          const nextTable = tableOnPage(next, config)
          if (!nextTable) throw new Error('PDF nastavna tablica nije pronađena.')
          nextTable.insertBefore(row, nextFirstRow)
          break
        }

        changed = true
      }

      const final = finalOnPage(next, config)
      if (final) {
        const nextParent = final.parentElement
        const nextSibling = final.nextSibling
        insertFinalBeforeFooter(current, final, config)

        if (pdfPageOverflows(current, tolerance)) {
          nextParent?.insertBefore(final, nextSibling)
        } else {
          changed = true
        }
      }
    }

    // Drop continuation pages which became empty after backward compaction.
    pages(doc, config)
      .slice(1)
      .filter((page) => pageIsEmpty(page, config))
      .forEach((page) => {
        page.remove()
        changed = true
      })

    refreshMetadata(doc, config)

    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    )

    if (!changed) break
  }

  refreshMetadata(doc, config)
  assertIntegrity(doc, config)
}
