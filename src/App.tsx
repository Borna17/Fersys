import CroatianNavigationLabels from './components/CroatianNavigationLabels'
import {
  IncomingInvoicesCloudBridge,
} from './components/IncomingInvoicesCloudBridge'
import {
  WorkOrderShareAction,
} from './components/WorkOrderShareAction'
import { AppRouter } from './router/AppRouter'

function App() {
  return (
    <>
      <CroatianNavigationLabels />
      <IncomingInvoicesCloudBridge />
      <AppRouter />
      <WorkOrderShareAction />
    </>
  )
}

export default App
