import fs from 'node:fs'

const path = 'src/services/drafts.service.ts'
let source = fs.readFileSync(path, 'utf8')

const oldFilter = `    drafts.filter(\n      (draft) =>\n        (\n          draft.companyId ===\n            identity.companyId ||\n          !draft.companyId\n        ) &&\n        (\n          draft.userId ===\n            identity.userId ||\n          !draft.userId\n        ) &&\n        (\n          !draft.syncState ||\n          draft.syncState ===\n            'pending'\n        ),\n    )`

const newFilter = `    drafts.filter(\n      (draft) =>\n        draft.companyId === identity.companyId &&\n        draft.userId === identity.userId &&\n        (\n          !draft.syncState ||\n          draft.syncState ===\n            'pending'\n        ),\n    )`

if (!source.includes(oldFilter)) {
  throw new Error('Expected legacy pending-draft identity filter was not found')
}

source = source.replace(oldFilter, newFilter)
fs.writeFileSync(path, source)
console.log('Strict company/user draft sync isolation applied')
