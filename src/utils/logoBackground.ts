function readFileAsDataUrl(
  file: File,
): Promise<string> {
  return new Promise(
    (resolve, reject) => {
      const reader =
        new FileReader()

      reader.onload = () => {
        if (
          typeof reader.result ===
          'string'
        ) {
          resolve(reader.result)
          return
        }

        reject(
          new Error(
            'Logo nije moguće učitati.',
          ),
        )
      }

      reader.onerror = () => {
        reject(
          new Error(
            'Logo nije moguće učitati.',
          ),
        )
      }

      reader.readAsDataURL(file)
    },
  )
}

function loadImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const image = new Image()

      image.onload = () =>
        resolve(image)

      image.onerror = () =>
        reject(
          new Error(
            'Logo nije moguće obraditi.',
          ),
        )

      image.src = source
    },
  )
}

function getTrimBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
) {
  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (
    let y = 0;
    y < height;
    y += 1
  ) {
    for (
      let x = 0;
      x < width;
      x += 1
    ) {
      const index =
        (y * width + x) * 4

      const alpha =
        data[index + 3]

      if (alpha > 10) {
        minX = Math.min(
          minX,
          x,
        )
        minY = Math.min(
          minY,
          y,
        )
        maxX = Math.max(
          maxX,
          x,
        )
        maxY = Math.max(
          maxY,
          y,
        )
      }
    }
  }

  if (
    maxX < minX ||
    maxY < minY
  ) {
    return {
      x: 0,
      y: 0,
      width,
      height,
    }
  }

  const padding = Math.max(
    8,
    Math.round(
      Math.max(
        width,
        height,
      ) * 0.025,
    ),
  )

  const x = Math.max(
    0,
    minX - padding,
  )

  const y = Math.max(
    0,
    minY - padding,
  )

  const right = Math.min(
    width,
    maxX + padding + 1,
  )

  const bottom = Math.min(
    height,
    maxY + padding + 1,
  )

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
  }
}

export async function removeLightBackgroundFromLogo(
  file: File,
): Promise<string> {
  const source =
    await readFileAsDataUrl(
      file,
    )

  const image =
    await loadImage(source)

  const maximumDimension = 1600

  const scale = Math.min(
    1,
    maximumDimension /
      Math.max(
        image.naturalWidth,
        image.naturalHeight,
      ),
  )

  const width = Math.max(
    1,
    Math.round(
      image.naturalWidth *
        scale,
    ),
  )

  const height = Math.max(
    1,
    Math.round(
      image.naturalHeight *
        scale,
    ),
  )

  const canvas =
    document.createElement(
      'canvas',
    )

  canvas.width = width
  canvas.height = height

  const context =
    canvas.getContext(
      '2d',
      {
        willReadFrequently:
          true,
      },
    )

  if (!context) {
    throw new Error(
      'Logo nije moguće obraditi.',
    )
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height,
  )

  const imageData =
    context.getImageData(
      0,
      0,
      width,
      height,
    )

  const data =
    imageData.data

  for (
    let index = 0;
    index < data.length;
    index += 4
  ) {
    const red =
      data[index]

    const green =
      data[index + 1]

    const blue =
      data[index + 2]

    const maximum =
      Math.max(
        red,
        green,
        blue,
      )

    const minimum =
      Math.min(
        red,
        green,
        blue,
      )

    const brightness =
      (red +
        green +
        blue) /
      3

    const colorSpread =
      maximum - minimum

    const isAlmostNeutral =
      colorSpread <= 20

    const fullyTransparent =
      isAlmostNeutral &&
      brightness >= 247

    const partlyTransparent =
      isAlmostNeutral &&
      brightness > 220

    if (
      fullyTransparent
    ) {
      data[index + 3] = 0
      continue
    }

    if (
      partlyTransparent
    ) {
      const opacity =
        Math.round(
          255 *
            ((247 -
              brightness) /
              27),
        )

      data[index + 3] =
        Math.min(
          data[index + 3],
          Math.max(
            0,
            opacity,
          ),
        )
    }
  }

  context.putImageData(
    imageData,
    0,
    0,
  )

  const processed =
    context.getImageData(
      0,
      0,
      width,
      height,
    )

  const bounds =
    getTrimBounds(
      processed.data,
      width,
      height,
    )

  const output =
    document.createElement(
      'canvas',
    )

  output.width =
    bounds.width

  output.height =
    bounds.height

  const outputContext =
    output.getContext('2d')

  if (!outputContext) {
    throw new Error(
      'Logo nije moguće spremiti.',
    )
  }

  outputContext.drawImage(
    canvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    bounds.width,
    bounds.height,
  )

  return output.toDataURL(
    'image/png',
  )
}

