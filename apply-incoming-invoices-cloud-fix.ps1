$ErrorActionPreference = "Stop"

$root = $PSScriptRoot
if ((Split-Path $root -Leaf) -eq "scripts") {
  $project = Split-Path $root -Parent
} else {
  $project = $root
}

$listPath = Join-Path $project "src\pages\IncomingInvoicesPage.tsx"
$newPath = Join-Path $project "src\pages\NewIncomingInvoicePage.tsx"

if (-not (Test-Path $listPath)) {
  throw "Nedostaje src\pages\IncomingInvoicesPage.tsx"
}
if (-not (Test-Path $newPath)) {
  throw "Nedostaje src\pages\NewIncomingInvoicePage.tsx"
}

$list = Get-Content $listPath -Raw -Encoding UTF8
$new = Get-Content $newPath -Raw -Encoding UTF8

# LIST PAGE ------------------------------------------------------------

$list = $list.Replace(
  "import { useMemo, useState } from 'react'",
  "import { useEffect, useMemo, useState } from 'react'"
)

$documentImport = @"
import {
  deleteDocument,
  downloadDocument,
} from '../utils/documentStorage'
"@

$documentImportNew = @"
import {
  deleteDocument,
  downloadDocument,
  syncLocalDocumentToCloud,
} from '../utils/documentStorage'
import {
  deleteIncomingInvoiceCloud,
  getIncomingInvoicesCloud,
  migrateLegacyIncomingInvoices,
} from '../services/incomingInvoicesCloud.service'
"@

if ($list.Contains($documentImport)) {
  $list = $list.Replace($documentImport, $documentImportNew)
}

$navAnchor = @"
  const navigate =
    useNavigate()
"@

$loadEffect = @"
  const navigate =
    useNavigate()

  useEffect(() => {
    let cancelled = false

    async function loadCloudInvoices() {
      try {
        const legacy = readInvoices()

        for (const invoice of legacy) {
          for (const document of invoice.documents) {
            await syncLocalDocumentToCloud(
              document.id,
            )
          }
        }

        await migrateLegacyIncomingInvoices(
          legacy,
        )

        const cloud =
          await getIncomingInvoicesCloud()

        if (cancelled) {
          return
        }

        setInvoices(cloud)

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(cloud),
        )
      } catch (error) {
        console.error(
          'Ulazni računi nisu sinkronizirani s cloudom:',
          error,
        )
      }
    }

    void loadCloudInvoices()

    function refreshOnFocus() {
      if (
        document.visibilityState ===
        'visible'
      ) {
        void loadCloudInvoices()
      }
    }

    document.addEventListener(
      'visibilitychange',
      refreshOnFocus,
    )

    return () => {
      cancelled = true

      document.removeEventListener(
        'visibilitychange',
        refreshOnFocus,
      )
    }
  }, [])
"@

if ($list.Contains($navAnchor) -and -not $list.Contains("loadCloudInvoices")) {
  $list = $list.Replace($navAnchor, $loadEffect)
}

$deleteAnchor = @"
    save(
      invoices.filter(
        (item) =>
          item.id !==
          invoice.id,
      ),
    )

    setSelectedId(null)
"@

$deleteReplacement = @"
    await deleteIncomingInvoiceCloud(
      invoice.id,
    )

    save(
      invoices.filter(
        (item) =>
          item.id !==
          invoice.id,
      ),
    )

    setSelectedId(null)
"@

if ($list.Contains($deleteAnchor)) {
  $list = $list.Replace($deleteAnchor, $deleteReplacement)
}

# NEW/EDIT PAGE --------------------------------------------------------

$docNewImport = @"
import {
  deleteDocument,
  downloadDocument,
  saveDocument,
} from '../utils/documentStorage'
"@

$docNewImportReplacement = @"
import {
  deleteDocument,
  downloadDocument,
  saveDocument,
} from '../utils/documentStorage'
import {
  upsertIncomingInvoiceCloud,
} from '../services/incomingInvoicesCloud.service'
"@

if ($new.Contains($docNewImport)) {
  $new = $new.Replace(
    $docNewImport,
    $docNewImportReplacement
  )
}

$new = $new.Replace(
  "  function saveInvoice() {",
  "  async function saveInvoice() {"
)

$saveAnchor = @"
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated),
    )

    navigate('/incoming-invoices')
"@

$saveReplacement = @"
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(updated),
    )

    try {
      await upsertIncomingInvoiceCloud(
        saved,
      )
    } catch (error) {
      console.error(
        'Ulazni račun nije spremljen u cloud:',
        error,
      )

      window.alert(
        error instanceof Error
          ? `Račun je ostao lokalno, ali cloud spremanje nije uspjelo: ${error.message}`
          : 'Račun je ostao lokalno, ali cloud spremanje nije uspjelo.',
      )

      return
    }

    navigate('/incoming-invoices')
"@

if ($new.Contains($saveAnchor)) {
  $new = $new.Replace(
    $saveAnchor,
    $saveReplacement
  )
}

Set-Content -Path $listPath -Value $list -Encoding UTF8
Set-Content -Path $newPath -Value $new -Encoding UTF8

Write-Host ""
Write-Host "FERSYS CLOUD FIX ZA ULAZNE RACUNE JE PRIMIJENJEN." -ForegroundColor Green
Write-Host ""
Write-Host "Sada pokreni:"
Write-Host "npm run build"
Write-Host "npm run mobile:build"
