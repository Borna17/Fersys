import fs from 'node:fs'

function replaceOnce(source, search, replacement, label) {
  if (source.includes(replacement)) return source
  const index = source.indexOf(search)
  if (index < 0) {
    throw new Error(`Patch nije pronašao očekivani blok: ${label}`)
  }
  return source.slice(0, index) + replacement + source.slice(index + search.length)
}

function patchNewWorkOrderPage(source) {
  source = replaceOnce(
    source,
    "import { fileToCompressedDataUrl } from '../utils/imageUtils'\n",
    "import { fileToCompressedDataUrl } from '../utils/imageUtils'\nimport { calculateWorkOrderPricing } from '../utils/workOrderPricing'\n",
    'new/import pricing',
  )

  source = replaceOnce(
    source,
    "  const [vatRate, setVatRate] =\n    useState('25')\n",
    "  const [discountRate, setDiscountRate] =\n    useState('0')\n  const [vatRate, setVatRate] =\n    useState('25')\n",
    'new/discount state',
  )

  source = replaceOnce(
    source,
    "        setVatRate(\n          value.vatRate ?? '25',\n        )\n",
    "        setDiscountRate(\n          value.discountRate ?? '0',\n        )\n        setVatRate(\n          value.vatRate ?? '25',\n        )\n",
    'new/restore discount',
  )

  source = replaceOnce(
    source,
    "                  labourPrice,\n                  vatRate,\n                  priceNote,\n",
    "                  labourPrice,\n                  discountRate,\n                  vatRate,\n                  priceNote,\n",
    'new/autosave payload',
  )

  source = replaceOnce(
    source,
    "    labourPrice,\n    vatRate,\n    priceNote,\n",
    "    labourPrice,\n    discountRate,\n    vatRate,\n    priceNote,\n",
    'new/autosave deps',
  )

  source = replaceOnce(
    source,
    "  const materialPrice =\n    useMemo(\n      () =>\n        materials.reduce(\n          (sum, material) =>\n            sum +\n            material.quantity *\n              material.unitPrice,\n          0,\n        ),\n      [materials],\n    )\n\n  const subtotal =\n    materialPrice +\n    (Number(labourPrice) || 0)\n\n  const totalPrice =\n    subtotal +\n    subtotal *\n      ((Number(vatRate) || 0) /\n        100)\n",
    "  const pricing =\n    useMemo(\n      () =>\n        calculateWorkOrderPricing({\n          materials,\n          labourPrice:\n            Number(labourPrice) || 0,\n          discountRate:\n            Number(discountRate) || 0,\n          vatRate:\n            Number(vatRate) || 0,\n        }),\n      [\n        materials,\n        labourPrice,\n        discountRate,\n        vatRate,\n      ],\n    )\n\n  const materialPrice =\n    pricing.materialPrice\n  const totalPrice =\n    pricing.totalPrice\n",
    'new/pricing calculation',
  )

  source = replaceOnce(
    source,
    "          unitPrice: 0,\n        }),\n",
    "          unitPrice: 0,\n          discountRate: 0,\n        }),\n",
    'new/template material discount',
  )

  source = replaceOnce(
    source,
    "          unitPrice: 0,\n        },\n      ],\n",
    "          unitPrice: 0,\n          discountRate: 0,\n        },\n      ],\n",
    'new/add material discount',
  )

  source = replaceOnce(
    source,
    "                  )\n                : 0,\n          }),\n",
    "                  )\n                : 0,\n            discountRate:\n              canViewPrices\n                ? Math.min(\n                    100,\n                    Math.max(\n                      0,\n                      Number(\n                        material.discountRate,\n                      ) || 0,\n                    ),\n                  )\n                : 0,\n          }),\n",
    'new/clean material discount',
  )

  source = replaceOnce(
    source,
    "    try {\n      setIsSaving(true)\n\n      const createdOrder =\n",
    "    const submitPricing =\n      calculateWorkOrderPricing({\n        materials: cleanMaterials,\n        labourPrice:\n          canViewPrices\n            ? Number(labourPrice) || 0\n            : 0,\n        discountRate:\n          canViewPrices\n            ? Number(discountRate) || 0\n            : 0,\n        vatRate:\n          canViewPrices\n            ? Number(vatRate) || 0\n            : 0,\n      })\n\n    try {\n      setIsSaving(true)\n\n      const createdOrder =\n",
    'new/submit pricing',
  )

  source = replaceOnce(
    source,
    "          materialPrice:\n            canViewPrices\n              ? cleanMaterials.reduce(\n                  (\n                    sum,\n                    material,\n                  ) =>\n                    sum +\n                    material.quantity *\n                      material.unitPrice,\n                  0,\n                )\n              : 0,\n          vatRate:\n",
    "          materialPrice:\n            canViewPrices\n              ? submitPricing.materialPrice\n              : 0,\n          discountRate:\n            canViewPrices\n              ? submitPricing.discountRate\n              : 0,\n          vatRate:\n",
    'new/save discount totals',
  )

  source = replaceOnce(
    source,
    "          totalPrice:\n            canViewPrices\n              ? Math.max(\n                  0,\n                  totalPrice,\n                )\n              : 0,\n",
    "          totalPrice:\n            canViewPrices\n              ? submitPricing.totalPrice\n              : 0,\n",
    'new/save total pricing',
  )

  source = replaceOnce(
    source,
    "                      canViewPrices\n                        ? 'grid-cols-3'\n                        : 'grid-cols-2'\n",
    "                      canViewPrices\n                        ? 'grid-cols-2 sm:grid-cols-4'\n                        : 'grid-cols-2'\n",
    'new/material grid',
  )

  const priceInputEnd = `                    {canViewPrices && (\n                      <MiniInput\n                        label=\"Cijena €\"\n                      >\n                        <input\n                          type=\"number\"\n                          min=\"0\"\n                          step=\"0.01\"\n                          inputMode=\"decimal\"\n                          value={\n                            material.unitPrice === 0\n                              ? ''\n                              : material.unitPrice\n                          }\n                          placeholder=\"0,00\"\n                          onChange={(event) =>\n                            updateMaterial(\n                              material.id,\n                              'unitPrice',\n                              Number(\n                                event.target.value,\n                              ),\n                            )\n                          }\n                          className=\"h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600\"\n                        />\n                      </MiniInput>\n                    )}\n`

  source = replaceOnce(
    source,
    priceInputEnd,
    priceInputEnd + `\n                    {canViewPrices && (\n                      <MiniInput label=\"Popust %\">\n                        <input\n                          type=\"number\"\n                          min=\"0\"\n                          max=\"100\"\n                          step=\"0.01\"\n                          inputMode=\"decimal\"\n                          value={material.discountRate || ''}\n                          placeholder=\"0\"\n                          onChange={(event) =>\n                            updateMaterial(\n                              material.id,\n                              'discountRate',\n                              event.target.value === ''\n                                ? 0\n                                : Math.min(\n                                    100,\n                                    Math.max(0, Number(event.target.value) || 0),\n                                  ),\n                            )\n                          }\n                          className=\"h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600\"\n                        />\n                      </MiniInput>\n                    )}\n`,
    'new/material discount ui',
  )

  source = replaceOnce(
    source,
    "              <Field label=\"PDV %\">\n",
    `              <Field label=\"Popust na cijeli posao %\">\n                <input\n                  type=\"number\"\n                  min=\"0\"\n                  max=\"100\"\n                  step=\"0.01\"\n                  inputMode=\"decimal\"\n                  value={discountRate === '0' ? '' : discountRate}\n                  placeholder=\"0\"\n                  onChange={(event) =>\n                    setDiscountRate(event.target.value)\n                  }\n                  className={inputClass}\n                />\n              </Field>\n\n              <Field label=\"PDV %\">\n`,
    'new/global discount ui',
  )

  source = replaceOnce(
    source,
    "                  Ukupno s PDV-om\n                </p>\n\n                <p className=\"mt-1 text-2xl font-black text-white\">\n                  {totalPrice.toFixed(2)} €\n                </p>\n",
    "                  Ukupno s PDV-om\n                </p>\n\n                <p className=\"mt-1 text-2xl font-black text-white\">\n                  {totalPrice.toFixed(2)} €\n                </p>\n                <p className=\"mt-2 text-xs text-blue-100/80\">\n                  Osnovica {pricing.subtotalBeforeDiscount.toFixed(2)} €\n                  {pricing.discountRate > 0\n                    ? ` · Popust -${pricing.discountAmount.toFixed(2)} €`\n                    : ''}\n                  {` · PDV ${pricing.vatAmount.toFixed(2)} €`}\n                </p>\n",
    'new/pricing summary ui',
  )

  return source
}

function patchEditWorkOrderPage(source) {
  source = replaceOnce(
    source,
    "import { fileToCompressedDataUrl } from '../utils/imageUtils'\n",
    "import { fileToCompressedDataUrl } from '../utils/imageUtils'\nimport { calculateWorkOrderPricing } from '../utils/workOrderPricing'\n",
    'edit/import pricing',
  )

  source = replaceOnce(
    source,
    "  const [vatRate, setVatRate] = useState('25')\n",
    "  const [discountRate, setDiscountRate] = useState('0')\n  const [vatRate, setVatRate] = useState('25')\n",
    'edit/discount state',
  )

  source = replaceOnce(
    source,
    "        setVatRate(String(savedOrder.vatRate))\n",
    "        setDiscountRate(String(savedOrder.discountRate ?? 0))\n        setVatRate(String(savedOrder.vatRate))\n",
    'edit/load discount',
  )

  source = replaceOnce(
    source,
    "        unitPrice: 0,\n      },\n",
    "        unitPrice: 0,\n        discountRate: 0,\n      },\n",
    'edit/add material discount',
  )

  source = replaceOnce(
    source,
    "  const materialPrice = useMemo(\n    () =>\n      materials.reduce(\n        (sum, material) => sum + material.quantity * material.unitPrice,\n        0,\n      ),\n    [materials],\n  )\n\n  const subtotal = materialPrice + (Number(labourPrice) || 0)\n  const totalPrice = subtotal + subtotal * ((Number(vatRate) || 0) / 100)\n",
    "  const pricing = useMemo(\n    () =>\n      calculateWorkOrderPricing({\n        materials,\n        labourPrice: Number(labourPrice) || 0,\n        discountRate: Number(discountRate) || 0,\n        vatRate: Number(vatRate) || 0,\n      }),\n    [materials, labourPrice, discountRate, vatRate],\n  )\n\n  const materialPrice = pricing.materialPrice\n  const totalPrice = pricing.totalPrice\n",
    'edit/pricing calculation',
  )

  source = replaceOnce(
    source,
    "        unitPrice: Math.max(0, Number(material.unitPrice) || 0),\n      }))\n",
    "        unitPrice: Math.max(0, Number(material.unitPrice) || 0),\n        discountRate: Math.min(\n          100,\n          Math.max(0, Number(material.discountRate) || 0),\n        ),\n      }))\n",
    'edit/clean material discount',
  )

  source = replaceOnce(
    source,
    "    try {\n      setIsSaving(true)\n      const saved = await updateWorkOrder(id, {\n",
    "    const submitPricing = calculateWorkOrderPricing({\n      materials: cleanMaterials,\n      labourPrice: canViewPrices ? Number(labourPrice) || 0 : 0,\n      discountRate: canViewPrices ? Number(discountRate) || 0 : 0,\n      vatRate: canViewPrices ? Number(vatRate) || 0 : 0,\n    })\n\n    try {\n      setIsSaving(true)\n      const saved = await updateWorkOrder(id, {\n",
    'edit/submit pricing',
  )

  source = replaceOnce(
    source,
    "              materialPrice: cleanMaterials.reduce(\n                (sum, material) =>\n                  sum + material.quantity * material.unitPrice,\n                0,\n              ),\n              vatRate: Math.max(0, Number(vatRate) || 0),\n              totalPrice: Math.max(0, totalPrice),\n",
    "              materialPrice: submitPricing.materialPrice,\n              discountRate: submitPricing.discountRate,\n              vatRate: submitPricing.vatRate,\n              totalPrice: submitPricing.totalPrice,\n",
    'edit/save pricing',
  )

  source = source.replace(
    "                  <MiniInput label=\"Cijena €\">\n",
    "                  <MiniInput label=\"Cijena €\">\n",
  )

  source = replaceOnce(
    source,
    "              <Field label=\"PDV %\">\n",
    `              <Field label=\"Popust na cijeli posao %\">\n                <input\n                  type=\"number\"\n                  inputMode=\"decimal\"\n                  min=\"0\"\n                  max=\"100\"\n                  step=\"0.01\"\n                  value={discountRate === '0' ? '' : discountRate}\n                  placeholder=\"0\"\n                  onChange={(event) => setDiscountRate(event.target.value)}\n                  className={inputClass}\n                />\n              </Field>\n\n              <Field label=\"PDV %\">\n`,
    'edit/global discount ui',
  )

  source = replaceOnce(
    source,
    "                  {totalPrice.toFixed(2)} €\n                </p>\n              </div>\n",
    "                  {totalPrice.toFixed(2)} €\n                </p>\n                <p className=\"mt-2 text-xs text-blue-100/80\">\n                  Osnovica {pricing.subtotalBeforeDiscount.toFixed(2)} €\n                  {pricing.discountRate > 0\n                    ? ` · Popust -${pricing.discountAmount.toFixed(2)} €`\n                    : ''}\n                  {` · PDV ${pricing.vatAmount.toFixed(2)} €`}\n                </p>\n              </div>\n",
    'edit/pricing summary ui',
  )

  const editPriceInput = `                  {canViewPrices && (\n                    <MiniInput label=\"Cijena €\">\n                      <input\n                        type=\"number\"\n                        inputMode=\"decimal\"\n                        min=\"0\"\n                        step=\"0.01\"\n                        value={material.unitPrice === 0 ? '' : material.unitPrice}\n                        onChange={(event) =>\n                          updateMaterial(\n                            material.id,\n                            'unitPrice',\n                            event.target.value === ''\n                              ? 0\n                              : Number(event.target.value),\n                          )\n                        }\n                        className=\"h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none\"\n                      />\n                    </MiniInput>\n                  )}\n`

  source = replaceOnce(
    source,
    editPriceInput,
    editPriceInput + `\n                  {canViewPrices && (\n                    <MiniInput label=\"Popust %\">\n                      <input\n                        type=\"number\"\n                        inputMode=\"decimal\"\n                        min=\"0\"\n                        max=\"100\"\n                        step=\"0.01\"\n                        value={material.discountRate || ''}\n                        placeholder=\"0\"\n                        onChange={(event) =>\n                          updateMaterial(\n                            material.id,\n                            'discountRate',\n                            event.target.value === ''\n                              ? 0\n                              : Math.min(100, Math.max(0, Number(event.target.value) || 0)),\n                          )\n                        }\n                        className=\"h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none\"\n                      />\n                    </MiniInput>\n                  )}\n`,
    'edit/material discount ui',
  )

  source = source.replace(
    "                    canViewPrices ? 'grid-cols-3' : 'grid-cols-2'\n",
    "                    canViewPrices ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'\n",
  )

  return source
}

const files = [
  ['src/pages/NewWorkOrderPage.tsx', patchNewWorkOrderPage],
  ['src/pages/EditWorkOrderPage.tsx', patchEditWorkOrderPage],
]

for (const [file, patch] of files) {
  const before = fs.readFileSync(file, 'utf8')
  const after = patch(before)
  if (after !== before) {
    fs.writeFileSync(file, after)
    console.log(`patched ${file}`)
  } else {
    console.log(`already patched ${file}`)
  }
}
