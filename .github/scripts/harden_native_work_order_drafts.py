from pathlib import Path

path = Path('src/pages/NewWorkOrderPage.tsx')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str) -> None:
    global text
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Expected source block not found: {old[:180]!r}')
    text = text.replace(old, new, 1)


replace_once(
    "const FINALIZED_DRAFT_KEY =\n  'fersys_finalized_work_order_draft_id'\n",
    "const FINALIZED_DRAFT_KEY =\n  'fersys_finalized_work_order_draft_id'\nconst EMERGENCY_DRAFT_KEY =\n  'fersys_emergency_new_work_order_v1'\n",
)

replace_once(
    """        if (finalizedOrderId) {\n          await deleteUserDraft('work-order', 'new')\n          localStorage.removeItem(FINALIZED_DRAFT_KEY)\n\n          if (!cancelled) setDraftReady(true)\n          return\n        }\n\n        const draft =\n          await loadUserDraft<any>(\n            'work-order',\n            'new',\n          )\n\n        if (\n          cancelled ||\n          !draft\n        ) {\n          return\n        }\n""",
    """        if (finalizedOrderId) {\n          await deleteUserDraft('work-order', 'new')\n          localStorage.removeItem(FINALIZED_DRAFT_KEY)\n          localStorage.removeItem(EMERGENCY_DRAFT_KEY)\n\n          if (!cancelled) setDraftReady(true)\n          return\n        }\n\n        let draft =\n          await loadUserDraft<any>(\n            'work-order',\n            'new',\n          )\n\n        try {\n          const emergencyRaw =\n            localStorage.getItem(EMERGENCY_DRAFT_KEY)\n\n          if (emergencyRaw) {\n            const emergency = JSON.parse(emergencyRaw) as {\n              payload?: Record<string, unknown>\n              updatedAt?: string\n            }\n\n            const emergencyUpdatedAt =\n              new Date(emergency.updatedAt ?? 0).getTime()\n            const regularUpdatedAt =\n              draft ? new Date(draft.updatedAt).getTime() : 0\n\n            if (\n              emergency.payload &&\n              emergencyUpdatedAt >= regularUpdatedAt\n            ) {\n              draft = {\n                draftType: 'work-order',\n                draftKey: 'new',\n                payload: emergency.payload,\n                updatedAt:\n                  emergency.updatedAt ?? new Date().toISOString(),\n                source: 'local',\n              }\n            }\n          }\n        } catch (emergencyError) {\n          console.warn(\n            '[FERSYS] Sigurnosni nacrt radnog naloga nije moguće pročitati:',\n            emergencyError,\n          )\n        }\n\n        if (\n          cancelled ||\n          !draft\n        ) {\n          return\n        }\n""",
)

replace_once(
    """    const hasContent =\n      Boolean(\n        customerId ||\n        title.trim() ||\n        description.trim() ||\n        materials.length ||\n        images.length ||\n        investorSignature,\n      )\n\n    if (!hasContent) {\n      return\n    }\n\n    const timer =\n      window.setTimeout(() => {\n""",
    """    const hasContent =\n      Boolean(\n        customerId ||\n        customerSearch.trim() ||\n        address.trim() ||\n        arrivalTime ||\n        departureTime ||\n        title.trim() ||\n        description.trim() ||\n        assignedWorkers.length ||\n        materials.length ||\n        images.length ||\n        investorName.trim() ||\n        investorSignature,\n      )\n\n    if (!hasContent) {\n      localStorage.removeItem(EMERGENCY_DRAFT_KEY)\n      return\n    }\n\n    const draftPayload = {\n      customerId,\n      customerName,\n      customerContactPerson,\n      customerPhone,\n      customerEmail,\n      customerOib,\n      address,\n      date,\n      arrivalTime,\n      departureTime,\n      status,\n      priority,\n      title,\n      description,\n      assignedWorkers,\n      materials,\n      labourPrice,\n      discountRate,\n      vatRate,\n      priceNote,\n      investorName,\n      investorSignature,\n      images,\n      selectedTemplateId,\n    }\n\n    // Native WebView može biti ugašen prije IndexedDB/cloud autosavea.\n    // Zato svaku promjenu odmah zapisujemo i sinkrono u localStorage.\n    try {\n      localStorage.setItem(\n        EMERGENCY_DRAFT_KEY,\n        JSON.stringify({\n          payload: draftPayload,\n          updatedAt: new Date().toISOString(),\n        }),\n      )\n    } catch (emergencyError) {\n      console.warn(\n        '[FERSYS] Sigurnosni lokalni nacrt nije moguće zapisati:',\n        emergencyError,\n      )\n    }\n\n    const timer =\n      window.setTimeout(() => {\n""",
)

replace_once(
    """              await saveUserDraft(\n                'work-order',\n                'new',\n                {\n                  customerId,\n                  customerName,\n                  customerContactPerson,\n                  customerPhone,\n                  customerEmail,\n                  customerOib,\n                  address,\n                  date,\n                  arrivalTime,\n                  departureTime,\n                  status,\n                  priority,\n                  title,\n                  description,\n                  assignedWorkers,\n                  materials,\n                  labourPrice,\n                  discountRate,\n                  vatRate,\n                  priceNote,\n                  investorName,\n                  investorSignature,\n                  images,\n                  selectedTemplateId,\n                },\n              )\n""",
    """              await saveUserDraft(\n                'work-order',\n                'new',\n                draftPayload,\n              )\n""",
)

replace_once(
    """      }, 1200)\n""",
    """      }, 350)\n""",
)

replace_once(
    """    await deleteUserDraft(\n      'work-order',\n      'new',\n    )\n\n    window.location.reload()\n""",
    """    await deleteUserDraft(\n      'work-order',\n      'new',\n    )\n    localStorage.removeItem(EMERGENCY_DRAFT_KEY)\n\n    window.location.reload()\n""",
)

replace_once(
    """        localStorage.removeItem(\n          FINALIZED_DRAFT_KEY,\n        )\n""",
    """        localStorage.removeItem(\n          FINALIZED_DRAFT_KEY,\n        )\n        localStorage.removeItem(\n          EMERGENCY_DRAFT_KEY,\n        )\n""",
)

path.write_text(text, encoding='utf-8')
print('Native work-order draft hardening applied.')
