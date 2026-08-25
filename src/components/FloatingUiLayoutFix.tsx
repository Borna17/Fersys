export default function FloatingUiLayoutFix() {
  return (
    <style>{`
      /*
       * FERSYS FLOATING UI RAIL
       *
       * Desktop ostaje kompaktan uz desni rub.
       * Mobile / Postavke dobiva zaseban sigurni red iznad
       * fiksnog "Spremi / Spremljeno" bara.
       */

      @media (min-width: 768px) {
        button[aria-label^="Otvori video pomoć za"] {
          top: 54% !important;
          right: 0.5rem !important;
          bottom: auto !important;
          left: auto !important;

          width: 3rem !important;
          min-width: 3rem !important;
          height: 3rem !important;
          min-height: 3rem !important;

          display: flex !important;
          align-items: center !important;
          justify-content: center !important;

          padding-left: 0 !important;
          padding-right: 0 !important;
          gap: 0 !important;

          border-top-right-radius: 0.6rem !important;
          border-bottom-right-radius: 0.6rem !important;

          transform: translateY(-50%) !important;
        }

        button[aria-label^="Otvori video pomoć za"] > span:last-child {
          display: none !important;
        }

        button[aria-label^="Otvori video pomoć za"]:active {
          transform:
            translateY(-50%)
            scale(0.96) !important;
        }

        button[aria-label="Otvori sve video tutorijale"] {
          top: 62% !important;
          right: 0.5rem !important;
          bottom: auto !important;
          left: auto !important;

          width: 3rem !important;
          height: 3rem !important;
          min-height: 3rem !important;

          border-top-right-radius: 0.6rem !important;
          border-bottom-right-radius: 0.6rem !important;

          transform: translateY(-50%) !important;
        }

        button[aria-label="Otvori sve video tutorijale"]:active {
          transform:
            translateY(-50%)
            scale(0.96) !important;
        }
      }

      /*
       * MOBILE SETTINGS FIX
       */
      @media (max-width: 767px) {
        body:has(button[aria-label="Spremi postavke"])
          button[aria-label^="Otvori video pomoć za"] {
          position: fixed !important;
          left: 0.75rem !important;
          right: auto !important;
          bottom:
            calc(
              10.25rem +
              env(safe-area-inset-bottom)
            ) !important;

          width: 3.25rem !important;
          min-width: 3.25rem !important;
          height: 3.25rem !important;
          min-height: 3.25rem !important;

          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0 !important;

          border-radius: 1rem !important;
          z-index: 83 !important;
        }

        body:has(button[aria-label="Spremi postavke"])
          button[aria-label^="Otvori video pomoć za"]
          > span:last-child {
          display: none !important;
        }

        body:has(button[aria-label="Spremi postavke"])
          button[aria-label="Otvori sve video tutorijale"] {
          position: fixed !important;
          left: 4.4rem !important;
          right: auto !important;
          bottom:
            calc(
              10.25rem +
              env(safe-area-inset-bottom)
            ) !important;

          width: 3.25rem !important;
          min-width: 3.25rem !important;
          height: 3.25rem !important;
          min-height: 3.25rem !important;

          padding: 0 !important;
          border-radius: 1rem !important;
          z-index: 83 !important;
        }

        body:has(button[aria-label="Spremi postavke"])
          button.fixed.z-\[84\] {
          left: auto !important;
          right: 0.75rem !important;
          bottom:
            calc(
              10.25rem +
              env(safe-area-inset-bottom)
            ) !important;

          min-height: 3.25rem !important;
          max-width: 9.75rem !important;
          padding-left: 0.85rem !important;
          padding-right: 0.85rem !important;

          border-radius: 1rem !important;
          z-index: 84 !important;
        }

        /*
         * WORK ORDER EDIT MODE
         *
         * Na uređivanju radnog naloga korisniku treba samo jedna
         * jasna primarna akcija: "Spremi izmjene". Globalna donja
         * navigacija i veliki + gumb tada su suvišni i stvarali su
         * dva naslagana fiksna reda.
         */
        body:has(#mobile-edit-work-order-form)
          nav.fixed.inset-x-0.bottom-0 {
          display: none !important;
        }

        body:has(#mobile-edit-work-order-form)
          div.fixed:has(
            > button[form="mobile-edit-work-order-form"]
          ) {
          bottom: 0 !important;
          padding-bottom:
            max(
              0.75rem,
              env(safe-area-inset-bottom)
            ) !important;
          z-index: 70 !important;
        }

        body:has(#mobile-edit-work-order-form)
          main {
          padding-bottom:
            calc(
              5.75rem +
              env(safe-area-inset-bottom)
            ) !important;
        }
      }
    `}</style>
  )
}
