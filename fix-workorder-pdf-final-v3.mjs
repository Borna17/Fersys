import fs from 'node:fs'
import path from 'node:path'

const rel='src/utils/workOrderPdf.ts'
const file=path.join(process.cwd(),rel)
if(!fs.existsSync(file)) throw new Error('Nedostaje '+rel)
let raw=fs.readFileSync(file,'utf8')
const eol=raw.includes('\r\n')?'\r\n':'\n'
let t=raw.replace(/\r\n/g,'\n')
const stamp=new Date().toISOString().replace(/[:.]/g,'-')
const backup=path.join(process.cwd(),'.fersys-workorder-pdf-backup',stamp,rel)

function r(a,b,label){
  if(t.includes(b)) return
  if(!t.includes(a)) throw new Error('Nije pronađeno: '+label)
  t=t.replace(a,b)
}

const oldPaginate = "function paginateOrder(\n  order: WorkOrder,\n): LogicalPage[] {\n  const pages: LogicalPage[] = []\n  const firstMaterialLimit = 12\n\n  pages.push({\n    materials:\n      order.materials.slice(\n        0,\n        firstMaterialLimit,\n      ),\n    photos: [],\n    showInfo: true,\n    showDescription: true,\n    showTotals:\n      order.materials.length <=\n      firstMaterialLimit,\n    showSignature:\n      order.materials.length <=\n        firstMaterialLimit &&\n      order.images.length === 0,\n  })\n\n  let materialIndex = firstMaterialLimit\n\n  while (\n    materialIndex <\n    order.materials.length\n  ) {\n    const materials =\n      order.materials.slice(\n        materialIndex,\n        materialIndex + 18,\n      )\n\n    materialIndex += materials.length\n\n    const isLastMaterialPage =\n      materialIndex >=\n      order.materials.length\n\n    pages.push({\n      materials,\n      photos: [],\n      showInfo: false,\n      showDescription: false,\n      showTotals:\n        isLastMaterialPage,\n      showSignature:\n        isLastMaterialPage &&\n        order.images.length === 0,\n    })\n  }\n\n  if (order.images.length > 0) {\n    for (\n      let index = 0;\n      index < order.images.length;\n      index += 4\n    ) {\n      const photos =\n        order.images.slice(\n          index,\n          index + 4,\n        )\n\n      const isLastPhotoPage =\n        index + 4 >=\n        order.images.length\n\n      pages.push({\n        materials: [],\n        photos,\n        showInfo: false,\n        showDescription: false,\n        showTotals: false,\n        showSignature:\n          isLastPhotoPage,\n      })\n    }\n  }\n\n  return pages\n}"

const newPaginate = "function paginateOrder(\n  order: WorkOrder,\n): LogicalPage[] {\n  const pages: LogicalPage[] = []\n  const firstMaterialLimit = 10\n  const descriptionLength =\n    (order.description || '').length +\n    (order.title || '').length\n\n  const canFitPhotosOnFirstPage =\n    order.materials.length <= 6 &&\n    descriptionLength <= 1150\n\n  const firstPagePhotoCount =\n    canFitPhotosOnFirstPage\n      ? Math.min(3, order.images.length)\n      : 0\n\n  const firstPageHasAllPhotos =\n    firstPagePhotoCount === order.images.length\n\n  pages.push({\n    materials: order.materials.slice(0, firstMaterialLimit),\n    photos: order.images.slice(0, firstPagePhotoCount),\n    showInfo: true,\n    showDescription: true,\n    showTotals: order.materials.length <= firstMaterialLimit,\n    showSignature:\n      order.materials.length <= firstMaterialLimit &&\n      firstPageHasAllPhotos,\n  })\n\n  let materialIndex = firstMaterialLimit\n\n  while (materialIndex < order.materials.length) {\n    const materials = order.materials.slice(materialIndex, materialIndex + 18)\n    materialIndex += materials.length\n    const isLastMaterialPage = materialIndex >= order.materials.length\n\n    pages.push({\n      materials,\n      photos: [],\n      showInfo: false,\n      showDescription: false,\n      showTotals: isLastMaterialPage,\n      showSignature: isLastMaterialPage && order.images.length === 0,\n    })\n  }\n\n  for (let index = firstPagePhotoCount; index < order.images.length; index += 4) {\n    const photos = order.images.slice(index, index + 4)\n    const isLastPhotoPage = index + 4 >= order.images.length\n\n    pages.push({\n      materials: [],\n      photos,\n      showInfo: false,\n      showDescription: false,\n      showTotals: false,\n      showSignature: isLastPhotoPage,\n    })\n  }\n\n  return pages\n}"
r(oldPaginate,newPaginate,'paginateOrder')

r("      grid-template-columns: 1.25fr 1fr 1.35fr .95fr 1fr .55fr;","      grid-template-columns: repeat(3, minmax(0, 1fr));",'meta columns')
r("      padding: 8px 9px;\n      border-right: 1px solid ${border};","      min-height: 43px;\n      padding: 7px 10px;\n      border-right: 1px solid ${border};\n      border-bottom: 1px solid ${border};",'meta cell')
r("    .workorder-meta-strip > div:last-child {\n      border-right: 0;\n    }","    .workorder-meta-strip > div:nth-child(3n) {\n      border-right: 0;\n    }\n\n    .workorder-meta-strip > div:nth-last-child(-n + 3) {\n      border-bottom: 0;\n    }",'meta borders')
r("      font-size: 7.2px;","      font-size: 7.6px;",'meta labels')
r("      overflow: hidden;\n      margin-top: 3px;\n      color: ${secondary};\n      font-size: 9.3px;\n      font-weight: 900;\n      text-overflow: ellipsis;\n      white-space: nowrap;","      margin-top: 3px;\n      color: ${secondary};\n      font-size: 10.4px;\n      line-height: 1.2;\n      font-weight: 900;\n      overflow-wrap: anywhere;",'meta values')

r("    .photo-card img {\n      height: 205px;\n    }","    .photo-card img {\n      height: 205px;\n    }\n\n    .photo-grid.first-page.photo-count-1 { grid-template-columns: 1fr; }\n    .photo-grid.first-page.photo-count-1 .photo-card img { height: 245px; }\n    .photo-grid.first-page.photo-count-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }\n    .photo-grid.first-page.photo-count-2 .photo-card img { height: 180px; }\n    .photo-grid.first-page.photo-count-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }\n    .photo-grid.first-page.photo-count-3 .photo-card img { height: 155px; }\n    .photo-grid.first-page .photo-name { font-size: 7.7px; }",'photo css')

r("function photosHtml(\n  photos:\n    WorkOrderImage[],\n  branding:\n    WorkOrderBranding,\n) {","function photosHtml(\n  photos:\n    WorkOrderImage[],\n  branding:\n    WorkOrderBranding,\n  firstPage = false,\n) {",'photos signature')

r("      <div class=\"photo-grid\">\n        ${items}\n      </div>","      <div class=\"photo-grid ${firstPage ? 'first-page photo-count-' + photos.length : ''}\">\n        ${items}\n      </div>",'photo grid classes')

r("          ${photosHtml(\n            page.photos,\n            branding,\n          )}","          ${photosHtml(\n            page.photos,\n            branding,\n            page.showInfo,\n          )}",'photos call')

r("            scale: 2,","            scale: 1.7,",'html2canvas scale')

fs.mkdirSync(path.dirname(backup),{recursive:true})
fs.copyFileSync(file,backup)
fs.writeFileSync(file,eol==='\r\n'?t.replace(/\n/g,'\r\n'):t,'utf8')
console.log('✓ workOrderPdf.ts popravljen')
console.log('✓ 2-3 slike mogu stati na prvu stranicu kad sadržaj dopušta')
console.log('✓ gornji podaci su 3x2 i čitljiviji')
console.log('✓ ostale slike ostaju 4 po nastavnoj stranici')
console.log('Sada pokreni: npm run build')
