$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FERSYS repository cleanup" -ForegroundColor Cyan
Write-Host "Ova skripta uklanja samo stare backup/generirane datoteke iz Git repozitorija." -ForegroundColor Gray
Write-Host ""

# .env ostaje na računalu, ali se prestaje pratiti kroz Git.
git rm --cached --ignore-unmatch .env | Out-Null

# Svi .fersys-* direktoriji su povijesni backupovi.
$backupPaths = git ls-files | Where-Object {
    $_ -like ".fersys-*"
}

foreach ($path in $backupPaths) {
    git rm -r --ignore-unmatch -- $path | Out-Null
}

# Supabase CLI privremeni lokalni podaci.
$tempPaths = git ls-files "supabase/.temp/*"
foreach ($path in $tempPaths) {
    git rm --ignore-unmatch -- $path | Out-Null
}

# Jednokratne patch/fix skripte koje su već odradile svoju svrhu.
$oneOffScripts = git ls-files | Where-Object {
    $_ -match "^(apply-|fix-).+\.mjs$"
}

foreach ($path in $oneOffScripts) {
    git rm --ignore-unmatch -- $path | Out-Null
}

# Duplikati izvornog koda koji postoje na ispravnom mjestu unutar src/.
$rootDuplicates = @(
    "ModuleSetupModal.tsx",
    "ModulesSettingsTab.tsx",
    "companyModules.service.ts"
)

foreach ($path in $rootDuplicates) {
    git rm --ignore-unmatch -- $path | Out-Null
}

# Stari arhivi, izvještaji i velike kopije logotipa koje aplikacija ne koristi.
$generatedFiles = @(
    "FERSYS_LOGO_PNG.zip",
    "FERSYS_MODULES_FINAL.zip",
    "FERSYS_WINDOWS_FIX.zip",
    "FERSYS_MOBILE_AUDIT_REPORT.txt",
    "FERSYS_MOBILE_AUDIT_REVIEWED.txt",
    "FIXED_README.txt",
    "POPRAVCI.txt",
    "build-errors.txt",
    "Fersys Logo.png",
    "Fersys logo bijeli.png",
    "Fersys Logo u BOJI.png",
    "fersys-icon.svg",
    "fersys-logo-dark.svg",
    "fersys-logo-light.svg",
    "fersys-webflow-dark-512.png",
    "fersys-webflow-light-512.png",
    "fersys-webflow-webclip-256.png"
)

foreach ($path in $generatedFiles) {
    git rm --ignore-unmatch -- $path | Out-Null
}

# Stara PNG mapa logotipa iz root direktorija.
git rm -r --ignore-unmatch -- FERSYS_LOGO_PNG | Out-Null

# Potvrđeni development/dead-code fajlovi.
# AppRouter koji dobivaš uz ovu optimizaciju više nema /supabase-test rutu.
git rm --ignore-unmatch -- src/pages/SupabaseTestPage.tsx | Out-Null
git rm --ignore-unmatch -- src/App.css | Out-Null

Write-Host "Cleanup je pripremljen u Git working tree-u." -ForegroundColor Green
Write-Host ""
Write-Host "SADA NEMOJ odmah pushati." -ForegroundColor Yellow
Write-Host "Prvo pokreni:" -ForegroundColor Yellow
Write-Host "  npm run build"
Write-Host "  git status"
Write-Host ""
Write-Host "Ako build prođe, onda commit/push." -ForegroundColor Green
