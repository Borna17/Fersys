$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot 'src\utils\workOrderPdf.ts'

if (-not (Test-Path $path)) {
  throw "Nije pronađen src\utils\workOrderPdf.ts. Pokreni skriptu iz korijena FERSYS projekta."
}

$content = Get-Content -Raw -Encoding UTF8 $path

$old = @"
  const compact = appearance.density === 'compact'
  const firstMaterialLimit = compact ? 8 : 6
  const nextMaterialLimit = compact ? 13 : 10
"@

$new = @"
  const compact = appearance.density === 'compact'
  const firstMaterialLimit = compact ? 8 : 6

  // Nastavne A4 stranice imaju znatno više slobodnog prostora od prve.
  // Do 15 stavki materijala stane sigurno u postojeći layout, pa ne
  // stvaramo novu stranicu samo zato što je prethodni limit bio 10/13.
  const nextMaterialLimit = 15
"@

if (-not $content.Contains($old)) {
  throw "Očekivani pagination kod nije pronađen. Datoteka je možda već izmijenjena."
}

$content = $content.Replace($old, $new)
Set-Content -Path $path -Value $content -Encoding UTF8 -NoNewline

Write-Host "OK: nastavne stranice radnog naloga sada primaju do 15 stavki materijala." -ForegroundColor Green
Write-Host "Prva stranica ostaje prilagodljiva (6 ili 8 stavki) zbog opisa i podataka naloga." -ForegroundColor Cyan
Write-Host "Pokreni npm run build, a zatim generiraj RN-2026-019 ponovno za provjeru." -ForegroundColor Cyan
