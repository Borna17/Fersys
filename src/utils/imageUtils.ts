export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
): Promise<string> {
  const source = await readFileAsDataUrl(file)
  const image = await loadImage(source)

  const ratio = Math.min(
    1,
    maxWidth / image.width,
    maxHeight / image.height,
  )

  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Canvas nije dostupan.')
  }

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', quality)
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Datoteku nije moguće pročitati.'))
      }
    }
    reader.onerror = () => reject(new Error('Datoteku nije moguće pročitati.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Sliku nije moguće učitati.'))
    image.src = source
  })
}

