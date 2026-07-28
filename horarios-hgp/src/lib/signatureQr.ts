import QRCode from 'qrcode'
import type { ElectronicSignRecord } from '../types'
import { slotLabel, type FirmaEcSlot } from './firmaEc'

export type SignatureQrPayload = {
  subjectCn: string
  slot: FirmaEcSlot
  signedAt: string
  serialNumber?: string
  issuerCn?: string
  scheduleId?: string
  unitName?: string
  method?: string
}

/** Texto embebido en el QR (verificable a ojo / con lector). */
export function signatureQrPlainText(p: SignatureQrPayload): string {
  const when = new Date(p.signedAt).toLocaleString('es-EC')
  return [
    'FIRMA ELECTRÓNICA · HGP / FirmaEC',
    `Firmante: ${p.subjectCn}`,
    `Casilla: ${slotLabel(p.slot)}`,
    `Fecha: ${when}`,
    p.serialNumber ? `Serie cert.: ${p.serialNumber}` : null,
    p.issuerCn ? `Emisor: ${p.issuerCn}` : null,
    p.unitName ? `Servicio: ${p.unitName}` : null,
    p.scheduleId ? `Horario: ${p.scheduleId}` : null,
    p.method ? `Método: ${p.method}` : null,
  ]
    .filter(Boolean)
    .join('\n')
}

/** Genera imagen PNG (data URL) del QR de la firma. */
export async function buildSignatureQrDataUrl(
  p: SignatureQrPayload,
): Promise<string> {
  const text = signatureQrPlainText(p)
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 180,
    color: { dark: '#1c3a5c', light: '#ffffff' },
  })
}

/** Completa un registro electrónico con QR si falta. */
export async function ensureElectronicQr(
  record: ElectronicSignRecord,
  extra?: { scheduleId?: string; unitName?: string },
): Promise<ElectronicSignRecord> {
  if (record.qrDataUrl) return record
  const qrDataUrl = await buildSignatureQrDataUrl({
    subjectCn: record.subjectCn,
    slot: record.slot,
    signedAt: record.signedAt,
    serialNumber: record.serialNumber,
    issuerCn: record.issuerCn,
    method: record.method,
    scheduleId: extra?.scheduleId,
    unitName: extra?.unitName,
  })
  return { ...record, qrDataUrl }
}
