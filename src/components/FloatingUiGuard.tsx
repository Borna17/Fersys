import {
  useEffect,
} from 'react'

function findButtonByText(
  text: string,
) {
  return Array.from(
    document.querySelectorAll(
      'button',
    ),
  ).find(
    (button) =>
      button.textContent
        ?.replace(/\s+/g, ' ')
        .trim()
        .includes(text),
  )
}

function tagFloatingUi() {
  const daily =
    findButtonByText(
      'Dnevni pregled',
    )

  if (daily) {
    daily.setAttribute(
      'data-fersys-floating',
      'daily-brief',
    )
    daily.setAttribute(
      'data-fersys-hide-while-editing',
      'true',
    )
  }

  const field =
    findButtonByText(
      'Rad',
    )

  const fieldContainer =
    field?.closest(
      'div.fixed',
    ) as HTMLElement | null

  if (
    fieldContainer
  ) {
    fieldContainer.setAttribute(
      'data-fersys-floating',
      'field-mode',
    )
    fieldContainer.setAttribute(
      'data-fersys-hide-while-editing',
      'true',
    )

    if (
      window.matchMedia(
        '(min-width: 768px)',
      ).matches
    ) {
      fieldContainer.style.left =
        '19rem'
      fieldContainer.style.bottom =
        '1.5rem'
      fieldContainer.style.transform =
        'none'
    } else {
      fieldContainer.style.removeProperty(
        'left',
      )
      fieldContainer.style.removeProperty(
        'bottom',
      )
      fieldContainer.style.removeProperty(
        'transform',
      )
    }
  }

  const deliveryNoteAction =
    findButtonByText(
      'Izradi otpremnicu',
    )

  if (
    deliveryNoteAction &&
    deliveryNoteAction.className
      .toString()
      .includes('fixed')
  ) {
    deliveryNoteAction.setAttribute(
      'data-fersys-floating',
      'delivery-note-action',
    )

    if (
      window.matchMedia(
        '(min-width: 768px)',
      ).matches
    ) {
      deliveryNoteAction.style.bottom =
        '5.5rem'
      deliveryNoteAction.style.right =
        '1.5rem'
    } else {
      deliveryNoteAction.style.removeProperty(
        'bottom',
      )
      deliveryNoteAction.style.removeProperty(
        'right',
      )
    }
  }

  const offline =
    Array.from(
      document.querySelectorAll(
        'button,div',
      ),
    ).find(
      (element) =>
        (
          element.textContent
            ?.includes(
              'čeka cloud',
            ) ||
          element.textContent
            ?.includes(
              'Bez interneta',
            ) ||
          element.textContent
            ?.includes(
              'Nacrti sinkronizirani',
            )
        ) &&
        element.className
          .toString()
          .includes(
            'fixed',
          ),
    )

  if (offline) {
    offline.setAttribute(
      'data-fersys-floating',
      'offline-status',
    )
  }
}

export default function FloatingUiGuard() {
  useEffect(() => {
    tagFloatingUi()

    const observer =
      new MutationObserver(
        () => {
          tagFloatingUi()
        },
      )

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true,
      },
    )

    const handleResize = () => {
      tagFloatingUi()
    }

    window.addEventListener(
      'resize',
      handleResize,
    )

    return () => {
      observer.disconnect()
      window.removeEventListener(
        'resize',
        handleResize,
      )
    }
  }, [])

  return null
}
