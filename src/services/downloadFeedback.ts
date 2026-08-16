export type DownloadFeedbackDetail = {
  fileName?: string
  openUrl?: string
  message?: string
}

function emit(
  type:
    | 'fersys:download-preparing'
    | 'fersys:download-complete'
    | 'fersys:download-error',
  detail:
    DownloadFeedbackDetail,
) {
  window.dispatchEvent(
    new CustomEvent(
      type,
      {
        detail,
      },
    ),
  )
}

export function notifyDownloadPreparing(
  fileName?: string,
) {
  emit(
    'fersys:download-preparing',
    {
      fileName,
    },
  )
}

export function notifyDownloadError(
  message:
    string,
  fileName?: string,
) {
  emit(
    'fersys:download-error',
    {
      fileName,
      message,
    },
  )
}

/**
 * Pokreće browser download iz već pripremljenog Blob-a,
 * a FERSYS-u ostavlja privremeni blob URL kako bi korisnik
 * iz toast poruke mogao odmah otvoriti dokument.
 */
export function saveBlobDownload(
  blob: Blob,
  fileName: string,
) {
  const url =
    URL.createObjectURL(
      blob,
    )

  const anchor =
    document.createElement(
      'a',
    )

  anchor.href = url
  anchor.download =
    fileName
  anchor.style.display =
    'none'

  /*
   * Globalni DownloadFeedbackCenter prati i druge anchor downloade.
   * Ovaj download sami prijavljujemo pa sprječavamo dupli toast.
   */
  anchor.dataset
    .fersysSkipDownloadFeedback =
    'true'

  document.body.appendChild(
    anchor,
  )

  anchor.click()
  anchor.remove()

  emit(
    'fersys:download-complete',
    {
      fileName,
      openUrl:
        url,
    },
  )

  /*
   * Dovoljno dugo da korisnik može kliknuti "Otvori"
   * u potvrdi nakon preuzimanja.
   */
  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url,
      )
    },
    90_000,
  )

  return url
}
