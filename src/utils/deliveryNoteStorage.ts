import {
  adjustInventoryQuantity,
  createInventoryItem,
  getInventoryItems,
  type InventoryItem,
  type InventoryUnit,
} from './inventoryStorage'

export type DeliveryNoteStatus =
  | 'draft'
  | 'scanned'
  | 'reviewed'
  | 'posted'
  | 'cancelled'

export type DeliveryNoteLineAction =
  | 'existing'
  | 'new'

export type DeliveryNoteLine = {
  id: string
  sourceCode: string
  sourceBarcode: string
  name: string
  description: string
  quantity: number
  unit: InventoryUnit
  purchasePrice: number
  vatRate: number

  action: DeliveryNoteLineAction
  matchedInventoryItemId: string
  matchConfidence: number

  postedInventoryItemId: string
  createdNewItem: boolean
}

export type DeliveryNote = {
  id: string
  number: string
  supplierName: string
  supplierOib: string
  deliveryDate: string
  receivedBy: string
  note: string
  status: DeliveryNoteStatus

  lines: DeliveryNoteLine[]
  scannedPages: number

  createdAt: string
  updatedAt: string
  postedAt: string
}

export type ScannedDeliveryNote = {
  supplierName: string
  supplierOib: string
  number: string
  deliveryDate: string
  note: string
  lines: Array<{
    sourceCode: string
    sourceBarcode: string
    name: string
    description: string
    quantity: number
    unit: InventoryUnit
    purchasePrice: number
    vatRate: number
    confidence: number
  }>
  warnings: string[]
  confidence: number
}

const STORAGE_KEY =
  'fersys_delivery_notes'

function makeId(
  prefix: string,
) {
  if (
    typeof crypto !==
      'undefined' &&
    crypto.randomUUID
  ) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 9)}`
}

function round(
  value: number,
) {
  return Math.round(
    (
      Number(value || 0) +
      Number.EPSILON
    ) *
      1000,
  ) / 1000
}

function readAll():
DeliveryNote[] {
  try {
    const raw =
      localStorage.getItem(
        STORAGE_KEY,
      )

    if (!raw) {
      return []
    }

    const parsed =
      JSON.parse(raw)

    return Array.isArray(parsed)
      ? parsed
      : []
  } catch {
    return []
  }
}

function writeAll(
  notes: DeliveryNote[],
) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(notes),
  )
}

export function getDeliveryNotes() {
  return readAll().sort(
    (a, b) =>
      new Date(
        b.updatedAt,
      ).getTime() -
      new Date(
        a.updatedAt,
      ).getTime(),
  )
}

export function saveDeliveryNote(
  note: DeliveryNote,
) {
  const notes = readAll()
  const existingIndex =
    notes.findIndex(
      (item) =>
        item.id ===
        note.id,
    )

  const next = {
    ...note,
    updatedAt:
      new Date().toISOString(),
  }

  if (
    existingIndex >= 0
  ) {
    notes[existingIndex] =
      next
  } else {
    notes.unshift(next)
  }

  writeAll(notes)

  return next
}

export function deleteDeliveryNote(
  id: string,
) {
  const note =
    readAll().find(
      (item) =>
        item.id === id,
    )

  if (
    note?.status ===
    'posted'
  ) {
    throw new Error(
      'Proknjižena otpremnica se ne može obrisati.',
    )
  }

  writeAll(
    readAll().filter(
      (item) =>
        item.id !== id,
    ),
  )
}

export function createBlankDeliveryNote():
DeliveryNote {
  const now =
    new Date().toISOString()

  return {
    id:
      makeId(
        'delivery-note',
      ),
    number: '',
    supplierName: '',
    supplierOib: '',
    deliveryDate:
      now.slice(0, 10),
    receivedBy: '',
    note: '',
    status: 'draft',
    lines: [],
    scannedPages: 0,
    createdAt: now,
    updatedAt: now,
    postedAt: '',
  }
}

function normalize(
  value: string,
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ' ',
    )
    .trim()
}

function tokens(
  value: string,
) {
  return new Set(
    normalize(value)
      .split(' ')
      .filter(
        (token) =>
          token.length >= 2,
      ),
  )
}

function tokenScore(
  left: string,
  right: string,
) {
  const a =
    tokens(left)
  const b =
    tokens(right)

  if (
    !a.size ||
    !b.size
  ) {
    return 0
  }

  let intersection = 0

  a.forEach(
    (token) => {
      if (
        b.has(token)
      ) {
        intersection += 1
      }
    },
  )

  return (
    intersection /
    Math.max(
      a.size,
      b.size,
    )
  )
}

export function findInventoryMatch(
  line: Pick<
    DeliveryNoteLine,
    | 'sourceCode'
    | 'sourceBarcode'
    | 'name'
  >,
  inventory =
    getInventoryItems(),
): {
  item:
    InventoryItem | null
  confidence: number
  reason: string
} {
  const barcode =
    line.sourceBarcode
      .trim()
      .toLowerCase()

  if (barcode) {
    const found =
      inventory.find(
        (item) =>
          item.barcode
            .trim()
            .toLowerCase() ===
          barcode,
      )

    if (found) {
      return {
        item: found,
        confidence: 1,
        reason:
          'Isti barkod',
      }
    }
  }

  const code =
    line.sourceCode
      .trim()
      .toLowerCase()

  if (code) {
    const found =
      inventory.find(
        (item) =>
          item.code
            .trim()
            .toLowerCase() ===
          code,
      )

    if (found) {
      return {
        item: found,
        confidence: 0.98,
        reason:
          'Ista šifra artikla',
      }
    }
  }

  const normalizedName =
    normalize(line.name)

  const exact =
    inventory.find(
      (item) =>
        normalize(
          item.name,
        ) ===
          normalizedName ||
        normalize(
          item.shortName,
        ) ===
          normalizedName ||
        item.alternativeNames.some(
          (name) =>
            normalize(name) ===
            normalizedName,
        ),
    )

  if (exact) {
    return {
      item: exact,
      confidence: 0.94,
      reason:
        'Isti naziv',
    }
  }

  let best:
    InventoryItem | null =
      null
  let bestScore = 0

  inventory.forEach(
    (item) => {
      const candidates = [
        item.name,
        item.shortName,
        ...item.alternativeNames,
      ]

      candidates.forEach(
        (candidate) => {
          const score =
            tokenScore(
              line.name,
              candidate,
            )

          if (
            score >
            bestScore
          ) {
            bestScore =
              score
            best = item
          }
        },
      )
    },
  )

  if (
    best &&
    bestScore >= 0.72
  ) {
    return {
      item: best,
      confidence:
        Math.min(
          0.9,
          bestScore,
        ),
      reason:
        'Vrlo sličan naziv',
    }
  }

  return {
    item: null,
    confidence: 0,
    reason:
      'Nema sigurnog podudaranja',
  }
}

export function deliveryNoteFromScan(
  scan:
    ScannedDeliveryNote,
  scannedPages: number,
) {
  const note =
    createBlankDeliveryNote()

  note.number =
    scan.number
  note.supplierName =
    scan.supplierName
  note.supplierOib =
    scan.supplierOib
  note.deliveryDate =
    scan.deliveryDate ||
    note.deliveryDate
  note.note =
    [
      scan.note,
      scan.warnings
        .length
        ? `AI upozorenja: ${scan.warnings.join(
            ' | ',
          )}`
        : '',
    ]
      .filter(Boolean)
      .join('\n')
  note.status =
    'scanned'
  note.scannedPages =
    scannedPages

  const inventory =
    getInventoryItems()

  note.lines =
    scan.lines.map(
      (line) => {
        const base:
          DeliveryNoteLine = {
          id:
            makeId(
              'delivery-line',
            ),
          sourceCode:
            line.sourceCode ||
            '',
          sourceBarcode:
            line.sourceBarcode ||
            '',
          name:
            line.name ||
            'Artikl',
          description:
            line.description ||
            '',
          quantity:
            Math.max(
              0,
              round(
                line.quantity,
              ),
            ),
          unit:
            line.unit ||
            'kom',
          purchasePrice:
            Math.max(
              0,
              Number(
                line.purchasePrice ||
                  0,
              ),
            ),
          vatRate:
            Math.max(
              0,
              Number(
                line.vatRate ||
                  0,
              ),
            ),
          action: 'new',
          matchedInventoryItemId:
            '',
          matchConfidence:
            line.confidence ||
            0,
          postedInventoryItemId:
            '',
          createdNewItem:
            false,
        }

        const match =
          findInventoryMatch(
            base,
            inventory,
          )

        if (
          match.item &&
          match.confidence >=
            0.72
        ) {
          base.action =
            'existing'
          base.matchedInventoryItemId =
            match.item.id
          base.matchConfidence =
            Math.max(
              base.matchConfidence,
              match.confidence,
            )
        }

        return base
      },
    )

  return note
}

export function addManualLine(
  note: DeliveryNote,
) {
  return {
    ...note,
    lines: [
      ...note.lines,
      {
        id:
          makeId(
            'delivery-line',
          ),
        sourceCode: '',
        sourceBarcode: '',
        name: '',
        description: '',
        quantity: 1,
        unit:
          'kom' as
            InventoryUnit,
        purchasePrice: 0,
        vatRate: 25,
        action:
          'new' as
            DeliveryNoteLineAction,
        matchedInventoryItemId:
          '',
        matchConfidence: 0,
        postedInventoryItemId:
          '',
        createdNewItem:
          false,
      },
    ],
  }
}

export type PostDeliveryResult = {
  note: DeliveryNote
  createdItems:
    InventoryItem[]
  updatedItems:
    InventoryItem[]
}

export function postDeliveryNote(
  note: DeliveryNote,
): PostDeliveryResult {
  if (
    note.status ===
    'posted'
  ) {
    throw new Error(
      'Otpremnica je već proknjižena.',
    )
  }

  if (
    !note.lines.length
  ) {
    throw new Error(
      'Otpremnica nema stavki.',
    )
  }

  const createdItems:
    InventoryItem[] = []
  const updatedItems:
    InventoryItem[] = []

  const postedLines =
    note.lines.map(
      (line) => {
        const quantity =
          Math.abs(
            round(
              line.quantity,
            ),
          )

        if (
          !line.name.trim() ||
          quantity <= 0
        ) {
          throw new Error(
            'Svaka stavka mora imati naziv i količinu veću od 0.',
          )
        }

        if (
          line.action ===
          'existing'
        ) {
          if (
            !line
              .matchedInventoryItemId
          ) {
            throw new Error(
              `Odaberi postojeći artikl za "${line.name}".`,
            )
          }

          const updated =
            adjustInventoryQuantity({
              itemId:
                line.matchedInventoryItemId,
              type: 'entry',
              quantity,
              employeeName:
                note.receivedBy ||
                'Otpremnica',
              note:
                `Ulaz po otpremnici ${note.number || note.id} · ${note.supplierName || 'Dobavljač'}`,
            })

          updatedItems.push(
            updated,
          )

          return {
            ...line,
            postedInventoryItemId:
              updated.id,
            createdNewItem:
              false,
          }
        }

        const created =
          createInventoryItem({
            name:
              line.name,
            shortName:
              line.name,
            code:
              line.sourceCode,
            barcode:
              line.sourceBarcode,
            supplier:
              note.supplierName,
            description:
              line.description,
            trackingType:
              line.unit ===
                'm'
                ? 'metres'
                : 'pieces',
            unit:
              line.unit,
            quantity,
            purchasePrice:
              line.purchasePrice,
            vatRate:
              line.vatRate ||
              25,
          })

        createdItems.push(
          created,
        )

        return {
          ...line,
          postedInventoryItemId:
            created.id,
          createdNewItem:
            true,
        }
      },
    )

  const posted:
    DeliveryNote = {
    ...note,
    status: 'posted',
    lines:
      postedLines,
    postedAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
  }

  saveDeliveryNote(posted)

  return {
    note: posted,
    createdItems,
    updatedItems,
  }
}
