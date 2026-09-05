from pathlib import Path

# Patch finalized work orders so successful database saves immediately stop being drafts.
path = Path('src/pages/NewWorkOrderPage.tsx')
text = path.read_text(encoding='utf-8')

old = """      localStorage.setItem(\n        FINALIZED_DRAFT_KEY,\n        createdOrder.id,\n      )\n\n      navigate(\n        `/work-orders/${createdOrder.id}`,\n      )\n"""
new = """      // Nalog je uspješno spremljen u bazu; od ovog trenutka više nije nacrt.\n      // Očisti lokalni/cloud nacrt i manifest odmah, prije navigacije, kako\n      // se spremljeni nalog ne bi prikazivao kao \"nedovršen\".\n      localStorage.setItem(\n        FINALIZED_DRAFT_KEY,\n        createdOrder.id,\n      )\n\n      try {\n        await deleteUserDraft(\n          'work-order',\n          'new',\n        )\n        localStorage.removeItem(\n          FINALIZED_DRAFT_KEY,\n        )\n      } catch (draftCleanupError) {\n        // Sam nalog je već spremljen; pomoćni marker ostaje kao sigurnosni\n        // fallback da se nacrt očisti pri idućem otvaranju novog naloga.\n        console.warn(\n          '[FERSYS] Radni nalog je spremljen, ali čišćenje nacrta nije uspjelo:',\n          draftCleanupError,\n        )\n      }\n\n      navigate(\n        `/work-orders/${createdOrder.id}`,\n      )\n"""

if old not in text:
    raise SystemExit('Expected work-order finalize block not found')

path.write_text(text.replace(old, new, 1), encoding='utf-8')
