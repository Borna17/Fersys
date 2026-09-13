from pathlib import Path
import subprocess

# Legacy work-order repair helper retained as a watched trigger for the
# registered document-validation workflow. The workflow now applies the shared
# offer/invoice/work-order adaptive pagination patch before building.
path = Path('src/utils/workOrderPdf.ts')

# Recover the complete known-good PDF generator after the interrupted edit.
text = subprocess.check_output([
    'git', 'show',
    'd005fd7dd3029a2d0d693f6181cb895f55570eba^:src/utils/workOrderPdf.ts',
], text=True)

old = '''function insertionAnchor(page: HTMLElement) {
  return (
    page.querySelector('[data-pdf-block="photos"]') ||
    page.querySelector('[data-pdf-block="totals"]') ||
    page.querySelector('[data-pdf-block="signature"]') ||
    page.querySelector('.footer')
  ) as HTMLElement | null
}'''
new = '''function insertionAnchor(
  page: HTMLElement,
  selector = '[data-pdf-block="materials"]',
) {
  // Preserve the logical document order while rendered blocks move between
  // A4 pages: materials -> photos -> totals -> signature -> footer.
  if (selector === '[data-pdf-block="photos"]') {
    return (
      page.querySelector('[data-pdf-block="totals"]') ||
      page.querySelector('[data-pdf-block="signature"]') ||
      page.querySelector('.footer')
    ) as HTMLElement | null
  }

  if (selector === '[data-pdf-block="totals"]') {
    return (
      page.querySelector('[data-pdf-block="signature"]') ||
      page.querySelector('.footer')
    ) as HTMLElement | null
  }

  if (selector === '[data-pdf-block="signature"]') {
    return page.querySelector('.footer') as HTMLElement | null
  }

  return (
    page.querySelector('[data-pdf-block="photos"]') ||
    page.querySelector('[data-pdf-block="totals"]') ||
    page.querySelector('[data-pdf-block="signature"]') ||
    page.querySelector('.footer')
  ) as HTMLElement | null
}'''
if old not in text:
    raise SystemExit('Expected insertionAnchor was not found')
text = text.replace(old, new, 1)
text = text.replace(
    'const before = insertionAnchor(next)\n  inner.insertBefore(block, before)',
    'const before = insertionAnchor(next, selector)\n  inner.insertBefore(block, before)',
    1,
)
text = text.replace(
    'const before = insertionAnchor(current)\n  inner.insertBefore(block, before)',
    'const before = insertionAnchor(current, selector)\n  inner.insertBefore(block, before)',
    1,
)

# The workflow removes this compatibility helper before committing the source.
anchor = 'function insertionAnchor(\n'
helper = '''function materialsContainer(page: HTMLElement) {
  return page.querySelector(
    '[data-pdf-block="materials"] .materials',
  ) as HTMLElement | null
}

'''
if anchor not in text:
    raise SystemExit('Insertion anchor not found after repair')
text = text.replace(anchor, helper + anchor, 1)

path.write_text(text, encoding='utf-8')
print('Work order PDF recovered; adaptive ordering patch applied.')