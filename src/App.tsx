import DownloadFeedbackCenter from './components/DownloadFeedbackCenter'
import DeleteAccountPage from './pages/DeleteAccountPage'
import { AppRouter } from './router/AppRouter'

function App() {
  if (window.location.pathname === '/delete-account') {
    return <DeleteAccountPage />
  }

  return (
    <>
      <AppRouter />
      <DownloadFeedbackCenter />
    </>
  )
}

export default App
