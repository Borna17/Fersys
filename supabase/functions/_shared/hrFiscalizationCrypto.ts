import { createHash, createSign } from 'node:crypto'
import { SignedXml } from 'npm:xml-crypto@6.1.2'

import {
  HR_FISCAL_SIGNATURE_PROFILE,
  buildHrZkiInput,
} from './hrFiscalization.ts'

export type HrFiscalCertificateSecrets = {
  privateKeyPem: string
  certificatePem: string
}

export type HrFiscalZkiInput = {
  companyOib: string
  issuedAtForZki: string
  sequenceNumber: number
  businessPremiseCode: string
  deviceCode: string
  total: number
}

function normalizePem(value: string) {
  return value.replace(/\\n/g, '\n').trim()
}

function assertPrivateKeyPem(value: string) {
  const normalized = normalizePem(value)
  if (
    !normalized.includes('-----BEGIN PRIVATE KEY-----') &&
    !normalized.includes('-----BEGIN RSA PRIVATE KEY-----')
  ) {
    throw new Error(
      'Privatni fiskalni ključ nije u podržanom PEM formatu.',
    )
  }
  return normalized
}

function assertCertificatePem(value: string) {
  const normalized = normalizePem(value)
  if (
    !normalized.includes('-----BEGIN CERTIFICATE-----') ||
    !normalized.includes('-----END CERTIFICATE-----')
  ) {
    throw new Error(
      'Fiskalni certifikat nije u podržanom PEM formatu.',
    )
  }
  return normalized
}

export function getHrFiscalCertificateSecretsFromEnv(): HrFiscalCertificateSecrets {
  const privateKeyPem = Deno.env.get('HR_FISCAL_PRIVATE_KEY_PEM') || ''
  const certificatePem = Deno.env.get('HR_FISCAL_CERTIFICATE_PEM') || ''

  if (!privateKeyPem || !certificatePem) {
    throw new Error(
      'Fiskalni privatni ključ i certifikat nisu konfigurirani kao sigurni server secrets.',
    )
  }

  return {
    privateKeyPem: assertPrivateKeyPem(privateKeyPem),
    certificatePem: assertCertificatePem(certificatePem),
  }
}

export function generateHrZki(
  input: HrFiscalZkiInput,
  privateKeyPem: string,
) {
  const key = assertPrivateKeyPem(privateKeyPem)
  const preimage = buildHrZkiInput(input)

  const signer = createSign('RSA-SHA256')
  signer.update(preimage, 'utf8')
  signer.end()

  const signature = signer.sign(key)
  return createHash('md5')
    .update(signature)
    .digest('hex')
    .toLowerCase()
}

export function signHrRacunZahtjev(
  unsignedXml: string,
  secrets: HrFiscalCertificateSecrets,
) {
  if (!unsignedXml.includes('<tns:RacunZahtjev')) {
    throw new Error('RacunZahtjev XML nije pronađen.')
  }

  const privateKeyPem = assertPrivateKeyPem(secrets.privateKeyPem)
  const certificatePem = assertCertificatePem(secrets.certificatePem)

  const signature = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certificatePem,
    canonicalizationAlgorithm:
      HR_FISCAL_SIGNATURE_PROFILE.canonicalization,
    signatureAlgorithm:
      HR_FISCAL_SIGNATURE_PROFILE.signatureMethod,
    getKeyInfoContent: SignedXml.getKeyInfoContent,
  })

  signature.addReference({
    xpath: "//*[local-name(.)='RacunZahtjev']",
    transforms: [...HR_FISCAL_SIGNATURE_PROFILE.transforms],
    digestAlgorithm: HR_FISCAL_SIGNATURE_PROFILE.digestMethod,
  })

  signature.computeSignature(unsignedXml, {
    prefix: 'ds',
    location: {
      reference: "//*[local-name(.)='RacunZahtjev']",
      action: 'append',
    },
  })

  const signedXml = signature.getSignedXml()
  if (
    !signedXml.includes('<ds:Signature') ||
    !signedXml.includes('rsa-sha256') ||
    !signedXml.includes('sha256')
  ) {
    throw new Error(
      'XML potpis nije generiran očekivanim RSA-SHA256/SHA-256 profilom.',
    )
  }

  return signedXml
}

export function buildHrFiscalSoapEnvelope(signedRacunZahtjev: string) {
  if (!signedRacunZahtjev.includes('<tns:RacunZahtjev')) {
    throw new Error('Potpisani RacunZahtjev nije ispravan.')
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soapenv:Envelope ' +
    'xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">' +
    '<soapenv:Header/>' +
    '<soapenv:Body>' +
    signedRacunZahtjev +
    '</soapenv:Body>' +
    '</soapenv:Envelope>'
  )
}
