import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'

import App from './App'
import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
import MobileNotificationBell from './components/MobileNotificationBell'
import './index.css'

const updateServiceWorker = registerSW({
  immediate: true,

  onRegisteredSW(_serviceWorkerUrl, registration) {
    if (!registration) {
      return
    }

    void registration.update()

    window.setInterval(
      () => {
        void registration.update()
      },
      60 * 60 * 1000,
    )
  },

  onNeedRefresh() {
    void updateServiceWorker(true)
  },

  onRegisterError(error) {
    console.error(
      'FERSYS PWA service worker nije registriran:',
      error,
    )
  },
})

createRoot(
  document.getElementById('root')!,
).render(
  <StrictMode>
    <BrowserRouter>
      <App />

      {/*
       * Globalni feedback za sva preuzimanja u FERSYS-u:
       * - animira gumb dok se datoteka priprema
       * - pokazuje "Preuzimanje je pokrenuto"
       * - na mobitelu i desktopu nudi "Otvori" kada je moguće
       */}
      <DownloadFeedbackCenter />

      {/*
       * Mobilno zvonce je globalno, ali se samo skriva
       * na login/register/admin stranicama i na desktopu.
       */}
      <MobileNotificationBell />
    </BrowserRouter>
  </StrictMode>,
)
