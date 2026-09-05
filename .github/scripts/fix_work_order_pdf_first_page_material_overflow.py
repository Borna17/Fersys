from pathlib import Path

path = Path('src/utils/workOrderPdf.ts')
text = path.read_text(encoding='utf-8')

old = """  const compact = appearance.density === 'compact'\n  const firstMaterialLimit = compact ? 8 : 6\n  const continuationBudget = compact ? 820 : 810\n  const sectionHeadingHeight = compact ? 27 : 31\n  const materialRowHeight = compact ? 38 : 43\n  const photoGap = compact ? 10 : 12\n  const captionHeight = 21\n\n  const pages: PdfPage[] = []\n  const descriptionLength = order.description.trim().length\n"""

new = """  const compact = appearance.density === 'compact'\n  const descriptionLength = order.description.trim().length\n  const descriptionVisualLines = order.description\n    .split(/\\r?\\n/)\n    .reduce(\n      (total, line) =>\n        total +\n        Math.max(\n          1,\n          Math.ceil(\n            line.trim().length / (compact ? 78 : 72),\n          ),\n        ),\n      0,\n    )\n\n  /*\n   * Prva stranica nema fiksno raspoloživ prostor za materijal: opis radova\n   * može imati nekoliko redaka ili cijeli zapis intervencije. Stari fiksni\n   * limit 6/8 stavki znao je nacrtati redove ispod A4 ruba; .pdf-page ima\n   * overflow:hidden pa su stavke između stranica doslovno nestale.\n   *\n   * Materijal zato kreće konzervativnije ovisno o stvarnoj količini teksta.\n   * Bolje je ranije otvoriti nastavnu stranicu nego ikad odrezati stavku.\n   * Nastavne stranice i dalje koriste puni raspoloživi A4 prostor.\n   */\n  const firstMaterialLimit =\n    descriptionVisualLines >= 22 || descriptionLength >= 1000\n      ? 0\n      : descriptionVisualLines >= 16 || descriptionLength >= 760\n        ? 1\n        : descriptionVisualLines >= 12 || descriptionLength >= 560\n          ? 2\n          : descriptionVisualLines >= 8 || descriptionLength >= 360\n            ? 3\n            : compact\n              ? 7\n              : 5\n\n  const continuationBudget = compact ? 820 : 810\n  const sectionHeadingHeight = compact ? 27 : 31\n  const materialRowHeight = compact ? 38 : 43\n  const photoGap = compact ? 10 : 12\n  const captionHeight = 21\n\n  const pages: PdfPage[] = []\n"""

if old not in text:
    raise SystemExit('Expected paginate header block not found; source may have changed.')

text = text.replace(old, new, 1)

# Add a defensive visual rule so a single material row never fragments internally.
old_css = """    .material-row {\n      display: grid;\n      grid-template-columns:\n        28px minmax(0,1fr) 68px 82px 58px 88px;\n      min-height: ${compact ? 38 : 43}px;\n      align-items: center;\n"""
new_css = """    .material-row {\n      display: grid;\n      grid-template-columns:\n        28px minmax(0,1fr) 68px 82px 58px 88px;\n      min-height: ${compact ? 38 : 43}px;\n      align-items: center;\n      page-break-inside: avoid;\n      break-inside: avoid;\n"""

if old_css not in text:
    raise SystemExit('Expected material-row CSS block not found; source may have changed.')

text = text.replace(old_css, new_css, 1)
path.write_text(text, encoding='utf-8')
print('OK: work-order PDF first-page material pagination is now description-aware and clipping-safe.')
