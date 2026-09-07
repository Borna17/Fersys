import fs from 'node:fs'

const path = 'scripts/apply-permission-cleanup.mjs'
let source = fs.readFileSync(path, 'utf8')

// Generic service functions such as createInvoice<T>() need to be matched too.
source = source.replace(
  /const re = new RegExp\(`\(export async function \$\{functionName\}.*?`\)\n/,
  "const re = new RegExp(`(export async function ${functionName}(?:\\\\s*<[^>{}]+>)?\\\\s*\\\\([\\\\s\\\\S]*?\\\\)\\\\s*(?::\\\\s*Promise<[^>]+>)?\\\\s*\\\\{)`)\n",
)

// Do not mutate JSX start tags using the old generic button helper. It can
// mistake the > from arrow functions in JSX attributes for the tag ending.
// Handler-level checks plus route/service guards remain in place, and UI
// visibility can be refined safely with explicit component edits afterward.
source = source
  .split('\n')
  .filter((line) => !line.trim().startsWith('s = hideButtonsContaining('))
  .join('\n')

fs.writeFileSync(path, source)
console.log('Permission cleanup runner matcher and JSX safety fixed.')
