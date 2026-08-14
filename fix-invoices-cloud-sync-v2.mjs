import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const here = path.dirname(
  fileURLToPath(import.meta.url),
)
const stamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
const backupRoot =
  path.join(
    root,
    '.fersys-invoices-cloud-v2-backup',
    stamp,
  )

function load(rel) {
  const file =
    path.join(root, rel)

  if (!fs.existsSync(file)) {
    throw new Error(
      `Nedostaje ${rel}`,
    )
  }

  const original =
    fs.readFileSync(
      file,
      'utf8',
    )

  return {
    rel,
    file,
    eol:
      original.includes('\r\n')
        ? '\r\n'
        : '\n',
    text:
      original.replace(
        /\r\n/g,
        '\n',
      ),
  }
}

function save(state) {
  const backup =
    path.join(
      backupRoot,
      state.rel,
    )

  fs.mkdirSync(
    path.dirname(backup),
    { recursive: true },
  )

  fs.copyFileSync(
    state.file,
    backup,
  )

  fs.writeFileSync(
    state.file,
    state.eol === '\r\n'
      ? state.text.replace(
          /\n/g,
          '\r\n',
        )
      : state.text,
    'utf8',
  )

  console.log(
    `✓ ${state.rel}`,
  )
}

function replaceRequired(
  text,
  oldText,
  newText,
  label,
) {
  if (
    text.includes(
      newText,
    )
  ) {
    return text
  }

  if (
    !text.includes(
      oldText,
    )
  ) {
    throw new Error(
      `Nije pronađeno: ${label}`,
    )
  }

  return text.replace(
    oldText,
    newText,
  )
}

/* SERVICE */
const serviceTarget =
  path.join(
    root,
    'src/services/invoices.service.ts',
  )

if (
  fs.existsSync(
    serviceTarget,
  )
) {
  const serviceBackup =
    path.join(
      backupRoot,
      'src/services/invoices.service.ts',
    )

  fs.mkdirSync(
    path.dirname(
      serviceBackup,
    ),
    { recursive: true },
  )

  fs.copyFileSync(
    serviceTarget,
    serviceBackup,
  )
}

fs.copyFileSync(
  path.join(
    here,
    'invoices.service.ts',
  ),
  serviceTarget,
)

console.log(
  '✓ src/services/invoices.service.ts',
)

/* LIST PAGE */
const list =
  load(
    'src/pages/InvoicesPage.tsx',
  )

list.text =
  replaceRequired(
    list.text,
    `import { useMemo, useState } from 'react'`,
    `import { useEffect, useMemo, useState } from 'react'`,
    'InvoicesPage useEffect',
  )

list.text =
  replaceRequired(
    list.text,
    `import { downloadInvoicePdf } from '../utils/invoicePdf'`,
    `import { downloadInvoicePdf } from '../utils/invoicePdf'
import {
  deleteInvoice as deleteCloudInvoice,
  getInvoices as getCloudInvoices,
  importLocalInvoices,
  updateInvoice as updateCloudInvoice,
} from '../services/invoices.service'`,
    'InvoicesPage cloud imports',
  )

const stateBlock = `  const [
    invoices,
    setInvoices,
  ] =
    useState<Invoice[]>(
      readInvoices,
    )

  const [
    search,
    setSearch,
  ] =
    useState('')`

const stateWithCloud = `  const [
    invoices,
    setInvoices,
  ] =
    useState<Invoice[]>(
      readInvoices,
    )

  const [
    isCloudLoading,
    setIsCloudLoading,
  ] = useState(true)

  const [
    cloudError,
    setCloudError,
  ] = useState('')

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        setIsCloudLoading(true)
        setCloudError('')

        const localInvoices =
          readInvoices()

        // Prvo prenesi račune koji možda postoje samo
        // na ovom uređaju, zatim učitaj jedinstveni cloud popis.
        await importLocalInvoices(
          localInvoices,
        )

        const cloudInvoices =
          await getCloudInvoices<Invoice>()

        if (cancelled) {
          return
        }

        setInvoices(
          cloudInvoices,
        )

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(
            cloudInvoices,
          ),
        )
      } catch (error) {
        console.error(
          'Račune nije moguće sinkronizirati:',
          error,
        )

        if (!cancelled) {
          setCloudError(
            error instanceof Error
              ? error.message
              : 'Račune nije moguće učitati iz clouda.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsCloudLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const [
    search,
    setSearch,
  ] =
    useState('')`

list.text =
  replaceRequired(
    list.text,
    stateBlock,
    stateWithCloud,
    'InvoicesPage cloud load',
  )

/* Persist automatic overdue status to cloud too. */
const normalizeSave = `            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(
                updated,
              ),
            )
            setInvoices(
              updated,
            )`

const normalizeCloud = `            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(
                updated,
              ),
            )
            setInvoices(
              updated,
            )

            updated
              .filter(
                (invoice) =>
                  invoice.status ===
                  'Dospjelo',
              )
              .forEach(
                (invoice) => {
                  void updateCloudInvoice(
                    invoice,
                  ).catch(
                    console.error,
                  )
                },
              )`

list.text =
  replaceRequired(
    list.text,
    normalizeSave,
    normalizeCloud,
    'overdue cloud update',
  )

/* Mark paid */
const markPaid = `    save(updated)
    setSelectedInvoiceId(
      null,
    )
  }

  function removeInvoice(`

const markPaidCloud = `    save(updated)

    const paidInvoice =
      updated.find(
        (current) =>
          current.id ===
          invoice.id,
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

  function removeInvoice(`

list.text =
  replaceRequired(
    list.text,
    markPaid,
    markPaidCloud,
    'paid cloud',
  )

/* Delete */
const deleteBlock = `    save(
      invoices.filter(
        (current) =>
          current.id !==
          invoice.id,
      ),
    )

    setSelectedInvoiceId(`

const deleteCloud = `    save(
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

    setSelectedInvoiceId(`

list.text =
  replaceRequired(
    list.text,
    deleteBlock,
    deleteCloud,
    'delete cloud',
  )

/* Visible sync error/loading */
const sectionStart = `  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-10 sm:space-y-6">`

const sectionStartCloud = `  return (
    <section className="mx-auto w-full max-w-[1600px] space-y-4 pb-10 sm:space-y-6">
      {cloudError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
          Cloud sinkronizacija računa: {cloudError}
        </div>
      )}

      {isCloudLoading && (
        <div className="rounded-2xl border border-violet-500/15 bg-violet-500/10 px-4 py-3 text-sm font-bold text-violet-200">
          Sinkronizacija računa...
        </div>
      )}`

list.text =
  replaceRequired(
    list.text,
    sectionStart,
    sectionStartCloud,
    'cloud feedback',
  )

save(list)

/* NEW / EDIT PAGE */
const page =
  load(
    'src/pages/NewInvoicePage.tsx',
  )

page.text =
  replaceRequired(
    page.text,
    `import { downloadInvoicePdf } from '../utils/invoicePdf'`,
    `import { downloadInvoicePdf } from '../utils/invoicePdf'
import {
  createInvoice as createCloudInvoice,
  getInvoices as getCloudInvoices,
  updateInvoice as updateCloudInvoice,
} from '../services/invoices.service'`,
    'NewInvoicePage cloud imports',
  )

page.text =
  replaceRequired(
    page.text,
    `  function save(status: InvoiceStatus) {`,
    `  async function save(status: InvoiceStatus) {`,
    'async invoice save',
  )

const localSave = `    const savedInvoice = buildInvoice(status)
    const current = readInvoices()

    const updated = isEditing
      ? current.map((invoice) =>
          invoice.id === savedInvoice.id
            ? savedInvoice
            : invoice,
        )
      : [savedInvoice, ...current]

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))`

const cloudSave = `    const savedInvoice = buildInvoice(status)

    try {
      const cloudInvoice =
        isEditing
          ? await updateCloudInvoice(
              savedInvoice,
            )
          : await createCloudInvoice(
              savedInvoice,
            )

      const cloudInvoices =
        await getCloudInvoices<Invoice>()

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          cloudInvoices,
        ),
      )

      savedInvoice.id =
        cloudInvoice.id
    } catch (error) {
      console.error(
        'Račun nije spremljen u cloud:',
        error,
      )

      setErrors(
        (current) => ({
          ...current,
          cloud:
            error instanceof Error
              ? error.message
              : 'Račun nije moguće spremiti u cloud.',
        }),
      )

      setSaveMessage(
        'Račun NIJE spremljen. Provjeri cloud vezu i pokušaj ponovno.',
      )

      return
    }`

page.text =
  replaceRequired(
    page.text,
    localSave,
    cloudSave,
    'cloud invoice save',
  )

page.text =
  page.text.replaceAll(
    `onClick={() => save('Nacrt')}`,
    `onClick={() => void save('Nacrt')}`,
  )

page.text =
  page.text.replaceAll(
    `onClick={() => save('Izdano')}`,
    `onClick={() => void save('Izdano')}`,
  )

save(page)

console.log('')
console.log('✓ V2 cloud sync stvarno je ugrađen u InvoicesPage i NewInvoicePage.')
console.log('✓ Stari lokalni račun na mobitelu pokušat će se importirati pri otvaranju Računa.')
console.log('✓ Nakon toga računalo čita isti cloud popis.')
console.log('Sada pokreni: npm run build')
