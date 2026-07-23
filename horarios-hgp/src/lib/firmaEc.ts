import forge from 'node-forge'
import type { AppUser } from '../types'

const CERT_PREFIX = 'hgp-firmaec-cert-v1:'
const META_PREFIX = 'hgp-firmaec-meta-v1:'
const PASS_PREFIX = 'hgp-firmaec-pass-v1:' // solo sessionStorage
const CFG_KEY = 'hgp-firmaec-config-v1'

export type FirmaEcSlot = 'jefe' | 'revisor' | 'validador'

export type FirmaEcCertMeta = {
  fileName: string
  subjectCn: string
  subjectEmail?: string
  serialNumber?: string
  issuerCn?: string
  notBefore?: string
  notAfter?: string
  uploadedAt: string
}

export type FirmaEcConfig = {
  /** Nombre del sistema registrado en FirmaEC (ej. pruebas / hgp-horarios). */
  sistema: string
  /** API key del sistema transversal (MINTEL / institucional). */
  apiKey: string
  /** Ambiente de pruebas o producción. */
  ambiente: 'pruebas' | 'produccion'
  /** Cédula del firmante (requerida por API FirmaEC). */
  cedula: string
  /** Si true, tras firmar localmente ofrece abrir protocolo firmaec:// cuando hay JWT. */
  preferProtocol: boolean
}

export type ParsedPkcs12 = {
  subjectCn: string
  subjectEmail?: string
  serialNumber?: string
  issuerCn?: string
  notBefore?: string
  notAfter?: string
  privateKeyPem: string
  certificatePem: string
}

export type ElectronicSignResult = {
  signedName: string
  slot: FirmaEcSlot
  subjectCn: string
  serialNumber?: string
  issuerCn?: string
  signedAt: string
  method: 'pkcs12_local'
  fileName?: string
}

const DEFAULT_CFG: FirmaEcConfig = {
  sistema: 'pruebas',
  apiKey: '',
  ambiente: 'pruebas',
  cedula: '',
  preferProtocol: false,
}

function certKey(userId: string) {
  return `${CERT_PREFIX}${userId}`
}
function metaKey(userId: string) {
  return `${META_PREFIX}${userId}`
}
function passKey(userId: string) {
  return `${PASS_PREFIX}${userId}`
}

export function loadFirmaEcConfig(): FirmaEcConfig {
  try {
    const raw = localStorage.getItem(CFG_KEY)
    if (!raw) return { ...DEFAULT_CFG }
    return { ...DEFAULT_CFG, ...(JSON.parse(raw) as Partial<FirmaEcConfig>) }
  } catch {
    return { ...DEFAULT_CFG }
  }
}

export function saveFirmaEcConfig(cfg: FirmaEcConfig) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg))
}

export function firmaEcServiceBase(ambiente: FirmaEcConfig['ambiente']): string {
  return ambiente === 'produccion'
    ? 'https://ws.firmadigital.gob.ec'
    : 'https://impws.firmadigital.gob.ec'
}

export function getStoredCertMeta(userId: string): FirmaEcCertMeta | null {
  try {
    const raw = localStorage.getItem(metaKey(userId))
    if (!raw) return null
    return JSON.parse(raw) as FirmaEcCertMeta
  } catch {
    return null
  }
}

export function hasStoredCertificate(userId: string): boolean {
  return !!localStorage.getItem(certKey(userId)) && !!getStoredCertMeta(userId)
}

export function getSessionPassword(userId: string): string {
  try {
    return sessionStorage.getItem(passKey(userId)) ?? ''
  } catch {
    return ''
  }
}

export function setSessionPassword(userId: string, password: string) {
  if (password) sessionStorage.setItem(passKey(userId), password)
  else sessionStorage.removeItem(passKey(userId))
}

export function clearFirmaEcVault(userId: string) {
  localStorage.removeItem(certKey(userId))
  localStorage.removeItem(metaKey(userId))
  sessionStorage.removeItem(passKey(userId))
}

function attrValue(
  attrs: forge.pki.CertificateField[],
  shortName: string,
): string | undefined {
  const hit = attrs.find(
    (a) =>
      a.shortName === shortName ||
      a.name === shortName ||
      String(a.type) === shortName,
  )
  const v = hit?.value
  return typeof v === 'string' ? v : undefined
}

/**
 * Abre un PKCS#12 (.p12 / .pfx) con la contraseña y extrae identidad + clave.
 */
export function parsePkcs12(
  bytes: ArrayBuffer | Uint8Array,
  password: string,
): ParsedPkcs12 {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i])
  const asn1 = forge.asn1.fromDer(binary)
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password)

  const bags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ??
    []
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ??
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ??
    []

  const certBag = bags[0]
  const keyBag = keyBags[0]
  if (!certBag?.cert || !keyBag?.key) {
    throw new Error(
      'No se encontró certificado o clave privada en el archivo .p12',
    )
  }

  const cert = certBag.cert
  const key = keyBag.key as forge.pki.PrivateKey
  const subjectCn =
    attrValue(cert.subject.attributes, 'CN') ||
    attrValue(cert.subject.attributes, 'commonName') ||
    'Firmante'
  const subjectEmail =
    attrValue(cert.subject.attributes, 'E') ||
    attrValue(cert.subject.attributes, 'emailAddress')
  const issuerCn =
    attrValue(cert.issuer.attributes, 'CN') ||
    attrValue(cert.issuer.attributes, 'commonName')

  return {
    subjectCn,
    subjectEmail,
    serialNumber: cert.serialNumber,
    issuerCn,
    notBefore: cert.validity.notBefore.toISOString(),
    notAfter: cert.validity.notAfter.toISOString(),
    privateKeyPem: forge.pki.privateKeyToPem(key),
    certificatePem: forge.pki.certificateToPem(cert),
  }
}

export async function saveCertificateForUser(
  user: AppUser,
  file: File,
  password: string,
): Promise<FirmaEcCertMeta> {
  const buf = await file.arrayBuffer()
  const parsed = parsePkcs12(buf, password)
  const bytes = new Uint8Array(buf)
  let bin = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  const encoded = forge.util.encode64(bin)

  const meta: FirmaEcCertMeta = {
    fileName: file.name,
    subjectCn: parsed.subjectCn,
    subjectEmail: parsed.subjectEmail,
    serialNumber: parsed.serialNumber,
    issuerCn: parsed.issuerCn,
    notBefore: parsed.notBefore,
    notAfter: parsed.notAfter,
    uploadedAt: new Date().toISOString(),
  }

  localStorage.setItem(certKey(user.id), encoded)
  localStorage.setItem(metaKey(user.id), JSON.stringify(meta))
  setSessionPassword(user.id, password)
  return meta
}

function loadCertBytes(userId: string): Uint8Array | null {
  const b64 = localStorage.getItem(certKey(userId))
  if (!b64) return null
  const bin = forge.util.decode64(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/**
 * Firma electrónica local: valida el .p12 con la contraseña y genera el
 * resultado de identidad para estampar en la casilla correspondiente.
 * (FirmaEC oficial pide el cert en el cliente; aquí el usuario ya lo cargó.)
 */
export function signWithStoredCertificate(
  user: AppUser,
  slot: FirmaEcSlot,
  password: string,
): ElectronicSignResult {
  const bytes = loadCertBytes(user.id)
  const meta = getStoredCertMeta(user.id)
  if (!bytes || !meta) {
    throw new Error('No hay certificado FirmaEC cargado. Súbalo en Ajustes.')
  }
  const parsed = parsePkcs12(bytes, password)
  setSessionPassword(user.id, password)
  const signedAt = new Date().toISOString()
  return {
    signedName: parsed.subjectCn,
    slot,
    subjectCn: parsed.subjectCn,
    serialNumber: parsed.serialNumber,
    issuerCn: parsed.issuerCn,
    signedAt,
    method: 'pkcs12_local',
    fileName: meta.fileName,
  }
}

export function formatElectronicStamp(e: ElectronicSignResult): string {
  const when = new Date(e.signedAt).toLocaleString('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return `${e.subjectCn}\nFirmado electrónicamente · FirmaEC\n${when}`
}

export function slotForStatus(
  next: 'EN_REVISION' | 'APROBADO' | 'ARCHIVADO',
): FirmaEcSlot {
  if (next === 'EN_REVISION') return 'jefe'
  if (next === 'APROBADO') return 'revisor'
  return 'validador'
}

export function slotLabel(slot: FirmaEcSlot): string {
  if (slot === 'jefe') return 'Jefe de servicio'
  if (slot === 'revisor') return 'Revisor'
  return 'Validador'
}

/**
 * Construye URL del protocolo FirmaEC (requiere JWT previo del servicio REST).
 * Posiciones aproximadas A4 landscape para casillas de firma.
 */
export function buildFirmaEcProtocolUrl(
  token: string,
  slot: FirmaEcSlot,
  cfg: FirmaEcConfig,
): string {
  // Coordenadas orientativas (llx/lly) A4 landscape — casillas pie de página
  const pos =
    slot === 'jefe'
      ? { llx: 40, lly: 40 }
      : slot === 'revisor'
        ? { llx: 220, lly: 40 }
        : { llx: 400, lly: 40 }
  const pre = cfg.ambiente === 'pruebas' ? 'true' : 'false'
  const q = new URLSearchParams({
    token,
    tipo_certificado: '1',
    llx: String(pos.llx),
    lly: String(pos.lly),
    estampado: 'QR',
    razon: `Horario HGP · ${slotLabel(slot)}`,
    pre,
  })
  return `firmaec://${encodeURIComponent(cfg.sistema)}/firmar?${q.toString()}`
}

/**
 * Sube PDF a FirmaEC ServicioDocumentos y obtiene JWT.
 * Requiere X-API-KEY institucional registrado en MINTEL.
 */
export async function requestFirmaEcToken(
  pdfBase64: string,
  fileName: string,
  cfg: FirmaEcConfig,
): Promise<string> {
  if (!cfg.apiKey.trim()) {
    throw new Error(
      'Configure la X-API-KEY de FirmaEC en Ajustes (registro institucional MINTEL).',
    )
  }
  if (!cfg.cedula.trim()) {
    throw new Error('Indique la cédula del firmante en Ajustes FirmaEC.')
  }
  const base = firmaEcServiceBase(cfg.ambiente)
  const res = await fetch(`${base}/servicio/documentos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': cfg.apiKey.trim(),
    },
    body: JSON.stringify({
      sistema: cfg.sistema,
      cedula: cfg.cedula.trim(),
      documentos: [{ nombre: fileName, documento: pdfBase64 }],
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `FirmaEC rechazó la solicitud (${res.status}): ${text.slice(0, 160) || res.statusText}`,
    )
  }
  const data = (await res.json()) as { jwt?: string; token?: string } | string
  if (typeof data === 'string') return data
  const jwt = data.jwt ?? data.token
  if (!jwt) throw new Error('FirmaEC no devolvió token JWT')
  return jwt
}
