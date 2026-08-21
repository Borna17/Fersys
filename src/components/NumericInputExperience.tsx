import { useEffect } from 'react'

function isNumericInput(
  target: EventTarget | null,
): target is HTMLInputElement {
  return (
    target instanceof HTMLInputElement &&
    target.type === 'number'
  )
}

function isReplaceableZero(
  input: HTMLInputElement,
) {
  const normalized =
    input.value.trim().replace(',', '.')

  return (
    normalized === '0' ||
    normalized === '0.0' ||
    normalized === '0.00'
  )
}

function selectCurrentValue(
  input: HTMLInputElement,
) {
  window.requestAnimationFrame(() => {
    if (
      document.activeElement !== input
    ) {
      return
    }

    try {
      input.select()
    } catch {
      // Neki mobilni preglednici ignoriraju select() na number inputu.
      // U tom slučaju browser zadržava svoje nativno ponašanje.
    }
  })
}

/**
 * Globalno usklađuje brojčana polja u FERSYS-u.
 *
 * Controlled React number inputi često moraju imati početnu vrijednost 0.
 * Kada korisnik želi upisati novu cijenu/popust, taj 0 ne bi smio zahtijevati
 * dodatno brisanje. Zato pri fokusu označavamo cijelu nulu, pa prvi upis
 * odmah zamjenjuje postojeću vrijednost.
 *
 * Komponenta ne mijenja poslovne podatke niti onChange logiku pojedinih formi.
 */
export default function NumericInputExperience() {
  useEffect(() => {
    function handleFocusIn(
      event: FocusEvent,
    ) {
      if (!isNumericInput(event.target)) {
        return
      }

      const input = event.target

      if (!input.inputMode) {
        input.inputMode = 'decimal'
      }

      if (isReplaceableZero(input)) {
        selectCurrentValue(input)
      }
    }

    function handlePointerUp(
      event: PointerEvent,
    ) {
      if (!isNumericInput(event.target)) {
        return
      }

      const input = event.target

      if (!isReplaceableZero(input)) {
        return
      }

      event.preventDefault()
      selectCurrentValue(input)
    }

    function handleWheel(
      event: WheelEvent,
    ) {
      if (!isNumericInput(event.target)) {
        return
      }

      const input = event.target

      if (document.activeElement === input) {
        input.blur()
      }
    }

    document.addEventListener(
      'focusin',
      handleFocusIn,
    )
    document.addEventListener(
      'pointerup',
      handlePointerUp,
    )
    document.addEventListener(
      'wheel',
      handleWheel,
      { passive: true },
    )

    return () => {
      document.removeEventListener(
        'focusin',
        handleFocusIn,
      )
      document.removeEventListener(
        'pointerup',
        handlePointerUp,
      )
      document.removeEventListener(
        'wheel',
        handleWheel,
      )
    }
  }, [])

  return null
}
