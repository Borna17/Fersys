export default function DeliveryNoteMobileLayoutFix() {
  return (
    <style>{`
      @media (max-width: 767px) {
        /*
         * Nova / uređivanje otpremnice:
         * akcije Spremi nacrt + Izdaj otpremnicu više nisu sticky/floating.
         * Ostaju normalno na kraju forme pa ne prekrivaju polja niti sadržaj.
         */
        div.sticky:has(svg.lucide-save):has(svg.lucide-send) {
          position: static !important;
          inset: auto !important;
          bottom: auto !important;
          z-index: auto !important;
          margin-top: 1.25rem !important;
          box-shadow: none !important;
          backdrop-filter: none !important;
        }
      }
    `}</style>
  )
}
