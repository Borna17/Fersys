import fs from 'node:fs'
import path from 'node:path'

const root =
  process.cwd()

const assetsDir =
  path.join(
    root,
    'dist',
    'assets',
  )

const LIMIT_KB = 500

if (
  !fs.existsSync(
    assetsDir,
  )
) {
  console.error(
    'dist/assets ne postoji. Prvo pokreni npm run build.',
  )
  process.exit(1)
}

const files =
  fs.readdirSync(
    assetsDir,
  )

const scripts =
  files
    .filter(
      (file) =>
        file.endsWith(
          '.js',
        ),
    )
    .map(
      (file) => {
        const fullPath =
          path.join(
            assetsDir,
            file,
          )

        const bytes =
          fs.statSync(
            fullPath,
          ).size

        return {
          file,
          bytes,
          kb:
            bytes /
            1024,
        }
      },
    )
    .sort(
      (a, b) =>
        b.bytes -
        a.bytes,
    )

console.log('')
console.log(
  'FERSYS BUNDLE CHECK',
)
console.log(
  '===================',
)
console.log('')

for (
  const item of
    scripts.slice(
      0,
      12,
    )
) {
  const marker =
    item.kb >
    LIMIT_KB
      ? '✗'
      : '✓'

  console.log(
    `${marker} ${item.kb.toFixed(
      1,
    )} KB · ${item.file}`,
  )
}

const tooLarge =
  scripts.filter(
    (item) =>
      item.kb >
      LIMIT_KB,
  )

console.log('')

if (
  tooLarge.length
) {
  console.error(
    `${tooLarge.length} JS chunk(a) prelazi ${LIMIT_KB} KB.`,
  )

  process.exit(1)
}

console.log(
  `Svi JS chunkovi su ispod ${LIMIT_KB} KB.`,
)
