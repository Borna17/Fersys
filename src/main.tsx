import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'

import App from './App'
import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
import FirstStepsControlCenter from './components/FirstStepsControlCenter'
import FirstTenMinutes from './components/FirstTenMinutes'
import MobileNotificationBell from './components/MobileNotificationBell'
import VideoTutorialCenter from './components/VideoTutorialCenter'
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

      <DownloadFeedbackCenter />
      <MobileNotificationBell />

      {/*
       * Početni vodič na Dashboardu.
       */}
      <FirstTenMinutes />

      {/*
       * Kontrola vodiča:
       * - korisnik: /settings
       * - super admin: /admin/companies/:companyId
       */}
      <FirstStepsControlCenter />

      <VideoTutorialCenter />
    </BrowserRouter>
  </StrictMode>,
)
