import {
  supabase,
} from '../lib/supabase'
import type {
  ScannedDeliveryNote,
} from '../utils/deliveryNoteStorage'

function arrayBufferToBase64(
  buffer: ArrayBuffer,
) {
  const bytes =
    new Uint8Array(
      buffer,
    )

  const chunk =
    0x8000

  let binary = ''

  for (
    let index = 0;
    index <
    bytes.length;
    index +=
      chunk
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          index,
          Math.min(
            index + chunk,
            bytes.length,
          ),
        ),
      )
  }

  return btoa(binary)
}

export async function analyzeDeliveryNoteScans(
  files: File[],
): Promise<ScannedDeliveryNote> {
  if (!files.length) {
    throw new Error(
      'Dodaj barem jednu stranicu otpremnice.',
    )
  }

  if (
    files.length > 12
  ) {
    throw new Error(
      'Možeš analizirati najviše 12 stranica odjednom.',
    )
  }

  const images =
    await Promise.all(
      files.map(
        async (
          file,
        ) => {
          if (
            !file.type.startsWith(
              'image/',
            )
          ) {
            throw new Error(
              'Sken mora biti slika.',
            )
          }

          if (
            file.size >
            12 * 1024 * 1024
          ) {
            throw new Error(
              `Slika ${file.name} je veća od 12 MB.`,
            )
          }

          return {
            mimeType:
              file.type ||
              'image/jpeg',
            imageBase64:
              arrayBufferToBase64(
                await file.arrayBuffer(),
              ),
          }
        },
      ),
    )

  const {
    data,
    error,
  } =
    await supabase.functions
      .invoke(
        'delivery-note-ai',
        {
          body: {
            images,
          },
        },
      )

  if (error) {
    throw new Error(
      error.message ||
      'AI nije mogao pročitati otpremnicu.',
    )
  }

  if (
    data?.error
  ) {
    throw new Error(
      String(
        data.error,
      ),
    )
  }

  if (
    !data ||
    !Array.isArray(
      data.lines,
    )
  ) {
    throw new Error(
      'AI nije vratio ispravnu otpremnicu.',
    )
  }

  return data as
    ScannedDeliveryNote
}
