import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { registerSW } from 'virtual:pwa-register'

import App from './App'
import DocumentFlowOrchestrator from './components/DocumentFlowOrchestrator'
import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
import FirstStepsControlCenter from './components/FirstStepsControlCenter'
import FirstTenMinutes from './components/FirstTenMinutes'
import FloatingUiLayoutFix from './components/FloatingUiLayoutFix'
import GoogleCalendarOAuthBridge from './components/GoogleCalendarOAuthBridge'
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

      <FloatingUiLayoutFix />
      <DownloadFeedbackCenter />
      <MobileNotificationBell />
      <GoogleCalendarOAuthBridge />

      {/*
       * FERSYS Smart Document Flow
       * Globalno prepoznaje detalje ponude, radnog naloga,
       * otpremnice i računa te povezuje cijeli posao.
       */}
      <DocumentFlowOrchestrator />

      <FirstTenMinutes />
      <FirstStepsControlCenter />
      <VideoTutorialCenter />
    </BrowserRouter>
  </StrictMode>,
)
