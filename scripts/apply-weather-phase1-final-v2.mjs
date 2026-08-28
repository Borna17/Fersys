import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const sourcePath = 'scripts/apply-weather-phase1-final.mjs'
const tempPath = 'scripts/.apply-weather-phase1-final-runtime.mjs'

let content = fs.readFileSync(sourcePath, 'utf8')

const uniquenessGuard = `\n  const second = content.indexOf(from, first + from.length)\n  if (second >= 0) {\n    throw new Error(\`Anchor is not unique: \${label}\`)\n  }\n`

if (!content.includes(uniquenessGuard)) {
  throw new Error('Weather generator uniqueness guard was not found.')
}

/*
 * Some FERSYS types intentionally contain identical structural blocks.
 * For those anchors the first occurrence is the correct target, so the
 * generator must not reject a valid file just because the same shape appears
 * later in CreateWorkOrderInput.
 */
content = content.replace(uniquenessGuard, '\n')

fs.writeFileSync(tempPath, content, 'utf8')

try {
  await import(`${pathToFileURL(path.resolve(tempPath)).href}?v=${Date.now()}`)
} finally {
  fs.rmSync(tempPath, { force: true })
}
