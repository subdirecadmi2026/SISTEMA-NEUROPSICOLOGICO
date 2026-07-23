import forge from 'node-forge'
import type { AppUser } from '../types'

const META_PREFIX = 'hgp-firmaec-meta-v1:'
const PASS_PREFIX = 'hgp-firmaec-pass-v1:'
const IMG_PREFIX = 'hgp-firmaec-img-v1:'
const CFG_KEY = 'hgp-firmaec-config-v1'
const IDB_NAME = 'hgp-firmaec-db-v1'
const IDB_STORE = 'certs'

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
  hasPrivateKey: boolean
}

export type FirmaEcConfig = {
  sistema: string
  apiKey: string
  ambiente: 'pruebas' | 'produccion'
  cedula: string
  preferProtocol: boolean
}

export type ParsedPkcs12 = {
  subjectCn: string
  subjectEmail?: string
  serialNumber?: string
  issuerCn?: string
  notBefore?: string
  notAfter?: string
  privateKeyPem?: string
  certificatePem: string
  hasPrivateKey: boolean
}

export type ElectronicSignResult = {
  signedName: string
  slot: FirmaEcSlot
  subjectCn: string
  serialNumber?: string
  issuerCn?: string
  signedAt: string
  method: 'pkcs12_local' | 'image_stamp' | 'firmaec_protocol'
  fileName?: string
  imageDataUrl?: string
  protocolUrl?: string
}

const DEFAULT_CFG: FirmaEcConfig = {
  sistema: 'pruebas',
  apiKey: '',
  ambiente: 'pruebas',
  cedula: '',
  preferProtocol: false,
}

function metaKey(userId: string) {
  return `${META_PREFIX}${userId}`
}
function passKey(userId: string) {
  return `${PASS_PREFIX}${userId}`
}
function imgKey(userId: string) {
  return `${IMG_PREFIX}${userId}`
}

function bytesToBinary(u8: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunk))
  }
  return binary
}

function binaryToBytes(bin: string): Uint8Array {
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB no disponible'))
  })
}

async function idbPutCert(userId: string, bytes: Uint8Array): Promise<void> {
  const db = await openIdb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(bytes, userId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar el certificado'))
  })
  db.close()
}

async function idbGetCert(userId: string): Promise<Uint8Array | null> {
  const db = await openIdb()
  const result = await new Promise<Uint8Array | null>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly')
    const req = tx.objectStore(IDB_STORE).get(userId)
    req.onsuccess = () => {
      const v = req.result
      if (!v) {
        resolve(null)
        return
      }
      if (v instanceof Uint8Array) resolve(v)
      else if (v instanceof ArrayBuffer) resolve(new Uint8Array(v))
      else resolve(null)
    }
    req.onerror = () => reject(req.error ?? new Error('No se pudo leer el certificado'))
  })
  db.close()
  return result
}

async function idbDelCert(userId: string): Promise<void> {
  try {
    const db = await openIdb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(userId)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('No se pudo borrar'))
    })
    db.close()
  } catch {
    /* ignore */
  }
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
  return !!getStoredCertMeta(userId)
}

/** true si el certificado está vencido (según notAfter). */
export function isCertificateExpired(meta: FirmaEcCertMeta | null): boolean {
  if (!meta?.notAfter) return false
  return new Date(meta.notAfter).getTime() < Date.now()
}

/** Días restantes de vigencia (negativo = vencido). */
export function certificateDaysLeft(meta: FirmaEcCertMeta | null): number | null {
  if (!meta?.notAfter) return null
  const ms = new Date(meta.notAfter).getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

export function getSignatureImage(userId: string): string | null {
  try {
    return localStorage.getItem(imgKey(userId))
  } catch {
    return null
  }
}

export function saveSignatureImage(userId: string, dataUrl: string) {
  localStorage.setItem(imgKey(userId), dataUrl)
}

export function clearSignatureImage(userId: string) {
  localStorage.removeItem(imgKey(userId))
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

export async function clearFirmaEcVault(userId: string) {
  localStorage.removeItem(metaKey(userId))
  sessionStorage.removeItem(passKey(userId))
  clearSignatureImage(userId)
  await idbDelCert(userId)
  // legado localStorage
  localStorage.removeItem(`hgp-firmaec-cert-v1:${userId}`)
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
  return typeof v === 'string' ? v : Array.isArray(v) ? String(v[0]) : undefined
}

function friendlyForgeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()
  if (
    lower.includes('mac') ||
    lower.includes('password') ||
    lower.includes('invalid') ||
    lower.includes('decrypt') ||
    lower.includes('pkcs12')
  ) {
    return 'No se pudo abrir el .p12. Revise la contraseña o pruebe exportar de nuevo desde FirmaEC (archivo PKCS#12).'
  }
  if (lower.includes('asn.1') || lower.includes('too few bytes')) {
    return 'El archivo no parece un certificado .p12/.pfx válido. Elija el archivo de firma electrónica (no una imagen ni un PDF).'
  }
  return msg || 'Error al leer el certificado'
}

function extractBags(p12: forge.pkcs12.Pkcs12Pfx): {
  certBags: Array<{ cert?: forge.pki.Certificate }>
  keyBags: Array<{ key?: forge.pki.PrivateKey }>
} {
  const certOid = forge.pki.oids.certBag
  const shroudedOid = forge.pki.oids.pkcs8ShroudedKeyBag
  const keyOid = forge.pki.oids.keyBag

  const certMap = p12.getBags({ bagType: certOid }) as Record<
    string,
    Array<{ cert?: forge.pki.Certificate }> | undefined
  >
  const shroudedMap = p12.getBags({ bagType: shroudedOid }) as Record<
    string,
    Array<{ key?: forge.pki.PrivateKey }> | undefined
  >
  const keyMap = p12.getBags({ bagType: keyOid }) as Record<
    string,
    Array<{ key?: forge.pki.PrivateKey }> | undefined
  >

  return {
    certBags: certMap[certOid] ?? [],
    keyBags: [...(shroudedMap[shroudedOid] ?? []), ...(keyMap[keyOid] ?? [])],
  }
}

function pickEndEntity(
  certBags: Array<{ cert?: forge.pki.Certificate }>,
  keyBags: Array<{ key?: forge.pki.PrivateKey }>,
): { cert: forge.pki.Certificate; key?: forge.pki.PrivateKey } {
  const certs = certBags
    .map((b) => b.cert)
    .filter((c): c is forge.pki.Certificate => !!c)
  if (certs.length === 0) {
    throw new Error(
      'El archivo .p12 no contiene un certificado usable. Exporte desde FirmaEC con clave privada.',
    )
  }

  const keys = keyBags
    .map((b) => b.key)
    .filter((k): k is forge.pki.PrivateKey => !!k)

  // Prefer leaf cert (usually last in export) + first private key
  return { cert: certs[certs.length - 1], key: keys[0] }
}

/**
 * Abre un PKCS#12 (.p12 / .pfx) con la contraseña y extrae identidad.
 */
export function parsePkcs12(
  bytes: ArrayBuffer | Uint8Array,
  password: string,
): ParsedPkcs12 {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (u8.length < 64) {
    throw new Error(
      'El archivo es demasiado pequeño. Debe ser un certificado .p12 / .pfx de FirmaEC.',
    )
  }

  const binary = bytesToBinary(u8)
  let asn1: forge.asn1.Asn1
  try {
    asn1 = forge.asn1.fromDer(binary)
  } catch (e) {
    throw new Error(friendlyForgeError(e))
  }

  const attempts: Array<() => forge.pkcs12.Pkcs12Pfx> = [
    () => forge.pkcs12.pkcs12FromAsn1(asn1, password),
    () => forge.pkcs12.pkcs12FromAsn1(asn1, false, password),
    () => forge.pkcs12.pkcs12FromAsn1(asn1, true, password),
  ]
  // Algunas exportaciones Java usan contraseña vacía aunque el usuario cree que tiene clave
  if (password) {
    attempts.push(() => forge.pkcs12.pkcs12FromAsn1(asn1, ''))
    attempts.push(() => forge.pkcs12.pkcs12FromAsn1(asn1, false, ''))
  }

  let p12: forge.pkcs12.Pkcs12Pfx | null = null
  let lastErr: unknown
  for (const tryOpen of attempts) {
    try {
      p12 = tryOpen()
      break
    } catch (e) {
      lastErr = e
    }
  }
  if (!p12) throw new Error(friendlyForgeError(lastErr))

  const { certBags, keyBags } = extractBags(p12)
  const { cert, key } = pickEndEntity(certBags, keyBags)

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
    privateKeyPem: key ? forge.pki.privateKeyToPem(key) : undefined,
    certificatePem: forge.pki.certificateToPem(cert),
    hasPrivateKey: !!key,
  }
}

export async function saveCertificateForUser(
  user: AppUser,
  file: File,
  password: string,
): Promise<FirmaEcCertMeta> {
  const name = file.name.toLowerCase()
  if (
    name &&
    !name.endsWith('.p12') &&
    !name.endsWith('.pfx') &&
    !file.type.includes('pkcs12') &&
    !file.type.includes('x-pkcs12')
  ) {
    // No bloquear: algunos SO no ponen extensión; solo avisar si es imagen/pdf
    if (
      file.type.startsWith('image/') ||
      file.type === 'application/pdf' ||
      name.endsWith('.png') ||
      name.endsWith('.jpg') ||
      name.endsWith('.jpeg') ||
      name.endsWith('.pdf')
    ) {
      throw new Error(
        'Ese archivo no es un certificado .p12/.pfx. Si tiene una imagen de firma, úsela en la sección «Imagen de firma». Para FirmaEC suba el archivo .p12.',
      )
    }
  }

  const buf = await file.arrayBuffer()
  const parsed = parsePkcs12(buf, password)
  const bytes = new Uint8Array(buf)

  try {
    await idbPutCert(user.id, bytes)
  } catch {
    // Fallback localStorage (certs pequeños)
    const encoded = forge.util.encode64(bytesToBinary(bytes))
    try {
      localStorage.setItem(`hgp-firmaec-cert-v1:${user.id}`, encoded)
    } catch {
      throw new Error(
        'No hay espacio para guardar el certificado en este navegador. Libere almacenamiento o use otro equipo.',
      )
    }
  }

  const meta: FirmaEcCertMeta = {
    fileName: file.name || 'certificado.p12',
    subjectCn: parsed.subjectCn,
    subjectEmail: parsed.subjectEmail,
    serialNumber: parsed.serialNumber,
    issuerCn: parsed.issuerCn,
    notBefore: parsed.notBefore,
    notAfter: parsed.notAfter,
    uploadedAt: new Date().toISOString(),
    hasPrivateKey: parsed.hasPrivateKey,
  }

  localStorage.setItem(metaKey(user.id), JSON.stringify(meta))
  setSessionPassword(user.id, password)
  return meta
}

export async function saveSignatureImageFile(
  user: AppUser,
  file: File,
): Promise<string> {
  if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif)$/i.test(file.name)) {
    throw new Error('Seleccione una imagen PNG o JPG de su firma.')
  }
  if (file.size > 2_500_000) {
    throw new Error('La imagen es muy grande (máx. 2.5 MB).')
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
  saveSignatureImage(user.id, dataUrl)
  return dataUrl
}

async function loadCertBytes(userId: string): Promise<Uint8Array | null> {
  const fromIdb = await idbGetCert(userId)
  if (fromIdb) return fromIdb
  const b64 = localStorage.getItem(`hgp-firmaec-cert-v1:${userId}`)
  if (!b64) return null
  return binaryToBytes(forge.util.decode64(b64))
}

export async function signWithStoredCertificate(
  user: AppUser,
  slot: FirmaEcSlot,
  password: string,
): Promise<ElectronicSignResult> {
  const meta = getStoredCertMeta(user.id)
  const imageDataUrl = getSignatureImage(user.id) ?? undefined
  const bytes = await loadCertBytes(user.id)

  if (!bytes || !meta) {
    if (imageDataUrl) {
      const signedAt = new Date().toISOString()
      return {
        signedName: user.name,
        slot,
        subjectCn: user.name,
        signedAt,
        method: 'image_stamp',
        imageDataUrl,
      }
    }
    throw new Error(
      'No hay certificado ni imagen de firma cargados. Abra FirmaEC y súbalos.',
    )
  }

  const parsed = parsePkcs12(bytes, password)
  if (parsed.notAfter && new Date(parsed.notAfter).getTime() < Date.now()) {
    throw new Error(
      `El certificado está vencido (hasta ${new Date(parsed.notAfter).toLocaleDateString('es-EC')}). Renueve su firma electrónica.`,
    )
  }
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
    imageDataUrl,
  }
}

export function formatElectronicStamp(e: ElectronicSignResult): string {
  const when = new Date(e.signedAt).toLocaleString('es-EC', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  if (e.method === 'image_stamp') {
    return `${e.subjectCn}\nFirma electrónica (imagen)\n${when}`
  }
  if (e.method === 'firmaec_protocol') {
    return `${e.subjectCn}\nFirmado con app FirmaEC\n${when}`
  }
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

export function buildFirmaEcProtocolUrl(
  token: string,
  slot: FirmaEcSlot,
  cfg: FirmaEcConfig,
): string {
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

export function isFirmaEcApiConfigured(cfg?: FirmaEcConfig): boolean {
  const c = cfg ?? loadFirmaEcConfig()
  return !!c.apiKey.trim() && !!c.cedula.trim() && !!c.sistema.trim()
}

export function firmaEcApiStatusLabel(cfg?: FirmaEcConfig): string {
  const c = cfg ?? loadFirmaEcConfig()
  if (!c.apiKey.trim()) return 'API no configurada (falta X-API-KEY)'
  if (!c.cedula.trim()) return 'API incompleta (falta cédula)'
  return `API lista · ${c.ambiente} · ${c.sistema}`
}

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

/**
 * Solicita token a FirmaEC y arma el enlace firmaec:// para la app de escritorio.
 */
export async function openFirmaEcProtocolSign(
  pdfBase64: string,
  fileName: string,
  slot: FirmaEcSlot,
  cfg?: FirmaEcConfig,
): Promise<{ token: string; protocolUrl: string }> {
  const config = cfg ?? loadFirmaEcConfig()
  const token = await requestFirmaEcToken(pdfBase64, fileName, config)
  const protocolUrl = buildFirmaEcProtocolUrl(token, slot, config)
  try {
    window.location.href = protocolUrl
  } catch {
    /* algunos navegadores bloquean el esquema; el caller puede mostrar la URL */
  }
  return { token, protocolUrl }
}
