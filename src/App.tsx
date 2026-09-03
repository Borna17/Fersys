import CroatianNavigationLabels from './components/CroatianNavigationLabels'
import EditWorkOrderDraftSafety from './components/EditWorkOrderDraftSafety'
import {
  IncomingInvoicesCloudBridge,
} from './components/IncomingInvoicesCloudBridge'
import WebPushForegroundListener from './components/WebPushForegroundListener'
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
      <EditWorkOrderDraftSafety />
      <IncomingInvoicesCloudBridge />
      <WebPushForegroundListener />
      <AppRouter />
      <WorkOrderShareAction />
    </>
  )
}

export default App
