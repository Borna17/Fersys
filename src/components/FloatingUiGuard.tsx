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
    )

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

    return () => {
      observer.disconnect()
    }
  }, [])

  return null
}
