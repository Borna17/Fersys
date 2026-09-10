from pathlib import Path

service = Path('src/services/workOrders.service.ts')
text = service.read_text(encoding='utf-8')

old = """export async function getWorkOrderById(\n  workOrderId: string,\n): Promise<CloudWorkOrder | null> {\n  const { data, error } = await supabase.rpc(\n    'get_secure_work_order_by_id',\n    {\n      requested_work_order_id:\n        workOrderId,\n    },\n  )\n\n  if (error) {\n    throw error\n  }\n\n  const row = Array.isArray(data)\n    ? data[0]\n    : data\n\n  if (!row) {\n    workOrderVersionById.delete(\n      workOrderId,\n    )\n    return null\n  }\n\n  const order =\n    mapWorkOrder(\n      row as WorkOrderRow,\n    )\n\n  const hydratedImages =\n    await getWorkOrderImagesForDisplay(\n      workOrderId,\n    )\n\n  const hydratedOrder: CloudWorkOrder = {\n    ...order,\n    images: hydratedImages,\n  }\n\n  workOrderVersionById.set(\n    workOrderId,\n    hydratedOrder.updatedAt,\n  )\n\n  return hydratedOrder\n}\n"""

new = """async function getWorkOrderMetadataById(\n  workOrderId: string,\n): Promise<CloudWorkOrder | null> {\n  const { data, error } = await supabase.rpc(\n    'get_secure_work_order_by_id',\n    {\n      requested_work_order_id:\n        workOrderId,\n    },\n  )\n\n  if (error) {\n    throw error\n  }\n\n  const row = Array.isArray(data)\n    ? data[0]\n    : data\n\n  if (!row) {\n    return null\n  }\n\n  return mapWorkOrder(\n    row as WorkOrderRow,\n  )\n}\n\nexport async function getWorkOrderById(\n  workOrderId: string,\n): Promise<CloudWorkOrder | null> {\n  const order =\n    await getWorkOrderMetadataById(\n      workOrderId,\n    )\n\n  if (!order) {\n    workOrderVersionById.delete(\n      workOrderId,\n    )\n    return null\n  }\n\n  const hydratedImages =\n    await getWorkOrderImagesForDisplay(\n      workOrderId,\n    )\n\n  const hydratedOrder: CloudWorkOrder = {\n    ...order,\n    images: hydratedImages,\n  }\n\n  workOrderVersionById.set(\n    workOrderId,\n    hydratedOrder.updatedAt,\n  )\n\n  return hydratedOrder\n}\n"""

if old not in text:
    raise SystemExit('Expected getWorkOrderById block not found')
text = text.replace(old, new, 1)

old = """  const existing =\n    await getWorkOrderById(workOrderId)\n"""
new = """  // Za spremanje trebamo samo metapodatke. Ne preuzimamo ponovno sve\n  // fotografije iz Storagea jer bi veliki nalog nepotrebno čekao 12+ downloada.\n  const existing =\n    await getWorkOrderMetadataById(workOrderId)\n"""
if old not in text:
    raise SystemExit('Expected update existing lookup not found')
text = text.replace(old, new, 1)

old = """        ...createDatabasePayload(\n          completeInput,\n        ),\n"""
new = """        ...createDatabasePayload({\n          ...completeInput,\n          // Fotografije se čuvaju u Storage/customer_photos, ne kao Base64 u\n          // work_orders JSONB. Time update ostaje malen i pouzdan i s 12 slika.\n          images: [],\n        }),\n"""
if old not in text:
    raise SystemExit('Expected update payload not found')
text = text.replace(old, new, 1)
service.write_text(text, encoding='utf-8')

page = Path('src/pages/EditWorkOrderPage.tsx')
text = page.read_text(encoding='utf-8')
old = """      if (images.length > 0) {\n        /*\n         * UreÄ‘ivanje naloga ne smije Äekati upload fotografija u galeriju.\n         * Sam nalog je veÄ‡ spremljen; galerija se sinkronizira u pozadini.\n         */\n        void syncWorkOrderImagesToCustomerGallery({\n          workOrderId:\n            saved.id,\n          orderNumber:\n            saved.orderNumber,\n          customerId,\n          workDate: date,\n          title:\n            title.trim(),\n          images,\n        }).catch((galleryError) => {\n          console.warn(\n            '[FERSYS] Pozadinska sinkronizacija fotografija ureÄ‘enog radnog naloga nije uspjela; realtime sinkronizacija Ä‡e pokuÅ¡ati ponovno:',\n            galleryError,\n          )\n        })\n      }\n\n      saveSucceededRef.current = true\n"""
new = """      if (images.length > 0) {\n        /*\n         * Metapodaci naloga su već spremljeni malim zahtjevom. Fotografije\n         * zatim sinkroniziramo odvojeno u Storage. Postojeće slike se samo\n         * provjere po ID-u, a šalju se isključivo nove. Nacrt se ne briše dok\n         * ovaj korak ne završi, tako da nova fotografija ne može nestati ako\n         * mobilna veza pukne usred uploada.\n         */\n        try {\n          await syncWorkOrderImagesToCustomerGallery({\n            workOrderId: saved.id,\n            orderNumber: saved.orderNumber,\n            customerId,\n            workDate: date,\n            title: title.trim(),\n            images,\n          })\n        } catch (galleryError) {\n          console.warn(\n            '[FERSYS] Radni nalog je spremljen, ali sinkronizacija fotografija nije završila:',\n            galleryError,\n          )\n          alert(\n            'Podaci radnog naloga su spremljeni, ali jedna ili više fotografija još nisu prenesene. Nacrt je sačuvan pa pokušajte ponovno kada veza bude stabilna.',\n          )\n          return\n        }\n      }\n\n      saveSucceededRef.current = true\n"""
if old not in text:
    # source may be decoded correctly instead of mojibake; use structural boundaries
    start = text.find('      if (images.length > 0) {', text.find('const saved = await updateWorkOrder'))
    end = text.find('      saveSucceededRef.current = true', start)
    if start < 0 or end < 0:
        raise SystemExit('Expected photo sync block not found')
    text = text[:start] + new[:-len('      saveSucceededRef.current = true\n')] + text[end:]
else:
    text = text.replace(old, new, 1)
page.write_text(text, encoding='utf-8')

print('Applied work order save/speed fix.')
