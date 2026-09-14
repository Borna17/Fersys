import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

execFileSync('npx', ['cap', 'sync', 'ios'], { stdio: 'inherit', shell: process.platform === 'win32' })

const candidates = [
  path.join('ios', 'App', 'App', 'Info.plist'),
  path.join('ios', 'App', 'Info.plist'),
]
const plistPath = candidates.find((candidate) => fs.existsSync(candidate))
if (!plistPath) {
  console.warn('[FERSYS] Info.plist nije pronađen. Otvori iOS projekt nakon npx cap add ios pa ponovno pokreni ovu naredbu.')
  process.exit(0)
}

let plist = fs.readFileSync(plistPath, 'utf8')
const entries = [
  ['NSMicrophoneUsageDescription', 'FERSYS koristi mikrofon za glasovne naredbe AI pomoćniku.'],
  ['NSSpeechRecognitionUsageDescription', 'FERSYS koristi prepoznavanje govora kako bi glasovne naredbe pretvorio u tekst.'],
  ['NSPhotoLibraryUsageDescription', 'FERSYS koristi fotografije kako biste mogli odabrati i priložiti slike radnim nalozima i poslovnim dokumentima.'],
  ['NSPhotoLibraryAddUsageDescription', 'FERSYS može spremiti poslovne fotografije i dokumente u vašu fototeku kada to zatražite.'],
  ['NSCameraUsageDescription', 'FERSYS koristi kameru za fotografiranje radova i priloga radnim nalozima.'],
]

for (const [key, value] of entries) {
  if (plist.includes(`<key>${key}</key>`)) continue
  plist = plist.replace('</dict>\n</plist>', `\t<key>${key}</key>\n\t<string>${value}</string>\n</dict>\n</plist>`)
}
fs.writeFileSync(plistPath, plist)
console.log(`[FERSYS] iOS dopuštenja provjerena: ${plistPath}`)
