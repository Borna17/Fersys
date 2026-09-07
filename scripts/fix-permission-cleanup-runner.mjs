import fs from 'node:fs'

const path = 'scripts/apply-permission-cleanup.mjs'
let source = fs.readFileSync(path, 'utf8')
const oldText = "const re = new RegExp(`(export async function ${functionName}\\\\s*\\\\([\\\\s\\\\S]*?\\\\)\\\\s*(?::\\\\s*Promise<[^>]+>)?\\\\s*\\\\{)` )"

// Replace the matcher more defensively without depending on exact whitespace.
source = source.replace(
  /const re = new RegExp\(`\(export async function \$\{functionName\}.*?`\)\n/,
  "const re = new RegExp(`(export async function ${functionName}(?:\\\\s*<[^>{}]+>)?\\\\s*\\\\([\\\\s\\\\S]*?\\\\)\\\\s*(?::\\\\s*Promise<[^>]+>)?\\\\s*\\\\{)`)\n",
)

fs.writeFileSync(path, source)
console.log('Permission cleanup runner matcher fixed.')
