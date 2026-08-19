export default function FloatingUiLayoutFix() {
  return (
    <style>{`
      /*
       * FERSYS FLOATING UI RAIL
       *
       * Desktop:
       * - Smart Flow ........ 44% viewport height
       * - Video pomoć ....... 54%
       * - Svi tutorijali .... 62%
       *
       * All collapsed controls occupy only ~44–48px at the extreme
       * right edge, so they no longer cover list actions, PDF buttons,
       * invoice/delivery-note actions or other bottom-right controls.
       *
       * Mobile keeps the original placement above the bottom navigation.
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
    `}</style>
  )
}
