$ErrorActionPreference = 'Stop'

$path = Join-Path $PSScriptRoot 'src\utils\workOrderPdf.ts'

if (-not (Test-Path $path)) {
  throw "Nije pronađen stvarni PDF generator: $path"
}

$content = Get-Content -Raw -Encoding UTF8 $path
$old = "const nextMaterialLimit = compact ? 13 : 10"
$new = "const nextMaterialLimit = 15"

if ($content.Contains($new)) {
  Write-Host "PDF generator već koristi maksimalno 15 materijala po nastavnoj stranici." -ForegroundColor Green
  exit 0
}

if (-not $content.Contains($old)) {
  throw "Nije pronađen očekivani stari limit (compact ? 13 : 10). Datoteka nije mijenjana."
}

$updated = $content.Replace($old, $new)
Set-Content -Path $path -Value $updated -Encoding UTF8 -NoNewline

$verify = Get-Content -Raw -Encoding UTF8 $path

if (-not $verify.Contains($new)) {
  throw "Promjena nije potvrđena nakon zapisivanja datoteke."
}

if ($verify.Contains($old)) {
  throw "Stari limit 10 je i dalje ostao u PDF generatoru."
}

Write-Host "POTVRĐENO: workOrderPdf.ts sada koristi maksimalno 15 materijala po nastavnoj A4 stranici." -ForegroundColor Green
Write-Host "Prva stranica i dalje koristi svoj sigurni limit zbog podataka naloga i opisa radova." -ForegroundColor Cyan
