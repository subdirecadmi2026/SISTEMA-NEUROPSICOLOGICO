import { useEffect, useState } from 'react'
import type { ElectronicSignRecord } from '../types'
import { ensureElectronicQr } from '../lib/signatureQr'

type Props = {
  label: string
  /** Texto clásico de la casilla (elaboradoPor / aprobadoPor / talentoHumano). */
  value?: string
  slot: ElectronicSignRecord['slot']
  electronic?: ElectronicSignRecord
  scheduleId?: string
  unitName?: string
}

/**
 * Casilla de firma institucional estilo FirmaEC: QR + nombre + metadatos.
 * Si solo hay texto (firmas antiguas), genera el QR al vuelo.
 */
export function SignatureStampBox({
  label,
  value,
  slot,
  electronic,
  scheduleId,
  unitName,
}: Props) {
  const [qr, setQr] = useState(electronic?.qrDataUrl ?? '')
  const hasElectronic = !!electronic?.subjectCn
  const displayName =
    electronic?.subjectCn ||
    (value ? value.split('\n')[0]?.split('—')[0]?.trim() : '') ||
    ''

  useEffect(() => {
    let alive = true
    setQr(electronic?.qrDataUrl ?? '')

    if (!electronic?.subjectCn && !displayName) return

    if (electronic?.qrDataUrl) {
      setQr(electronic.qrDataUrl)
      return
    }

    const base: ElectronicSignRecord = electronic?.subjectCn
      ? electronic
      : {
          slot,
          subjectCn: displayName,
          signedAt: new Date().toISOString(),
          method: 'nombre_qr',
          stampText: value || displayName,
        }

    void ensureElectronicQr(base, { scheduleId, unitName }).then((next) => {
      if (alive) setQr(next.qrDataUrl ?? '')
    })

    return () => {
      alive = false
    }
  }, [electronic, displayName, scheduleId, unitName, value, slot])

  const signed = hasElectronic || !!displayName

  return (
    <div className="print-sign-box rounded border border-line bg-white px-2 py-1.5">
      <p className="print-sign-role text-[9px] font-semibold uppercase tracking-wide text-navy">
        {label}
      </p>
      {signed ? (
        <div className="print-sign-stamp mt-1 flex items-start gap-1.5">
          {qr ? (
            <img
              src={qr}
              alt={`Código QR firma ${label}`}
              className="print-sign-qr h-[72px] w-[72px] shrink-0 object-contain"
            />
          ) : (
            <div
              className="print-sign-qr-placeholder flex h-[72px] w-[72px] shrink-0 items-center justify-center border border-dashed border-line text-[10px] text-muted"
              aria-hidden
            >
              QR
            </div>
          )}
          <div className="print-sign-meta min-w-0 flex-1">
            {electronic?.imageDataUrl ? (
              <img
                src={electronic.imageDataUrl}
                alt={`Sello ${label}`}
                className="print-sign-img mb-0.5 max-h-8 max-w-full object-contain"
              />
            ) : null}
            <p className="print-sign-firmado text-[8px] font-bold uppercase tracking-wide text-teal">
              Firmado electrónicamente
            </p>
            <p className="print-sign-name text-[10px] font-semibold leading-tight text-ink">
              {displayName}
            </p>
            {electronic?.issuerCn ? (
              <p className="print-sign-cert truncate text-[8px] text-muted">
                {electronic.issuerCn}
              </p>
            ) : null}
            <p className="print-sign-meta-line text-[8px] leading-tight text-muted">
              {electronic?.signedAt
                ? new Date(electronic.signedAt).toLocaleString('es-EC')
                : ''}
              {electronic?.serialNumber
                ? ` · Serie ${electronic.serialNumber.slice(0, 16)}`
                : ''}
            </p>
            <p className="print-sign-verify text-[8px] font-medium text-navy">
              Verifique con el código QR
            </p>
          </div>
        </div>
      ) : (
        <p className="print-sign-empty mt-6 text-[9px] text-muted">
          Pendiente de firma
        </p>
      )}
    </div>
  )
}
