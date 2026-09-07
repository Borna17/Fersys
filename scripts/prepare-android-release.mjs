import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const root = process.cwd()
const EXPECTED_VERSION_CODE = 10
const EXPECTED_VERSION_NAME = '1.0.8'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...options,
  })

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')}`)
  }
}

function capture(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })

  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout || '').trim() || `Command failed: ${command}`)
  }

  return result.stdout.trim()
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

function walk(directory) {
  const output = []

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      output.push(...walk(absolute))
    } else {
      output.push(absolute)
    }
  }

  return output
}

function fail(message) {
  console.error(`\nANDROID RELEASE BLOCKED: ${message}\n`)
  process.exit(1)
}

console.log('\nFERSYS ANDROID FINAL RELEASE PREP')
console.log('=================================\n')

try {
  const branch = capture('git', ['branch', '--show-current'])
  if (branch !== 'main') {
    fail(`Build must run from main branch, current branch is "${branch || 'detached'}".`)
  }

  const dirty = capture('git', ['status', '--porcelain', '--untracked-files=no'])
  if (dirty) {
    fail('Tracked files have uncommitted changes. Commit or discard them before creating the Play release.')
  }

  console.log('[1/6] Fetching latest origin/main...')
  run('git', ['fetch', 'origin', 'main'])

  const head = capture('git', ['rev-parse', 'HEAD'])
  const originMain = capture('git', ['rev-parse', 'origin/main'])

  if (head !== originMain) {
    fail(`Local source is not identical to origin/main. Local ${head.slice(0, 8)}, origin/main ${originMain.slice(0, 8)}. Run git pull and retry.`)
  }

  const gradle = fs.readFileSync(path.join(root, 'android/app/build.gradle'), 'utf8')
  if (!gradle.includes(`versionCode ${EXPECTED_VERSION_CODE}`) || !gradle.includes(`versionName "${EXPECTED_VERSION_NAME}"`)) {
    fail(`android/app/build.gradle must be ${EXPECTED_VERSION_NAME} / versionCode ${EXPECTED_VERSION_CODE}.`)
  }

  const capacitor = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8')
  if (!capacitor.includes("webDir: 'dist'")) {
    fail("Capacitor webDir must remain 'dist'.")
  }

  console.log('[2/6] Building current React/Vite production source...')
  run('npm', ['run', 'build'])

  console.log('[3/6] Running Android-specific production QA...')
  run('node', ['scripts/android-release-check.mjs'])

  console.log('[4/6] Copying the exact dist bundle into Android...')
  run('npx', ['cap', 'sync', 'android'])

  const distRoot = path.join(root, 'dist')
  const androidRoot = path.join(root, 'android/app/src/main/assets/public')

  if (!fs.existsSync(distRoot) || !fs.existsSync(androidRoot)) {
    fail('dist or Android public assets directory is missing after Capacitor sync.')
  }

  console.log('[5/6] Byte-for-byte checking dist against Android assets...')
  const distFiles = walk(distRoot)
  const mismatches = []

  for (const distFile of distFiles) {
    const relative = path.relative(distRoot, distFile)
    const androidFile = path.join(androidRoot, relative)

    if (!fs.existsSync(androidFile)) {
      mismatches.push(`${relative} is missing from Android`)
      continue
    }

    if (sha256(distFile) !== sha256(androidFile)) {
      mismatches.push(`${relative} differs between dist and Android`)
    }
  }

  if (mismatches.length) {
    fail(`Capacitor asset parity failed:\n${mismatches.slice(0, 20).join('\n')}`)
  }

  const proof = {
    app: 'FERSYS',
    versionName: EXPECTED_VERSION_NAME,
    versionCode: EXPECTED_VERSION_CODE,
    gitCommit: head,
    generatedAt: new Date().toISOString(),
    verifiedFiles: distFiles.length,
    distIndexSha256: sha256(path.join(distRoot, 'index.html')),
  }

  fs.writeFileSync(
    path.join(androidRoot, 'fersys-release-proof.json'),
    JSON.stringify(proof, null, 2) + '\n',
    'utf8',
  )

  console.log('[6/6] Release proof written into Android bundle.')
  console.log(`\nREADY: FERSYS ${EXPECTED_VERSION_NAME} / code ${EXPECTED_VERSION_CODE}`)
  console.log(`SOURCE: ${head}`)
  console.log(`VERIFIED DIST FILES: ${distFiles.length}`)
  console.log('\nNow Gradle may create the AAB. If any parity check fails, no Play bundle should be uploaded.\n')
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
