import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, code) {
  fs.writeFileSync(path, code)
}

function replaceOrThrow(
  code,
  search,
  replacement,
  label,
) {
  if (!code.includes(search)) {
    throw new Error(
      `Nije pronađen dio za izmjenu: ${label}`,
    )
  }

  return code.replace(
    search,
    replacement,
  )
}

function patchInventoryPage() {
  const path =
    'src/pages/InventoryPage.tsx'

  let code =
    read(path)

  code =
    code.replace(
      "../utils/inventoryStorage",
      "../services/inventory.service",
    )

  if (
    !code.includes(
      'migrateLocalInventoryToSupabase',
    )
  ) {
    code =
      code.replace(
        '  getInventoryLocations,\n',
        '  getInventoryLocations,\n  migrateLocalInventoryToSupabase,\n',
      )
  }

  const oldBlock = `  function loadInventoryData() {
    setItems(getInventoryItems())
    setLocations(getInventoryLocations())
  }`

  const newBlock = `  async function loadInventoryData() {
    await migrateLocalInventoryToSupabase()

    const [
      savedItems,
      savedLocations,
    ] = await Promise.all([
      getInventoryItems(),
      getInventoryLocations(),
    ])

    setItems(savedItems)
    setLocations(savedLocations)
  }`

  code =
    replaceOrThrow(
      code,
      oldBlock,
      newBlock,
      'InventoryPage loadInventoryData',
    )

  code =
    code.replace(
      '    loadInventoryData()\n',
      '    void loadInventoryData()\n',
    )

  code =
    code.replaceAll(
      '        loadInventoryData()\n',
      '        void loadInventoryData()\n',
    )

  write(path, code)
}

function patchNewInventoryItemPage() {
  const path =
    'src/pages/NewInventoryItemPage.tsx'

  let code =
    read(path)

  code =
    code.replace(
      "../utils/inventoryStorage",
      "../services/inventory.service",
    )

  const start =
    code.indexOf(
      '  useEffect(() => {\n    const savedLocations = getInventoryLocations()',
    )

  const endMarker =
    '  }, [id])'

  const end =
    start === -1
      ? -1
      : code.indexOf(
          endMarker,
          start,
        )

  if (
    start === -1 ||
    end === -1
  ) {
    throw new Error(
      'NewInventoryItemPage početni useEffect nije pronađen.',
    )
  }

  const newEffect = `  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [
          savedLocations,
          existingItem,
        ] = await Promise.all([
          getInventoryLocations(),
          id
            ? getInventoryItemById(id)
            : Promise.resolve(null),
        ])

        if (cancelled) {
          return
        }

        setLocations(savedLocations)

        if (!id) {
          setLocationQuantities(
            savedLocations.map((location) => ({
              locationId: location.id,
              locationName: location.name,
              quantity: '',
            })),
          )

          return
        }

        if (!existingItem) {
          setErrorMessage('Artikl nije pronađen.')
          return
        }

        setForm({
          name: existingItem.name,
          shortName: existingItem.shortName,
          alternativeNames:
            existingItem.alternativeNames.join(', '),

          code: existingItem.code,
          barcode: existingItem.barcode,

          category: existingItem.category,
          subcategory: existingItem.subcategory,

          manufacturer: existingItem.manufacturer,
          supplier: existingItem.supplier,

          description: existingItem.description,
          usageDescription:
            existingItem.usageDescription,
          warningNote: existingItem.warningNote,

          trackingType: existingItem.trackingType,
          unit: existingItem.unit,

          quantity: String(existingItem.quantity),
          minimumQuantity: String(
            existingItem.minimumQuantity,
          ),
          pieceLengthMetres: String(
            existingItem.pieceLengthMetres || '',
          ),

          diameter: existingItem.diameter,
          dimension: existingItem.dimension,

          purchasePrice: String(existingItem.purchasePrice),
          salePrice: String(existingItem.salePrice),
          vatRate: String(existingItem.vatRate),
        })

        setMainImage(existingItem.image)
        setAdditionalImages(existingItem.additionalImages)

        setLocationQuantities(
          savedLocations.map((location) => {
            const existingStock =
              existingItem.locationStocks.find(
                (stock) =>
                  stock.locationId === location.id,
              )

            return {
              locationId: location.id,
              locationName: location.name,
              quantity: existingStock
                ? String(existingStock.quantity)
                : '',
            }
          }),
        )
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Skladište nije moguće učitati.',
          )
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id])`

  code =
    code.slice(
      0,
      start,
    ) +
    newEffect +
    code.slice(
      end +
        endMarker.length,
    )

  code =
    replaceOrThrow(
      code,
      '  function handleSubmit(event: FormEvent) {',
      '  async function handleSubmit(event: FormEvent) {',
      'NewInventoryItemPage handleSubmit async',
    )

  code =
    code.replace(
      '        const updatedItem = updateInventoryItem(\n',
      '        const updatedItem = await updateInventoryItem(\n',
    )

  code =
    code.replace(
      '        const createdItem =\n          createInventoryItem(itemInput)',
      '        const createdItem =\n          await createInventoryItem(itemInput)',
    )

  write(path, code)
}

function patchInventoryDetailsPage() {
  const path =
    'src/pages/InventoryItemDetailsPage.tsx'

  let code =
    read(path)

  code =
    code.replace(
      "../utils/inventoryStorage",
      "../services/inventory.service",
    )

  code =
    replaceOrThrow(
      code,
      '  function loadItemData() {',
      '  async function loadItemData() {',
      'Inventory details load async',
    )

  code =
    code.replace(
      '    const savedItem = getInventoryItemById(id)',
      '    const savedItem = await getInventoryItemById(id)',
    )

  code =
    code.replace(
      `    setMovements(
      getInventoryMovementsByItemId(id),
    )`,
      `    setMovements(
      await getInventoryMovementsByItemId(id),
    )`,
    )

  const oldEffect = `  useEffect(() => {
    setLocations(getInventoryLocations())
    loadItemData()
  }, [id])`

  const newEffect = `  useEffect(() => {
    void (async () => {
      try {
        const savedLocations =
          await getInventoryLocations()

        setLocations(savedLocations)
        await loadItemData()
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Artikl nije moguće učitati.',
        )
      }
    })()
  }, [id])`

  code =
    replaceOrThrow(
      code,
      oldEffect,
      newEffect,
      'Inventory details initial effect',
    )

  code =
    replaceOrThrow(
      code,
      `  function handleMovementSubmit(
    event: FormEvent,
  ) {`,
      `  async function handleMovementSubmit(
    event: FormEvent,
  ) {`,
      'Inventory movement submit async',
    )

  code =
    code.replace(
      '      adjustInventoryQuantity({',
      '      await adjustInventoryQuantity({',
    )

  code =
    code.replace(
      '      loadItemData()\n',
      '      await loadItemData()\n',
    )

  code =
    replaceOrThrow(
      code,
      '  function handleDeleteItem() {',
      '  async function handleDeleteItem() {',
      'Inventory delete async',
    )

  code =
    code.replace(
      '      deleteInventoryItem(item.id)',
      '      await deleteInventoryItem(item.id)',
    )

  write(path, code)
}

function patchInventoryMovementsPage() {
  const path =
    'src/pages/InventoryMovementsPage.tsx'

  let code =
    read(path)

  code =
    code.replace(
      "../utils/inventoryStorage",
      "../services/inventory.service",
    )

  const oldBlock = `  function loadMovements() {
    const savedItems = getInventoryItems()

    const allMovements = savedItems.flatMap((item) =>
      getInventoryMovementsByItemId(item.id).map(
        (movement) => ({
          movement,
          item,
        }),
      ),
    )

    allMovements.sort((first, second) => {
      return (
        new Date(second.movement.createdAt).getTime() -
        new Date(first.movement.createdAt).getTime()
      )
    })

    setItems(savedItems)
    setMovements(allMovements)
  }`

  const newBlock = `  async function loadMovements() {
    const savedItems =
      await getInventoryItems()

    const movementGroups =
      await Promise.all(
        savedItems.map(
          async (item) => {
            const itemMovements =
              await getInventoryMovementsByItemId(
                item.id,
              )

            return itemMovements.map(
              (movement) => ({
                movement,
                item,
              }),
            )
          },
        ),
      )

    const allMovements =
      movementGroups.flat()

    allMovements.sort((first, second) => {
      return (
        new Date(second.movement.createdAt).getTime() -
        new Date(first.movement.createdAt).getTime()
      )
    })

    setItems(savedItems)
    setMovements(allMovements)
  }`

  code =
    replaceOrThrow(
      code,
      oldBlock,
      newBlock,
      'InventoryMovements load',
    )

  code =
    code.replace(
      '    loadMovements()\n',
      '    void loadMovements()\n',
    )

  code =
    code.replaceAll(
      '        loadMovements()\n',
      '        void loadMovements()\n',
    )

  write(path, code)
}

function patchInventoryScannerPage() {
  const path =
    'src/pages/InventoryQrScannerPage.tsx'

  let code =
    read(path)

  code =
    code.replace(
      "../utils/inventoryStorage",
      "../services/inventory.service",
    )

  code =
    replaceOrThrow(
      code,
      `function findInventoryItem(
  scannedValue: string,
): InventoryItem | undefined {`,
      `function findInventoryItem(
  scannedValue: string,
  items: InventoryItem[],
): InventoryItem | undefined {`,
      'Scanner finder signature',
    )

  code =
    replaceOrThrow(
      code,
      `  const items = getInventoryItems()

  return items.find((item) => {`,
      `  return items.find((item) => {`,
      'Scanner remove sync get',
    )

  const navigateLine =
    `  const navigate = useNavigate()
`

  if (
    !code.includes(
      'const [inventoryItems, setInventoryItems]',
    )
  ) {
    code =
      replaceOrThrow(
        code,
        navigateLine,
        `${navigateLine}
  const [
    inventoryItems,
    setInventoryItems,
  ] = useState<InventoryItem[]>([])

  useEffect(() => {
    void (async () => {
      try {
        setInventoryItems(
          await getInventoryItems(),
        )
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Skladište nije moguće učitati.',
        )
      }
    })()
  }, [])
`,
        'Scanner inventory state',
      )
  }

  code =
    code.replaceAll(
      'findInventoryItem(trimmedValue)',
      'findInventoryItem(trimmedValue, inventoryItems)',
    )

  write(path, code)
}

function patchMissionCenter() {
  const path =
    'src/services/missionCenter.service.ts'

  let code =
    read(path)

  code =
    code.replace(
      `import {
  getInventoryItems,
} from '../utils/inventoryStorage'

`,
      '',
    )

  const oldBlock = `export async function getInventoryItemCount() {
  /*
   * Skladište trenutno koristi
   * inventoryStorage/localStorage,
   * zato Mission Center mora
   * provjeravati isti izvor.
   */
  try {
    const items =
      getInventoryItems()

    return Array.isArray(
      items,
    )
      ? items.length
      : 0
  } catch (error) {
    console.error(
      'Mission Center inventory:',
      error,
    )

    return 0
  }
}`

  const newBlock = `export async function getInventoryItemCount() {
  const {
    count,
    error,
  } =
    await supabase
      .from(
        'inventory_items',
      )
      .select(
        'id',
        {
          count: 'exact',
          head: true,
        },
      )

  if (error) {
    throw error
  }

  return count ?? 0
}`

  code =
    replaceOrThrow(
      code,
      oldBlock,
      newBlock,
      'Mission Center inventory count',
    )

  write(path, code)
}

patchInventoryPage()
patchNewInventoryItemPage()
patchInventoryDetailsPage()
patchInventoryMovementsPage()
patchInventoryScannerPage()
patchMissionCenter()

console.log(
  '✅ Skladište je povezano na Supabase servise.',
)
