import CroatianNavigationLabels from './components/CroatianNavigationLabels'
import {
  IncomingInvoicesCloudBridge,
} from './components/IncomingInvoicesCloudBridge'
import NotificationPermissionBridge from './components/NotificationPermissionBridge'
import {
  WorkOrderShareAction,
} from './components/WorkOrderShareAction'
import DeleteAccountPage from './pages/DeleteAccountPage'
import { AppRouter } from './router/AppRouter'

function App() {
  if (window.location.pathname === '/delete-account') {
    return <DeleteAccountPage />
  }

  return (
    <>
      <CroatianNavigationLabels />
      <IncomingInvoicesCloudBridge />
      <NotificationPermissionBridge />
      <AppRouter />
      <WorkOrderShareAction />
    </>
  )
}

export default App
