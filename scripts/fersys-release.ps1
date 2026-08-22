$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host " FERSYS FINAL PRODUCTION CHECK" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] TypeScript + Vite production build..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "BUILD NIJE PROSAO. Release je zaustavljen." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[2/3] FERSYS release QA..." -ForegroundColor Yellow
node scripts/fersys-release-check.mjs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "QA NIJE PROSAO. Release je zaustavljen." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[3/3] Git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
Write-Host "=====================================" -ForegroundColor Green
Write-Host " FERSYS JE SPREMAN ZA GIT/DEPLOY" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green
Write-Host ""
Write-Host "Sljedeci koraci:" -ForegroundColor White
Write-Host "git add ." -ForegroundColor Gray
Write-Host 'git commit -m "release: production hardening and workflow upgrades"' -ForegroundColor Gray
Write-Host "git push" -ForegroundColor Gray
Write-Host ""
