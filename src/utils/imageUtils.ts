export type DocumentMarkKind =
  | 'stamp'
  | 'signature'

type DocumentMarkPreset = {
  maxWidth: number
  maxHeight: number
  paddingRatio: number
  lightThreshold: number
  neutralTolerance: number
}

const MARK_PRESETS:
Record<
  DocumentMarkKind,
  DocumentMarkPreset
> = {
  stamp: {
    maxWidth: 1000,
    maxHeight: 600,
    paddingRatio: 0.045,
    lightThreshold: 244,
    neutralTolerance: 34,
  },
  signature: {
    maxWidth: 1200,
    maxHeight: 450,
    paddingRatio: 0.055,
    lightThreshold: 246,
    neutralTolerance: 30,
  },
}

export async function fileToCompressedDataUrl(
  file: File,
  maxWidth = 1600,
  maxHeight = 1600,
  quality = 0.82,
): Promise<string> {
  /*
   * SettingsPage već šalje ove dimenzije:
   * - pečat: 1400 x 1400
   * - potpis: 1200 x 600
   *
   * Time zadržavamo kompatibilnost s postojećim kodom,
   * ali pečat i potpis dobivaju novu pametnu obradu.
   */
  if (
    maxWidth === 1400 &&
    maxHeight === 1400
  ) {
    return processDocumentMark(
      file,
      'stamp',
    )
  }

  if (
    maxWidth === 1200 &&
    maxHeight === 600
  ) {
    return processDocumentMark(
      file,
      'signature',
    )
  }

  const source =
    await readFileAsDataUrl(
      file,
    )

  const image =
    await loadImage(source)

  const ratio =
    Math.min(
      1,
      maxWidth /
        image.width,
      maxHeight /
        image.height,
    )

  const width =
    Math.max(
      1,
      Math.round(
        image.width *
          ratio,
      ),
    )

  const height =
    Math.max(
      1,
      Math.round(
        image.height *
          ratio,
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
    )

  if (!context) {
    throw new Error(
      'Canvas nije dostupan.',
    )
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height,
  )

  return canvas.toDataURL(
    'image/jpeg',
    quality,
  )
}

/**
 * Obrada pečata/potpisa:
 * 1. učita sliku
 * 2. smanji vrlo veliku fotografiju radi brzine
 * 3. procijeni svijetlu papirnatu pozadinu
 * 4. bijelu/svijetlosivu pozadinu pretvori u prozirnu
 * 5. pronađe stvarni sadržaj
 * 6. odreže prazne rubove
 * 7. doda mali sigurni padding
 * 8. skalira na standardnu rezoluciju za FERSYS dokumente
 * 9. sprema transparentni PNG
 */
export async function processDocumentMark(
  file: File,
  kind:
    DocumentMarkKind,
): Promise<string> {
  const preset =
    MARK_PRESETS[kind]

  const source =
    await readFileAsDataUrl(
      file,
    )

  const image =
    await loadImage(
      source,
    )

  const analysisMax =
    kind === 'stamp'
      ? 1800
      : 2000

  const analysisScale =
    Math.min(
      1,
      analysisMax /
        Math.max(
          image.width,
          image.height,
        ),
    )

  const analysisWidth =
    Math.max(
      1,
      Math.round(
        image.width *
          analysisScale,
      ),
    )

  const analysisHeight =
    Math.max(
      1,
      Math.round(
        image.height *
          analysisScale,
      ),
    )

  const analysisCanvas =
    document.createElement(
      'canvas',
    )

  analysisCanvas.width =
    analysisWidth

  analysisCanvas.height =
    analysisHeight

  const analysisContext =
    analysisCanvas.getContext(
      '2d',
      {
        willReadFrequently:
          true,
      },
    )

  if (!analysisContext) {
    throw new Error(
      'Canvas nije dostupan.',
    )
  }

  analysisContext.clearRect(
    0,
    0,
    analysisWidth,
    analysisHeight,
  )

  analysisContext.drawImage(
    image,
    0,
    0,
    analysisWidth,
    analysisHeight,
  )

  const imageData =
    analysisContext.getImageData(
      0,
      0,
      analysisWidth,
      analysisHeight,
    )

  const pixels =
    imageData.data

  let minX =
    analysisWidth

  let minY =
    analysisHeight

  let maxX = -1
  let maxY = -1

  for (
    let y = 0;
    y <
    analysisHeight;
    y += 1
  ) {
    for (
      let x = 0;
      x <
      analysisWidth;
      x += 1
    ) {
      const index =
        (
          y *
            analysisWidth +
          x
        ) *
        4

      const r =
        pixels[index]

      const g =
        pixels[
          index + 1
        ]

      const b =
        pixels[
          index + 2
        ]

      const originalAlpha =
        pixels[
          index + 3
        ]

      if (
        originalAlpha <
        8
      ) {
        continue
      }

      const maxChannel =
        Math.max(
          r,
          g,
          b,
        )

      const minChannel =
        Math.min(
          r,
          g,
          b,
        )

      const chroma =
        maxChannel -
        minChannel

      const luminance =
        (
          0.2126 *
            r +
          0.7152 *
            g +
          0.0722 *
            b
        )

      /*
       * Svijetla gotovo neutralna pozadina = papir.
       * Plavi/crveni pečat ostaje sačuvan čak i kada je svjetliji
       * jer ima veći chroma.
       */
      const looksLikePaper =
        luminance >=
          preset
            .lightThreshold &&
        chroma <=
          preset
            .neutralTolerance

      const featherPaper =
        luminance >=
          preset
            .lightThreshold -
            30 &&
        chroma <=
          preset
            .neutralTolerance

      let alpha =
        originalAlpha

      if (looksLikePaper) {
        alpha = 0
      } else if (
        featherPaper
      ) {
        const range =
          30

        const distance =
          preset
            .lightThreshold -
          luminance

        alpha =
          Math.round(
            originalAlpha *
              Math.max(
                0.12,
                Math.min(
                  1,
                  distance /
                    range,
                ),
              ),
          )
      }

      pixels[
        index + 3
      ] = alpha

      /*
       * Za crop gledamo samo dovoljno vidljiv sadržaj.
       * Time sitna kompresijska prašina na rubovima ne širi crop.
       */
      if (
        alpha >= 45 &&
        (
          luminance <
            238 ||
          chroma > 22
        )
      ) {
        minX =
          Math.min(
            minX,
            x,
          )

        minY =
          Math.min(
            minY,
            y,
          )

        maxX =
          Math.max(
            maxX,
            x,
          )

        maxY =
          Math.max(
            maxY,
            y,
          )
      }
    }
  }

  analysisContext.putImageData(
    imageData,
    0,
    0,
  )

  /*
   * Ako algoritam nije pronašao sadržaj, koristimo cijelu sliku
   * umjesto da korisnik dobije praznu sliku.
   */
  if (
    maxX < minX ||
    maxY < minY
  ) {
    minX = 0
    minY = 0
    maxX =
      analysisWidth - 1
    maxY =
      analysisHeight - 1
  }

  const contentWidth =
    maxX -
    minX +
    1

  const contentHeight =
    maxY -
    minY +
    1

  const padding =
    Math.max(
      6,
      Math.round(
        Math.max(
          contentWidth,
          contentHeight,
        ) *
          preset
            .paddingRatio,
      ),
    )

  const cropX =
    Math.max(
      0,
      minX -
        padding,
    )

  const cropY =
    Math.max(
      0,
      minY -
        padding,
    )

  const cropRight =
    Math.min(
      analysisWidth,
      maxX +
        1 +
        padding,
    )

  const cropBottom =
    Math.min(
      analysisHeight,
      maxY +
        1 +
        padding,
    )

  const cropWidth =
    Math.max(
      1,
      cropRight -
        cropX,
    )

  const cropHeight =
    Math.max(
      1,
      cropBottom -
        cropY,
    )

  const outputScale =
    Math.min(
      1,
      preset.maxWidth /
        cropWidth,
      preset.maxHeight /
        cropHeight,
    )

  /*
   * Ako je original malen, ne povećavamo ga umjetno.
   * Ako je velik, smanjujemo ga na standard FERSYS-a.
   */
  const outputWidth =
    Math.max(
      1,
      Math.round(
        cropWidth *
          outputScale,
      ),
    )

  const outputHeight =
    Math.max(
      1,
      Math.round(
        cropHeight *
          outputScale,
      ),
    )

  const outputCanvas =
    document.createElement(
      'canvas',
    )

  outputCanvas.width =
    outputWidth

  outputCanvas.height =
    outputHeight

  const outputContext =
    outputCanvas.getContext(
      '2d',
    )

  if (!outputContext) {
    throw new Error(
      'Canvas nije dostupan.',
    )
  }

  outputContext.clearRect(
    0,
    0,
    outputWidth,
    outputHeight,
  )

  outputContext.imageSmoothingEnabled =
    true

  outputContext.imageSmoothingQuality =
    'high'

  outputContext.drawImage(
    analysisCanvas,
    cropX,
    cropY,
    cropWidth,
    cropHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  )

  return outputCanvas.toDataURL(
    'image/png',
  )
}

export function readFileAsDataUrl(
  file: File,
): Promise<string> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const reader =
        new FileReader()

      reader.onload = () => {
        if (
          typeof reader.result ===
          'string'
        ) {
          resolve(
            reader.result,
          )
        } else {
          reject(
            new Error(
              'Datoteku nije moguće pročitati.',
            ),
          )
        }
      }

      reader.onerror =
        () =>
          reject(
            new Error(
              'Datoteku nije moguće pročitati.',
            ),
          )

      reader.readAsDataURL(
        file,
      )
    },
  )
}

function loadImage(
  source: string,
): Promise<HTMLImageElement> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const image =
        new Image()

      image.onload =
        () =>
          resolve(image)

      image.onerror =
        () =>
          reject(
            new Error(
              'Sliku nije moguće učitati.',
            ),
          )

      image.src =
        source
    },
  )
}
