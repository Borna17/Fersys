import CroatianNavigationLabels from './components/CroatianNavigationLabels'
import UniversalDraftProtection from './components/UniversalDraftProtection'
import {
  IncomingInvoicesCloudBridge,
} from './components/IncomingInvoicesCloudBridge'
import WebPushForegroundListener from './components/WebPushForegroundListener'
import WorkOrderEditQuantityTextFix from './components/WorkOrderEditQuantityTextFix'
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
      <UniversalDraftProtection />
      <IncomingInvoicesCloudBridge />
      <WebPushForegroundListener />
      <WorkOrderEditQuantityTextFix />
      <AppRouter />
      <WorkOrderShareAction />
    </>
  )
}

export default App