import fs from 'node:fs'

const block = (lines) => `${lines.join('\n')}\n`

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source
  const index = source.indexOf(search)
  if (index < 0) {
    throw new Error(`Output patch nije pronašao očekivani blok: ${label}`)
  }
  return source.slice(0, index) + replacement + source.slice(index + search.length)
}

function patchDetails(source) {
  source = replaceOnce(
    source,
    block([
      "import {",
      "  downloadWorkOrderPdf,",
      "} from '../utils/workOrderPdf'",
    ]),
    block([
      "import {",
      "  downloadWorkOrderPdf,",
      "} from '../utils/workOrderPdf'",
      "import {",
      "  calculateWorkOrderPricing,",
      "  materialLineTotal,",
      "} from '../utils/workOrderPricing'",
    ]),
    'details/import pricing',
  )

  source = replaceOnce(
    source,
    block([
      '  const vatValue =',
      '    order.totalPrice -',
      '    order.materialPrice -',
      '    order.labourPrice',
    ]),
    block([
      '  const pricing =',
      '    calculateWorkOrderPricing({',
      '      materials: order.materials,',
      '      labourPrice: order.labourPrice,',
      '      discountRate: order.discountRate ?? 0,',
      '      vatRate: order.vatRate,',
      '    })',
    ]),
    'details/pricing',
  )

  source = replaceOnce(
    source,
    block([
      "                              {material.quantity}{' '}",
      '                              {material.unit}',
      '                              {canViewPrices',
      '                                ? ` × ${money(',
      '                                    material.unitPrice,',
      '                                  )}`',
      "                                : ''}",
    ]),
    block([
      "                              {material.quantity}{' '}",
      '                              {material.unit}',
      '                              {canViewPrices',
      '                                ? ` × ${money(',
      '                                    material.unitPrice,',
      '                                  )}`',
      "                                : ''}",
      '                              {canViewPrices &&',
      '                              (material.discountRate ?? 0) > 0',
      '                                ? ` · Popust ${material.discountRate}%`',
      "                                : ''}",
    ]),
    'details/material discount label',
  )

  source = replaceOnce(
    source,
    block([
      '                              {money(',
      '                                material.quantity *',
      '                                  material.unitPrice,',
      '                              )}',
    ]),
    block([
      '                              {money(',
      '                                materialLineTotal(material),',
      '                              )}',
    ]),
    'details/material discounted total',
  )

  source = replaceOnce(
    source,
    '                          order.materialPrice,\n',
    '                          pricing.materialPrice,\n',
    'details/material summary',
  )

  source = replaceOnce(
    source,
    block([
      '                <Row',
      '                  label={`PDV ${order.vatRate}%`}',
      '                  value={',
      '                    canViewPrices',
      '                      ? money(vatValue)',
      "                      : 'Skriveno'",
      '                  }',
      '                />',
      '',
      '                <div className="border-t border-slate-700 pt-4">',
    ]),
    block([
      '                {canViewPrices && (',
      '                  <>',
      '                    <Row',
      '                      label="Međuzbroj"',
      '                      value={money(pricing.subtotalBeforeDiscount)}',
      '                    />',
      '',
      '                    {pricing.discountRate > 0 && (',
      '                      <Row',
      '                        label={`Popust na cijeli posao ${pricing.discountRate}%`}',
      '                        value={`-${money(pricing.discountAmount)}`}',
      '                      />',
      '                    )}',
      '',
      '                    <Row',
      '                      label="Osnovica bez PDV-a"',
      '                      value={money(pricing.taxableBase)}',
      '                    />',
      '                  </>',
      '                )}',
      '',
      '                <Row',
      '                  label={`PDV ${order.vatRate}%`}',
      '                  value={',
      '                    canViewPrices',
      '                      ? money(pricing.vatAmount)',
      "                      : 'Skriveno'",
      '                  }',
      '                />',
      '',
      '                <div className="border-t border-slate-700 pt-4">',
    ]),
    'details/financial breakdown',
  )

  source = replaceOnce(
    source,
    '                            order.totalPrice,\n',
    '                            pricing.totalPrice,\n',
    'details/total summary',
  )

  return source
}

function patchPdf(source) {
  source = replaceOnce(
    source,
    block([
      'import {',
      '  getDocumentAppearanceSettings,',
      "} from '../services/documentAppearance.service'",
    ]),
    block([
      'import {',
      '  getDocumentAppearanceSettings,',
      "} from '../services/documentAppearance.service'",
      'import {',
      '  calculateWorkOrderPricing,',
      '  materialLineTotal,',
      "} from './workOrderPricing'",
    ]),
    'pdf/import pricing',
  )

  source = replaceOnce(
    source,
    block([
      'const materialTotal = (item: WorkOrderMaterial) =>',
      '  Number(item.quantity || 0) * Number(item.unitPrice || 0)',
      '',
      'function totals(order: WorkOrder) {',
      '  const materialRows = order.materials.reduce(',
      '    (sum, item) => sum + materialTotal(item),',
      '    0,',
      '  )',
      '',
      '  const material =',
      '    materialRows > 0',
      '      ? materialRows',
      '      : Number(order.materialPrice || 0)',
      '',
      '  const labour = Number(order.labourPrice || 0)',
      '  const base = material + labour',
      '  const vat = base * (Number(order.vatRate || 0) / 100)',
      '',
      '  const total =',
      '    Number(order.totalPrice || 0) > 0',
      '      ? Number(order.totalPrice)',
      '      : base + vat',
      '',
      '  return { material, labour, vat, total }',
      '}',
    ]),
    block([
      'function totals(order: WorkOrder) {',
      '  return calculateWorkOrderPricing({',
      '    materials: order.materials,',
      '    labourPrice: order.labourPrice,',
      '    discountRate: order.discountRate ?? 0,',
      '    vatRate: order.vatRate,',
      '  })',
      '}',
    ]),
    'pdf/central totals',
  )

  source = replaceOnce(
    source,
    block([
      '                <div class="material-data">',
      '                  <small>Jed. cijena</small>',
      '                  ${money(material.unitPrice)}',
      '                </div>',
      '',
      '                <div class="material-data material-total">',
      '                  <small>Ukupno</small>',
      '                  ${money(materialTotal(material))}',
      '                </div>',
    ]),
    block([
      '                <div class="material-data">',
      '                  <small>Jed. cijena</small>',
      '                  ${money(material.unitPrice)}',
      '                </div>',
      '',
      '                <div class="material-data">',
      '                  <small>Popust</small>',
      '                  ${number(material.discountRate ?? 0)}%',
      '                </div>',
      '',
      '                <div class="material-data material-total">',
      '                  <small>Ukupno</small>',
      '                  ${money(materialLineTotal(material))}',
      '                </div>',
    ]),
    'pdf/material discount column',
  )

  source = replaceOnce(
    source,
    block([
      '    value.material !== 0 ||',
      '    value.labour !== 0 ||',
      '    value.vat !== 0 ||',
      '    value.total !== 0 ||',
    ]),
    block([
      '    value.materialPrice !== 0 ||',
      '    value.labourPrice !== 0 ||',
      '    value.vatAmount !== 0 ||',
      '    value.totalPrice !== 0 ||',
    ]),
    'pdf/has prices',
  )

  source = replaceOnce(
    source,
    '          <strong>${money(value.material)}</strong>\n',
    '          <strong>${money(value.materialPrice)}</strong>\n',
    'pdf/material total',
  )

  source = replaceOnce(
    source,
    block([
      '          <strong>${money(value.labour)}</strong>',
      '        </div>',
      '',
      '        <div class="total-row">',
      '          <span>PDV ${number(order.vatRate)}%</span>',
      '          <strong>${money(value.vat)}</strong>',
      '        </div>',
      '',
      '        <div class="total-row grand">',
      '          <span>UKUPNO</span>',
      '          <span>${money(value.total)}</span>',
    ]),
    block([
      '          <strong>${money(value.labourPrice)}</strong>',
      '        </div>',
      '',
      '        <div class="total-row">',
      '          <span>Međuzbroj</span>',
      '          <strong>${money(value.subtotalBeforeDiscount)}</strong>',
      '        </div>',
      '',
      '        ${',
      '          value.discountRate > 0',
      '            ? `',
      '              <div class="total-row">',
      '                <span>Popust ${number(value.discountRate)}%</span>',
      '                <strong>-${money(value.discountAmount)}</strong>',
      '              </div>',
      '            `',
      "            : ''",
      '        }',
      '',
      '        <div class="total-row">',
      '          <span>Osnovica bez PDV-a</span>',
      '          <strong>${money(value.taxableBase)}</strong>',
      '        </div>',
      '',
      '        <div class="total-row">',
      '          <span>PDV ${number(order.vatRate)}%</span>',
      '          <strong>${money(value.vatAmount)}</strong>',
      '        </div>',
      '',
      '        <div class="total-row grand">',
      '          <span>UKUPNO S PDV-OM</span>',
      '          <span>${money(value.totalPrice)}</span>',
    ]),
    'pdf/totals breakdown',
  )

  source = replaceOnce(
    source,
    '        28px minmax(0,1fr) 75px 92px 98px;\n',
    '        28px minmax(0,1fr) 68px 82px 58px 88px;\n',
    'pdf/material grid css',
  )

  return source
}

for (const [file, patch] of [
  ['src/pages/WorkOrderDetailsPage.tsx', patchDetails],
  ['src/utils/workOrderPdf.ts', patchPdf],
]) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const patched = patch(source)
  fs.writeFileSync(file, patched)
  console.log(`patched ${file}`)
}
