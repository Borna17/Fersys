import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const here = path.dirname(fileURLToPath(import.meta.url))
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupRoot = path.join(root, '.fersys-invoice-cloud-backup', stamp)

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n')
}
function write(rel, text) {
  const file = path.join(root, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text, 'utf8')
}
function backup(rel) {
  const src = path.join(root, rel)
  const dst = path.join(backupRoot, rel)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.copyFileSync(src, dst)
}
function replaceRequired(text, oldText, newText, label) {
  if (text.includes(newText)) return text
  if (!text.includes(oldText)) throw new Error(`Nije pronađeno: ${label}`)
  return text.replace(oldText, newText)
}

write(
  'src/services/invoices.service.ts',
  fs.readFileSync(path.join(here, 'invoices.service.ts'), 'utf8'),
)

// ---------- InvoicesPage ----------
const listRel = 'src/pages/InvoicesPage.tsx'
backup(listRel)
let list = read(listRel)

list = replaceRequired(
  list,
  "import { useMemo, useState } from 'react'",
  "import { useEffect, useMemo, useState } from 'react'",
  'React useEffect import',
)

list = replaceRequired(
  list,
  "import { downloadInvoicePdf } from '../utils/invoicePdf'",
  `import { downloadInvoicePdf } from '../utils/invoicePdf'
import {
  deleteInvoice as deleteCloudInvoice,
  getInvoices as getCloudInvoices,
  importLocalInvoices,
  updateInvoice as updateCloudInvoice,
} from '../services/invoices.service'`,
  'invoice cloud imports',
)

const searchAnchor = `  const [
    search,
    setSearch,
  ] =
    useState('')`

list = replaceRequired(
  list,
  searchAnchor,
  `  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const localInvoices = readInvoices()

        // Važno: prvo prenesi eventualne račune koji postoje samo
        // na ovom uređaju, a tek onda učitaj cloud.
        await importLocalInvoices(localInvoices)

        const cloudInvoices =
          await getCloudInvoices() as Invoice[]

        if (cancelled) return

        setInvoices(cloudInvoices)
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(cloudInvoices),
        )
      } catch (error) {
        console.error(
          'Račune nije moguće sinkronizirati:',
          error,
        )
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

${searchAnchor}`,
  'cloud invoice loader',
)

const markPaidNeedle = `    save(updated)
    setSelectedInvoiceId(
      null,
    )
  }

  function removeInvoice(`

list = replaceRequired(
  list,
  markPaidNeedle,
  `    save(updated)

    const paidInvoice =
      updated.find(
        (current) =>
          current.id === invoice.id,
      )

    if (paidInvoice) {
      void updateCloudInvoice(
        paidInvoice,
      ).catch((error) => {
        console.error(
          'Plaćanje nije spremljeno u cloud:',
          error,
        )
      })
    }

    setSelectedInvoiceId(
      null,
    )
  }

  function removeInvoice(`,
  'cloud mark paid',
)

const deleteNeedle = `    save(
      invoices.filter(
        (current) =>
          current.id !==
          invoice.id,
      ),
    )

    setSelectedInvoiceId(`

list = replaceRequired(
  list,
  deleteNeedle,
  `    save(
      invoices.filter(
        (current) =>
          current.id !==
          invoice.id,
      ),
    )

    void deleteCloudInvoice(
      invoice.id,
    ).catch((error) => {
      console.error(
        'Račun nije obrisan iz clouda:',
        error,
      )
    })

    setSelectedInvoiceId(`,
  'cloud delete',
)

write(listRel, list)

// ---------- NewInvoicePage ----------
const newRel = 'src/pages/NewInvoicePage.tsx'
backup(newRel)
let page = read(newRel)

page = replaceRequired(
  page,
  "import { downloadInvoicePdf } from '../utils/invoicePdf'",
  `import { downloadInvoicePdf } from '../utils/invoicePdf'
import {
  createInvoice as createCloudInvoice,
  getInvoices as getCloudInvoices,
  updateInvoice as updateCloudInvoice,
} from '../services/invoices.service'`,
  'new invoice cloud imports',
)

page = replaceRequired(
  page,
  '  function save(status: InvoiceStatus) {',
  '  async function save(status: InvoiceStatus) {',
  'async save',
)

const oldSave = `    const savedInvoice = buildInvoice(status)
    const current = readInvoices()

    const updated = isEditing
      ? current.map((invoice) =>
          invoice.id === savedInvoice.id
            ? savedInvoice
            : invoice,
        )
      : [savedInvoice, ...current]

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))`

const newSave = `    const savedInvoice = buildInvoice(status)

    try {
      const cloudInvoice = isEditing
        ? await updateCloudInvoice(savedInvoice)
        : await createCloudInvoice(savedInvoice)

      const cloudInvoices =
        await getCloudInvoices()

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(cloudInvoices),
      )

      savedInvoice.id =
        String(cloudInvoice.id)
    } catch (error) {
      console.error(
        'Račun nije spremljen u cloud:',
        error,
      )

      setErrors((current) => ({
        ...current,
        cloud:
          error instanceof Error
            ? error.message
            : 'Račun nije moguće spremiti u cloud.',
      }))

      setSaveMessage(
        'Račun NIJE spremljen. Provjeri vezu i pokušaj ponovno.',
      )
      return
    }`

page = replaceRequired(
  page,
  oldSave,
  newSave,
  'cloud save',
)

page = page.replaceAll(
  "onClick={() => save('Nacrt')}",
  "onClick={() => void save('Nacrt')}",
)
page = page.replaceAll(
  "onClick={() => save('Izdano')}",
  "onClick={() => void save('Izdano')}",
)

write(newRel, page)

console.log('✓ Izlazni računi prebačeni na cloud sync.')
console.log('✓ Postojeći lokalni račun bit će importiran pri otvaranju Računa.')
console.log('Sada pokreni: npm run build')
