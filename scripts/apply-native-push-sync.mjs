import fs from 'node:fs'

const path = 'src/router/AppRouter.tsx'
let source = fs.readFileSync(path, 'utf8')

const importAnchor = "import WorkOrderPhotoGallerySync from '../components/WorkOrderPhotoGallerySync'\n"
if (!source.includes("PushRegistrationSync")) {
  if (!source.includes(importAnchor)) throw new Error('AppRouter import anchor not found')
  source = source.replace(importAnchor, importAnchor + "import PushRegistrationSync from '../components/PushRegistrationSync'\n")
}

const renderAnchor = '      <WorkOrderPhotoGallerySync />\n'
if (!source.includes('      <PushRegistrationSync />')) {
  if (!source.includes(renderAnchor)) throw new Error('AppRouter render anchor not found')
  source = source.replace(renderAnchor, renderAnchor + '      <PushRegistrationSync />\n')
}

fs.writeFileSync(path, source)
console.log('POTVRDENO: native push token sync je ukljucen u AppRouter.')
