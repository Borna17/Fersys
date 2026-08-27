$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
$newPath = Join-Path $root "src\pages\NewWorkOrderPage.tsx"
$editPath = Join-Path $root "src\pages\EditWorkOrderPage.tsx"

function Replace-Required {
  param(
    [string]$Content,
    [string]$Old,
    [string]$New,
    [string]$Label
  )

  if (-not $Content.Contains($Old)) {
    throw "Nisam pronašao očekivani dio koda: $Label"
  }

  return $Content.Replace($Old, $New)
}

# ---------------------------------------------------------------------
# NOVI RADNI NALOG
# ---------------------------------------------------------------------
$new = Get-Content $newPath -Raw -Encoding UTF8

$oldAddNew = @'
  function addMaterial() {
    setMaterials(
      (current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          name: '',
          quantity: 1,
          unit: 'kom',
          unitPrice: 0,
          discountRate: 0,
        },
      ],
    )
  }
'@

$newAddNew = @'
  function addMaterial(
    afterMaterialId?: string,
  ) {
    const materialId =
      crypto.randomUUID()

    const newMaterial: WorkOrderMaterial = {
      id: materialId,
      name: '',
      quantity: 0,
      unit: 'kom',
      unitPrice: 0,
      discountRate: 0,
    }

    setMaterials((current) => {
      if (!afterMaterialId) {
        return [
          ...current,
          newMaterial,
        ]
      }

      const index =
        current.findIndex(
          (material) =>
            material.id ===
            afterMaterialId,
        )

      if (index < 0) {
        return [
          ...current,
          newMaterial,
        ]
      }

      return [
        ...current.slice(
          0,
          index + 1,
        ),
        newMaterial,
        ...current.slice(
          index + 1,
        ),
      ]
    })

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const row =
          document.getElementById(
            `work-order-material-${materialId}`,
          )

        row?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        row
          ?.querySelector<HTMLInputElement>(
            '[data-material-name="true"]',
          )
          ?.focus()
      })
    })
  }
'@

$new = Replace-Required $new $oldAddNew $newAddNew "NewWorkOrderPage addMaterial"

$new = Replace-Required $new @'
              onClick={addMaterial}
'@ @'
              onClick={() =>
                addMaterial()
              }
'@ "NewWorkOrderPage gornji Dodaj"

$new = Replace-Required $new @'
                <div
                  key={material.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                >
'@ @'
                <div
                  key={material.id}
                  id={`work-order-material-${material.id}`}
                  className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
                >
'@ "NewWorkOrderPage material id"

$new = Replace-Required $new @'
                    <input
                      value={material.name}
'@ @'
                    <input
                      data-material-name="true"
                      value={material.name}
'@ "NewWorkOrderPage naziv materijala"

$new = Replace-Required $new @'
                        value={
                          material.quantity
                        }
                        onChange={(event) =>
                          updateMaterial(
                            material.id,
                            'quantity',
                            Number(
                              event.target.value,
                            ),
                          )
                        }
                        className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none"
'@ @'
                        value={
                          material.quantity === 0
                            ? ''
                            : material.quantity
                        }
                        placeholder="Količina"
                        onChange={(event) =>
                          updateMaterial(
                            material.id,
                            'quantity',
                            event.target.value === ''
                              ? 0
                              : Number(
                                  event.target.value,
                                ),
                          )
                        }
                        className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600"
'@ "NewWorkOrderPage prazna količina"

$newInsertAnchor = @'
                  </div>
                </div>
              ),
            )}

            {materials.length === 0 && (
'@

$newInsertReplacement = @'
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      addMaterial(
                        material.id,
                      )
                    }
                    className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/[0.06] px-3 text-xs font-black text-blue-300 transition hover:bg-blue-500/10 active:scale-[0.99]"
                  >
                    <Plus size={15} />
                    Dodaj materijal ispod
                  </button>
                </div>
              ),
            )}

            {materials.length === 0 && (
'@

$new = Replace-Required $new $newInsertAnchor $newInsertReplacement "NewWorkOrderPage dodaj materijal ispod"

Set-Content -Path $newPath -Value $new -Encoding UTF8

# ---------------------------------------------------------------------
# UREĐIVANJE RADNOG NALOGA
# ---------------------------------------------------------------------
$edit = Get-Content $editPath -Raw -Encoding UTF8

$oldAddEdit = @'
  function addMaterial() {
    setMaterials((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: '',
        quantity: 1,
        unit: 'kom',
        unitPrice: 0,
        discountRate: 0,
      },
    ])
  }
'@

$newAddEdit = @'
  function addMaterial(
    afterMaterialId?: string,
  ) {
    const materialId =
      crypto.randomUUID()

    const newMaterial: WorkOrderMaterial = {
      id: materialId,
      name: '',
      quantity: 0,
      unit: 'kom',
      unitPrice: 0,
      discountRate: 0,
    }

    setMaterials((current) => {
      if (!afterMaterialId) {
        return [
          ...current,
          newMaterial,
        ]
      }

      const index =
        current.findIndex(
          (material) =>
            material.id ===
            afterMaterialId,
        )

      if (index < 0) {
        return [
          ...current,
          newMaterial,
        ]
      }

      return [
        ...current.slice(
          0,
          index + 1,
        ),
        newMaterial,
        ...current.slice(
          index + 1,
        ),
      ]
    })

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const row =
          document.getElementById(
            `work-order-material-${materialId}`,
          )

        row?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        })

        row
          ?.querySelector<HTMLInputElement>(
            '[data-material-name="true"]',
          )
          ?.focus()
      })
    })
  }
'@

$edit = Replace-Required $edit $oldAddEdit $newAddEdit "EditWorkOrderPage addMaterial"

$edit = Replace-Required $edit @'
              onClick={addMaterial}
'@ @'
              onClick={() =>
                addMaterial()
              }
'@ "EditWorkOrderPage gornji Dodaj"

$edit = Replace-Required $edit @'
              <div
                key={material.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
              >
'@ @'
              <div
                key={material.id}
                id={`work-order-material-${material.id}`}
                className="scroll-mt-28 rounded-2xl border border-slate-800 bg-slate-950/45 p-3"
              >
'@ "EditWorkOrderPage material id"

$edit = Replace-Required $edit @'
                  <input
                    value={material.name}
'@ @'
                  <input
                    data-material-name="true"
                    value={material.name}
'@ "EditWorkOrderPage naziv materijala"

$edit = Replace-Required $edit @'
                      value={material.quantity}
                      onChange={(event) =>
                        updateMaterial(
                          material.id,
                          'quantity',
                          Number(event.target.value),
                        )
                      }
                      className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none"
'@ @'
                      value={material.quantity === 0 ? '' : material.quantity}
                      placeholder="Količina"
                      onChange={(event) =>
                        updateMaterial(
                          material.id,
                          'quantity',
                          event.target.value === ''
                            ? 0
                            : Number(event.target.value),
                        )
                      }
                      className="h-10 w-full rounded-xl bg-slate-800 px-2 text-sm text-white outline-none placeholder:text-slate-600"
'@ "EditWorkOrderPage prazna količina"

$editInsertAnchor = @'
                </div>
              </div>
            ))}

            {materials.length === 0 && (
'@

$editInsertReplacement = @'
                </div>

                <button
                  type="button"
                  onClick={() =>
                    addMaterial(
                      material.id,
                    )
                  }
                  className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-blue-500/30 bg-blue-500/[0.06] px-3 text-xs font-black text-blue-300 transition hover:bg-blue-500/10 active:scale-[0.99]"
                >
                  <Plus size={15} />
                  Dodaj materijal ispod
                </button>
              </div>
            ))}

            {materials.length === 0 && (
'@

$edit = Replace-Required $edit $editInsertAnchor $editInsertReplacement "EditWorkOrderPage dodaj materijal ispod"

Set-Content -Path $editPath -Value $edit -Encoding UTF8

Write-Host ""
Write-Host "FERSYS UX ZA MATERIJAL RADNOG NALOGA JE POPRAVLJEN." -ForegroundColor Green
Write-Host ""
Write-Host "Promjene:"
Write-Host "- količina novog materijala je prazna umjesto 0/1"
Write-Host "- klik Dodaj automatski vodi na novu stavku i fokusira naziv"
Write-Host "- ispod svake stavke postoji Dodaj materijal ispod"
Write-Host "- isto vrijedi za novi i postojeći radni nalog"
Write-Host ""
Write-Host "Sada pokreni: npm run build"
