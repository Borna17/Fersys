import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'

import App from './App'
import './index.css'

const updateServiceWorker = registerSW({
  immediate: true,

  onRegisteredSW(_serviceWorkerUrl, registration) {
    if (!registration) {
      return
    }

    // Odmah provjeri postoji li nova verzija.
    void registration.update()

    // Zatim provjeravaj novu verziju svakih 60 minuta
    // dok je aplikacija otvorena.
    window.setInterval(
      () => {
        void registration.update()
      },
      60 * 60 * 1000,
    )
  },

  onNeedRefresh() {
    // Aktivira novog service workera.
    // Parametar true zatvara staru verziju i primjenjuje novu.
    void updateServiceWorker(true)
  },

  onRegisterError(error) {
    console.error(
      'FERSYS PWA service worker nije registriran:',
      error,
    )
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)