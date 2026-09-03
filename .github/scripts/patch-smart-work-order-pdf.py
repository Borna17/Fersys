from pathlib import Path
import re

path = Path('src/utils/workOrderPdf.ts')
text = path.read_text(encoding='utf-8-sig')

old_type = """type PdfPage = {
  materials: WorkOrderMaterial[]
  photos: WorkOrderImage[]
  first: boolean
  last: boolean
  showTotals: boolean
}"""
new_type = """type PdfPage = {
  materials: WorkOrderMaterial[]
  materialStartIndex: number
  photos: WorkOrderImage[]
  first: boolean
  last: boolean
  showTotals: boolean
}"""
if old_type not in text:
    raise SystemExit('PdfPage type pattern not found')
text = text.replace(old_type, new_type, 1)

old_material_sig = """function materialsHtml(
  materials: WorkOrderMaterial[],
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
) {"""
new_material_sig = """function materialsHtml(
  materials: WorkOrderMaterial[],
  branding: WorkOrderBranding,
  appearance: DocumentAppearance,
  startIndex = 0,
) {"""
if old_material_sig not in text:
    raise SystemExit('materialsHtml signature not found')
text = text.replace(old_material_sig, new_material_sig, 1)

old_number = "${String(index + 1).padStart(2, '0')}"
new_number = "${String(startIndex + index + 1).padStart(2, '0')}"
if old_number not in text:
    raise SystemExit('material numbering pattern not found')
text = text.replace(old_number, new_number, 1)

new_paginate = r'''function paginate(
  order: WorkOrder,
  appearance: DocumentAppearance,
): PdfPage[] {
  const compact = appearance.density === 'compact'
  const firstMaterialLimit = compact ? 8 : 6
  const continuationBudget = compact ? 820 : 810
  const sectionHeadingHeight = compact ? 27 : 31
  const materialRowHeight = compact ? 38 : 43
  const photoGap = compact ? 10 : 12
  const captionHeight = 21

  const pages: PdfPage[] = []
  const descriptionLength = order.description.trim().length

  const firstMaterials = order.materials.slice(0, firstMaterialLimit)
  let materialIndex = firstMaterials.length

  let maxFirstPhotos = 0
  if (
    order.images.length > 0 &&
    materialIndex === order.materials.length
  ) {
    if (firstMaterials.length <= 3 && descriptionLength <= 650) {
      maxFirstPhotos = 2
    } else if (firstMaterials.length <= 4 && descriptionLength <= 420) {
      maxFirstPhotos = 1
    }
  }

  const firstPhotos = order.images.slice(0, maxFirstPhotos)
  let photoIndex = firstPhotos.length

  pages.push({
    materials: firstMaterials,
    materialStartIndex: 0,
    photos: firstPhotos,
    first: true,
    last: false,
    showTotals: false,
  })

  function materialBlockHeight(count: number) {
    return count <= 0
      ? 0
      : sectionHeadingHeight + count * materialRowHeight
  }

  function photoBlockHeight(count: number, finalPage = false) {
    if (count <= 0) return 0

    let imageHeight: number
    if (finalPage) {
      imageHeight = compact ? 195 : 210
    } else if (count === 1) {
      imageHeight = compact ? 395 : 425
    } else if (count === 2) {
      imageHeight = compact ? 300 : 325
    } else {
      imageHeight = compact ? 250 : 270
    }

    const rows = count === 1 ? 1 : Math.ceil(count / 2)
    return (
      sectionHeadingHeight +
      rows * (imageHeight + captionHeight) +
      Math.max(0, rows - 1) * photoGap
    )
  }

  const value = totals(order)
  const hasTotals =
    value.materialPrice !== 0 ||
    value.labourPrice !== 0 ||
    value.vatAmount !== 0 ||
    value.totalPrice !== 0 ||
    Boolean(order.priceNote)

  const finalBlockHeight =
    (appearance.showSignature ? (compact ? 145 : 165) : 0) +
    (hasTotals ? (compact ? 155 : 175) : 0) +
    18

  /*
   * Materijal zadržava logičan redoslijed, ali nakon zadnje stavke
   * nastavna stranica više ne ostaje prazna. Ako ima mjesta, odmah
   * se popunjava s 1-2 sljedeće fotografije.
   */
  while (materialIndex < order.materials.length) {
    const startIndex = materialIndex
    const remainingMaterials = order.materials.length - materialIndex
    const maxRows = Math.max(
      1,
      Math.min(
        15,
        Math.floor(
          (continuationBudget - sectionHeadingHeight) / materialRowHeight,
        ),
      ),
    )

    const materialCount = Math.min(remainingMaterials, maxRows)
    const materials = order.materials.slice(
      materialIndex,
      materialIndex + materialCount,
    )
    materialIndex += materials.length

    let photos: WorkOrderImage[] = []
    if (
      materialIndex === order.materials.length &&
      photoIndex < order.images.length
    ) {
      const freeHeight =
        continuationBudget - materialBlockHeight(materials.length)

      for (
        let candidate = Math.min(2, order.images.length - photoIndex);
        candidate >= 1;
        candidate -= 1
      ) {
        if (photoBlockHeight(candidate) <= freeHeight) {
          photos = order.images.slice(photoIndex, photoIndex + candidate)
          photoIndex += photos.length
          break
        }
      }
    }

    pages.push({
      materials,
      materialStartIndex: startIndex,
      photos,
      first: false,
      last: false,
      showTotals: false,
    })
  }

  /*
   * Foto stranice biraju raspored prema stvarno raspoloživom prostoru.
   * Zadnja foto stranica može nositi i završni blok kad sve stane bez
   * gubitka čitljivosti, umjesto da se otvara gotovo prazna nova A4.
   */
  while (photoIndex < order.images.length) {
    const remainingPhotos = order.images.length - photoIndex
    let finalCount = 0

    for (
      let candidate = Math.min(4, remainingPhotos);
      candidate >= 1;
      candidate -= 1
    ) {
      if (
        candidate === remainingPhotos &&
        photoBlockHeight(candidate, true) + finalBlockHeight <=
          continuationBudget
      ) {
        finalCount = candidate
        break
      }
    }

    if (finalCount > 0) {
      const photos = order.images.slice(photoIndex, photoIndex + finalCount)
      photoIndex += photos.length
      pages.push({
        materials: [],
        materialStartIndex: materialIndex,
        photos,
        first: false,
        last: true,
        showTotals: true,
      })
      break
    }

    const count = Math.min(4, remainingPhotos)
    const photos = order.images.slice(photoIndex, photoIndex + count)
    photoIndex += photos.length
    pages.push({
      materials: [],
      materialStartIndex: materialIndex,
      photos,
      first: false,
      last: false,
      showTotals: false,
    })
  }

  if (photoIndex >= order.images.length) {
    const last = pages[pages.length - 1]
    if (!last.last) {
      const usedHeight =
        materialBlockHeight(last.materials.length) +
        photoBlockHeight(last.photos.length, true)

      const canFinishOnLast =
        !last.first &&
        usedHeight + finalBlockHeight <= continuationBudget

      const canFinishOnFirst =
        last.first &&
        order.images.length === 0 &&
        firstMaterials.length <= 3 &&
        descriptionLength <= 420

      if (canFinishOnLast || canFinishOnFirst) {
        last.showTotals = true
        last.last = true
      } else {
        pages.push({
          materials: [],
          materialStartIndex: materialIndex,
          photos: [],
          first: false,
          last: true,
          showTotals: true,
        })
      }
    }
  }

  pages.forEach((page, index) => {
    page.last = index === pages.length - 1
  })

  return pages
}
'''

pattern = re.compile(r'function paginate\([\s\S]*?\n}\n\nfunction css\(')
match = pattern.search(text)
if not match:
    raise SystemExit('paginate function boundary not found')
text = text[:match.start()] + new_paginate + '\nfunction css(' + text[match.end():]

old_css = """    /* Zadnja stranica s 1-2 slike + cijena/potpis/pečat. */
    .final-pdf-page .photos-1 .photo-card img,
    .final-pdf-page .photos-2 .photo-card img {
      height: ${compact ? 205 : 220}px;
    }"""
new_css = """    /* Završna stranica smanjuje fotografije samo koliko je potrebno
       da cijene/potpis/pečat stanu ispod njih. */
    .final-pdf-page .photos-1 .photo-card img,
    .final-pdf-page .photos-2 .photo-card img,
    .final-pdf-page .photos-3 .photo-card img,
    .final-pdf-page .photos-4 .photo-card img {
      height: ${compact ? 195 : 210}px;
    }"""
if old_css not in text:
    raise SystemExit('final photo CSS pattern not found')
text = text.replace(old_css, new_css, 1)

old_call = """        ${materialsHtml(
          page.materials,
          branding,
          appearance,
        )}"""
new_call = """        ${materialsHtml(
          page.materials,
          branding,
          appearance,
          page.materialStartIndex,
        )}"""
if old_call not in text:
    raise SystemExit('materialsHtml page call not found')
text = text.replace(old_call, new_call, 1)

path.write_text(text, encoding='utf-8')
print('Smart work-order PDF layout patch applied.')
