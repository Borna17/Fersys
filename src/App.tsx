import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
import DraftSyncManager from './components/DraftSyncManager'
import DeleteAccountPage from './pages/DeleteAccountPage'
import { AppRouter } from './router/AppRouter'

function App() {
  if (window.location.pathname === '/delete-account') {
    return <DeleteAccountPage />
  }

  return (
    <>
      <DraftSyncManager />
      <AppRouter />
      <DownloadFeedbackCenter />
    </>
  )
}

export default App
