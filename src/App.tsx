import DeleteAccountPage from './pages/DeleteAccountPage'
import { AppRouter } from './router/AppRouter'

function App() {
  if (window.location.pathname === '/delete-account') {
    return <DeleteAccountPage />
  }

  return <AppRouter />
}

export default App
