import fs from 'node:fs'

const path = 'src/router/AppRouter.tsx'
let source = fs.readFileSync(path, 'utf8')
source = source.replace(
  '<Route path="/invoices/:invoiceId/edit" element={<Guard permission="invoices.view" feature="invoices"><NewInvoicePage /></Guard>} />',
  '<Route path="/invoices/:invoiceId/edit" element={<Guard permission="invoices.manage" feature="invoices"><NewInvoicePage /></Guard>} />',
)
source = source.replace(
  '<Route path="/incoming-invoices/:incomingInvoiceId/edit" element={<Guard permission="incomingInvoices.view" feature="incoming_invoices"><NewIncomingInvoicePage /></Guard>} />',
  '<Route path="/incoming-invoices/:incomingInvoiceId/edit" element={<Guard permission="incomingInvoices.manage" feature="incoming_invoices"><NewIncomingInvoicePage /></Guard>} />',
)
fs.writeFileSync(path, source)
console.log('Invoice edit route permissions fixed.')
