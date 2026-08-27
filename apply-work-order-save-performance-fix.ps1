$ErrorActionPreference = 'Stop'

function Replace-Required {
  param(
    [string]$Path,
    [string]$Old,
    [string]$New,
    [string]$Label
  )

  $content = Get-Content -LiteralPath $Path -Raw -Encoding UTF8

  if (-not $content.Contains($Old)) {
    throw "Nije pronađen očekivani kod za: $Label ($Path). Prekini i provjeri je li patch već primijenjen ili je datoteka promijenjena."
  }

  $content = $content.Replace($Old, $New)
  Set-Content -LiteralPath $Path -Value $content -Encoding UTF8 -NoNewline
  Write-Host "OK: $Label" -ForegroundColor Green
}

$newPage = 'src/pages/NewWorkOrderPage.tsx'
$editPage = 'src/pages/EditWorkOrderPage.tsx'
$photosService = 'src/services/customerPhotos.service.ts'

$newOld = @'
      if (images.length > 0) {
        try {
          await syncWorkOrderImagesToCustomerGallery({
            workOrderId:
              createdOrder.id,
            orderNumber:
              createdOrder.orderNumber,
            customerId,
            workDate: date,
            title:
              title.trim(),
            images,
          })
        } catch (galleryError) {
          console.error(
            'Fotografije radnog naloga nisu spremljene u galeriju investitora:',
            galleryError,
          )

          alert(
            'Radni nalog je spremljen, ali fotografije se nisu uspjele spremiti u galeriju investitora. Otvori nalog, Uredi i ponovno spremi.',
          )
        }
      }
'@

$newNew = @'
      if (images.length > 0) {
        /*
         * Spremanje radnog naloga više NE čeka upload galerije.
         * Nalog je već sigurno spremljen u bazu; fotografije se zatim
         * sinkroniziraju u pozadini. WorkOrderPhotoGallerySync služi kao
         * dodatni retry mehanizam ako ova pozadinska sinkronizacija ne uspije.
         */
        void syncWorkOrderImagesToCustomerGallery({
          workOrderId:
            createdOrder.id,
          orderNumber:
            createdOrder.orderNumber,
          customerId,
          workDate: date,
          title:
            title.trim(),
          images,
        }).catch((galleryError) => {
          console.warn(
            '[FERSYS] Pozadinska sinkronizacija fotografija novog radnog naloga nije uspjela; realtime sinkronizacija će pokušati ponovno:',
            galleryError,
          )
        })
      }
'@

Replace-Required -Path $newPage -Old $newOld -New $newNew -Label 'Novi radni nalog: galerija više ne blokira spremanje'

$editOld = @'
      if (images.length > 0) {
        try {
          await syncWorkOrderImagesToCustomerGallery({
            workOrderId:
              saved.id,
            orderNumber:
              saved.orderNumber,
            customerId,
            workDate: date,
            title:
              title.trim(),
            images,
          })
        } catch (galleryError) {
          console.error(
            'Fotografije radnog naloga nisu spremljene u galeriju investitora:',
            galleryError,
          )

          alert(
            'Izmjene su spremljene, ali fotografije se nisu uspjele spremiti u galeriju investitora.',
          )
        }
      }
'@

$editNew = @'
      if (images.length > 0) {
        /*
         * Uređivanje naloga ne smije čekati upload fotografija u galeriju.
         * Sam nalog je već spremljen; galerija se sinkronizira u pozadini.
         */
        void syncWorkOrderImagesToCustomerGallery({
          workOrderId:
            saved.id,
          orderNumber:
            saved.orderNumber,
          customerId,
          workDate: date,
          title:
            title.trim(),
          images,
        }).catch((galleryError) => {
          console.warn(
            '[FERSYS] Pozadinska sinkronizacija fotografija uređenog radnog naloga nije uspjela; realtime sinkronizacija će pokušati ponovno:',
            galleryError,
          )
        })
      }
'@

Replace-Required -Path $editPage -Old $editOld -New $editNew -Label 'Uredi radni nalog: galerija više ne blokira spremanje'

$concurrencyOld = @'
  await runWithConcurrency(
    missing,
    1,
    async (image) => {
'@

$concurrencyNew = @'
  /*
   * Tri paralelna uploada daju puno bolje vrijeme na većim terenskim
   * nalozima, a i dalje su dovoljno umjereni za mobilnu vezu.
   */
  await runWithConcurrency(
    missing,
    3,
    async (image) => {
'@

Replace-Required -Path $photosService -Old $concurrencyOld -New $concurrencyNew -Label 'Galerija: upload 3 fotografije paralelno'

Write-Host ''
Write-Host 'Performance patch za radne naloge je uspješno primijenjen.' -ForegroundColor Cyan
Write-Host 'Sljedeće pokreni: npm run build' -ForegroundColor Cyan
