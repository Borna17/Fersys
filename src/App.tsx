import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
import DraftSyncManager from './components/DraftSyncManager'
import ActivityTracker from './components/ActivityTracker'
import DeleteAccountPage from './pages/DeleteAccountPage'
import { AppRouter } from './router/AppRouter'

function App() {
  if (window.location.pathname === '/delete-account') {
    return <DeleteAccountPage />
  }

  return (
    <>
      <DraftSyncManager />
      <ActivityTracker />
      <AppRouter />
      <DownloadFeedbackCenter />
    </>
  )
}

export default App
