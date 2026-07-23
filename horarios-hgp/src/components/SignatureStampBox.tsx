import { useEffect, useState } from 'react'
import type { ElectronicSignRecord } from '../types'
import { ensureElectronicQr } from '../lib/signatureQr'

type Props = {
  label: string
  /** Texto clásico (solo referencia; no genera sello electrónico). */
  value?: string
  slot: ElectronicSignRecord['slot']
  electronic?: ElectronicSignRecord
  scheduleId?: string
  unitName?: string
}

/**
 * Casilla institucional.
 * El sello electrónico (QR + «Firmado electrónicamente») SOLO aparece
 * si existe un registro en electronicSigns del encargado.
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
  const signedElectronic = !!(
    electronic?.subjectCn &&
    electronic?.signedAt &&
    electronic?.method
  )

  useEffect(() => {
    let alive = true
    setQr(electronic?.qrDataUrl ?? '')
    if (!signedElectronic || !electronic) return
    if (electronic.qrDataUrl) {
      setQr(electronic.qrDataUrl)
      return
    }
    void ensureElectronicQr(electronic, { scheduleId, unitName }).then(
      (next) => {
        if (alive) setQr(next.qrDataUrl ?? '')
      },
    )
    return () => {
      alive = false
    }
  }, [electronic, signedElectronic, scheduleId, unitName, slot])

  const plainName = value
    ? value.split('\n')[0]?.split('—')[0]?.trim()
    : ''

  return (
    <div className="print-sign-box rounded border border-line bg-white px-2 py-1.5">
      <p className="print-sign-role text-[9px] font-semibold uppercase tracking-wide text-navy">
        {label}
      </p>
      {signedElectronic && electronic ? (
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
            {electronic.imageDataUrl ? (
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
              {electronic.subjectCn}
            </p>
            {electronic.issuerCn ? (
              <p className="print-sign-cert truncate text-[8px] text-muted">
                {electronic.issuerCn}
              </p>
            ) : null}
            <p className="print-sign-meta-line text-[8px] leading-tight text-muted">
              {new Date(electronic.signedAt).toLocaleString('es-EC')}
              {electronic.serialNumber
                ? ` · Serie ${electronic.serialNumber.slice(0, 16)}`
                : ''}
              {electronic.method === 'pkcs12_local'
                ? ' · .p12'
                : electronic.method === 'firmaec_protocol'
                  ? ' · FirmaEC'
                  : electronic.method === 'image_stamp'
                    ? ' · imagen'
                    : ''}
            </p>
            <p className="print-sign-verify text-[8px] font-medium text-navy">
              Verifique con el código QR
            </p>
          </div>
        </div>
      ) : plainName ? (
        <div className="mt-4">
          <p className="text-[10px] font-semibold text-ink">{plainName}</p>
          <p className="mt-0.5 text-[8px] text-muted">
            Registro textual · sin sello electrónico
          </p>
        </div>
      ) : (
        <p className="print-sign-empty mt-6 text-[9px] text-muted">
          Pendiente de firma electrónica
        </p>
      )}
    </div>
  )
}
