import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'

import App from './App'
import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
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

      {/*
       * Globalni feedback za sva preuzimanja u FERSYS-u.
       */}
      <DownloadFeedbackCenter />

      {/*
       * Globalno mobilno zvonce.
       */}
      <MobileNotificationBell />

      {/*
       * FERSYS First 10 Minutes.
       * Na Dashboardu automatski vodi novog korisnika kroz prve korake.
       */}
      <FirstTenMinutes />

      {/*
       * Kontekstualni Video pomoć gumb + centralna biblioteka tutorijala.
       * Sam prepoznaje trenutnu rutu i nudi odgovarajući video.
       */}
      <VideoTutorialCenter />
    </BrowserRouter>
  </StrictMode>,
)
