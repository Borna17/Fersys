import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

function write(path, source) {
  fs.writeFileSync(path, source, 'utf8')
}

// 1) Android-safe data URL -> Blob conversion for customer gallery.
{
  const path = 'src/services/customerPhotos.service.ts'
  let source = read(path)

  const oldBlock = `async function dataUrlToBlob(\n  dataUrl: string,\n) {\n  const response =\n    await fetch(dataUrl)\n\n  if (!response.ok) {\n    throw new Error(\n      'Fotografiju nije moguće pripremiti za galeriju investitora.',\n    )\n  }\n\n  return response.blob()\n}`

  const newBlock = `async function dataUrlToBlob(\n  dataUrl: string,\n) {\n  const match = dataUrl.match(\n    /^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,(.*)$/s,\n  )\n\n  if (!match) {\n    throw new Error(\n      'Fotografiju nije moguće pripremiti za galeriju investitora.',\n    )\n  }\n\n  const mimeType =\n    match[1] || 'image/jpeg'\n  const isBase64 =\n    Boolean(match[2])\n  const payload = match[3]\n\n  try {\n    if (isBase64) {\n      const binary = atob(payload)\n      const bytes =\n        new Uint8Array(binary.length)\n\n      for (\n        let index = 0;\n        index < binary.length;\n        index += 1\n      ) {\n        bytes[index] =\n          binary.charCodeAt(index)\n      }\n\n      return new Blob([bytes], {\n        type: mimeType,\n      })\n    }\n\n    return new Blob(\n      [decodeURIComponent(payload)],\n      { type: mimeType },\n    )\n  } catch {\n    throw new Error(\n      'Fotografiju nije moguće pripremiti za galeriju investitora.',\n    )\n  }\n}`

  if (!source.includes(oldBlock)) {
    throw new Error('customerPhotos dataUrlToBlob block not found')
  }

  source = source.replace(oldBlock, newBlock)
  source = source.replace('    missing,\n    3,', '    missing,\n    1,')
  write(path, source)
}

// 2) Make Share visible immediately beside PDF on mobile details header.
{
  const path = 'src/pages/WorkOrderDetailsPage.tsx'
  let source = read(path)

  source = source.replace(
    'className="mt-4 grid grid-cols-2 gap-2 sm:hidden"',
    'className="mt-4 grid grid-cols-3 gap-2 sm:hidden"',
  )

  const pdfButton = `              <button\n                type="button"\n                disabled={isDownloading || isDeleting}\n                onClick={handleDownloadPdf}\n                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white active:scale-[0.99] disabled:opacity-50"\n              >\n                <Download size={18} />\n                {isDownloading ? 'PDF...' : 'PDF'}\n              </button>`

  const shareButton = `${pdfButton}\n\n              <button\n                type="button"\n                disabled={isSharing || isDownloading || isDeleting}\n                onClick={() => {\n                  void handleSharePdf()\n                }}\n                className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-violet-400/20 bg-violet-500/15 px-3 text-sm font-black text-violet-100 active:scale-[0.99] disabled:opacity-50"\n              >\n                <Share2 size={18} />\n                {isSharing ? '...' : 'Dijeli'}\n              </button>`

  if (!source.includes(pdfButton)) {
    throw new Error('mobile PDF button not found')
  }

  source = source.replace(pdfButton, shareButton)
  write(path, source)
}

// 3) Keep FERSYS Flow inside screen and above the other mobile floating controls.
{
  const path = 'src/components/BusinessFlowActions.tsx'
  let source = read(path)

  const oldClass = 'className="fixed bottom-[calc(5.45rem+var(--fersys-safe-bottom))] right-3 z-[55] inline-flex h-12 items-center gap-2 rounded-2xl border border-blue-400/20 bg-slate-900/95 px-4 text-sm font-black text-white shadow-2xl shadow-black/50 backdrop-blur-xl transition active:scale-95 md:bottom-6 md:right-6 md:h-12"'
  const newClass = 'className="fixed bottom-[calc(9.75rem+var(--fersys-safe-bottom))] right-3 z-[55] inline-flex h-12 max-w-[calc(100vw-1.5rem)] items-center gap-2 overflow-hidden rounded-2xl border border-blue-400/20 bg-slate-900/95 px-4 text-sm font-black text-white shadow-2xl shadow-black/50 backdrop-blur-xl transition active:scale-95 md:bottom-6 md:right-6 md:h-12 md:max-w-none"'

  if (!source.includes(oldClass)) {
    throw new Error('BusinessFlowActions mobile button class not found')
  }

  source = source.replace(oldClass, newClass)
  write(path, source)
}

console.log('Mobile work order fixes applied.')
// trigger
