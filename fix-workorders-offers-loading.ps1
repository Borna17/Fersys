$ErrorActionPreference = "Stop"

$router = Join-Path $PSScriptRoot "..\src\router\AppRouter.tsx"
$router = [System.IO.Path]::GetFullPath($router)

if (-not (Test-Path $router)) {
    throw "Nisam pronasao src\router\AppRouter.tsx. Raspakiraj ovaj FIX u glavni FERSYS-WINDOWS folder."
}

$content = Get-Content $router -Raw -Encoding UTF8

if ($content -notmatch "import \{ OffersPage \} from '\.\./pages/OffersPage'") {
    $anchor = "import AppLayout from '../layouts/AppLayout'"
    $replacement = @"
import AppLayout from '../layouts/AppLayout'
import { OffersPage } from '../pages/OffersPage'
import { WorkOrdersPage } from '../pages/WorkOrdersPage'
"@
    $content = $content.Replace($anchor, $replacement.TrimEnd())
}

$offersPattern = [regex]::Escape("const OffersPage = lazy(") + "(?s).*?" + [regex]::Escape("`n)`n`nconst PricingPage")
if ([regex]::IsMatch($content, $offersPattern)) {
    $content = [regex]::Replace(
        $content,
        $offersPattern,
        "const PricingPage",
        1
    )
}

$workPattern = [regex]::Escape("const WorkOrdersPage = lazy(") + "(?s).*?" + [regex]::Escape("`n)`n`ntype RouteWrapperProps")
if ([regex]::IsMatch($content, $workPattern)) {
    $content = [regex]::Replace(
        $content,
        $workPattern,
        "type RouteWrapperProps",
        1
    )
}

Set-Content -Path $router -Value $content -Encoding UTF8

Write-Host ""
Write-Host "FERSYS FIX GOTOV" -ForegroundColor Green
Write-Host "OffersPage i WorkOrdersPage vise nisu lazy rute."
Write-Host "Sada pokreni: npm run build"
