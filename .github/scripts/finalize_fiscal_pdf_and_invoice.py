from pathlib import Path


def patch_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Marker not found in {path}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')


path = 'src/utils/invoicePdf.ts'
patch_once(
    path,
    "  paidAt?: string\n}",
    "  paidAt?: string\n  complianceSnapshot?: {\n    practiceDocument?: boolean\n    countryCode?: string\n    operatingMode?: string\n    fiscalizationMode?: string\n  }\n}",
)
patch_once(
    path,
    "        ${headerHtml(invoice, settings, !first)}",
    "        ${invoice.complianceSnapshot?.practiceDocument\n          ? `<div style=\"margin-bottom:12px;border:1px solid #f59e0b;border-radius:10px;padding:8px 12px;text-align:center;font-size:11px;font-weight:800;color:#92400e;background:#fffbeb\">PROBNI DOKUMENT – NIJE FISKALIZIRAN I NIJE ZA SLUŽBENO IZDAVANJE</div>`\n          : ''}\n        ${headerHtml(invoice, settings, !first)}",
)
print('Practice-document PDF safeguard applied.')
