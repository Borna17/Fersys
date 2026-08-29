import fs from 'node:fs'

// v1: preserve unrelated company profile_settings keys.
const path = 'src/services/companySettings.service.ts'
let source = fs.readFileSync(path, 'utf8')

const payloadBefore = `function createDatabasePayload(\n  input: UpdateCompanySettingsInput,\n) {`
const payloadAfter = `function createDatabasePayload(\n  input: UpdateCompanySettingsInput,\n  currentProfileSettings: Record<string, unknown> = {},\n) {`

if (!source.includes(payloadBefore)) {
  throw new Error('createDatabasePayload anchor not found')
}
source = source.replace(payloadBefore, payloadAfter)

const profileBefore = `    profile_settings:\n      input.profileSettings,`
const profileAfter = `    profile_settings: {\n      ...currentProfileSettings,\n      ...input.profileSettings,\n    },`

if (!source.includes(profileBefore)) {
  throw new Error('profile_settings payload anchor not found')
}
source = source.replace(profileBefore, profileAfter)

const updateBefore = `  const companyId =\n    await getCurrentCompanyId()\n\n  const { data, error } = await supabase\n    .from('companies')\n    .update(\n      createDatabasePayload(input),\n    )`

const updateAfter = `  const companyId =\n    await getCurrentCompanyId()\n\n  // profile_settings contains document appearance, work-order branding\n  // and other module preferences. General company settings must merge\n  // regional settings into that JSON instead of replacing the whole object.\n  const {\n    data: currentCompany,\n    error: currentCompanyError,\n  } = await supabase\n    .from('companies')\n    .select('profile_settings')\n    .eq('id', companyId)\n    .single()\n\n  if (currentCompanyError) {\n    throw currentCompanyError\n  }\n\n  const currentProfileSettings =\n    isObject(currentCompany?.profile_settings)\n      ? currentCompany.profile_settings\n      : {}\n\n  const { data, error } = await supabase\n    .from('companies')\n    .update(\n      createDatabasePayload(\n        input,\n        currentProfileSettings,\n      ),\n    )`

if (!source.includes(updateBefore)) {
  throw new Error('updateCompanySettings anchor not found')
}
source = source.replace(updateBefore, updateAfter)

fs.writeFileSync(path, source)
console.log('Fixed company profile_settings persistence without overwriting document presets.')
