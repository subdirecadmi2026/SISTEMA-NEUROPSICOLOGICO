import { useEffect, useState } from 'react'
import type { ElectronicSignRecord } from '../types'
import { ensureElectronicQr } from '../lib/signatureQr'

type Props = {
  label: string
  /** Texto clásico (solo referencia; no genera sello electrónico). */
  value?: string
  /** Nombre designado por el admin (responsables de firma). */
  designatedName?: string
  slot?: ElectronicSignRecord['slot']
  electronic?: ElectronicSignRecord
  scheduleId?: string
  unitName?: string
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-EC', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function methodTag(method: ElectronicSignRecord['method']): string {
  if (method === 'pkcs12_local') return '.p12'
  if (method === 'firmaec_protocol') return 'FirmaEC'
  if (method === 'image_stamp') return 'imagen'
  return ''
}

/**
 * Casilla institucional.
 * El sello electrónico (QR + «Firmado electrónicamente») SOLO aparece
 * si existe un registro en electronicSigns del encargado.
 * El contenido se adapta al tamaño fijo del cuadro (sin agrandarlo).
 */
export function SignatureStampBox({
  label,
  value,
  designatedName,
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
  const displayName = signedElectronic
    ? electronic!.subjectCn
    : plainName || designatedName || ''

  return (
    <div className="print-sign-box flex h-full min-h-[5.5rem] flex-col overflow-hidden rounded border border-line bg-white px-1.5 py-1">
      <p className="print-sign-role shrink-0 text-[8px] font-semibold uppercase leading-tight tracking-wide text-navy">
        <span className="line-clamp-2 break-words">{label}</span>
      </p>

      {signedElectronic && electronic ? (
        <div className="print-sign-stamp mt-0.5 flex min-h-0 flex-1 items-start gap-1 overflow-hidden">
          {qr ? (
            <img
              src={qr}
              alt={`Código QR firma ${label}`}
              className="print-sign-qr h-9 w-9 shrink-0 object-contain"
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="print-sign-qr-placeholder flex h-9 w-9 shrink-0 items-center justify-center border border-dashed border-line text-[7px] text-muted"
              aria-hidden
            >
              QR
            </div>
          )}
          <div className="print-sign-meta min-w-0 flex-1 overflow-hidden">
            {electronic.imageDataUrl ? (
              <img
                src={electronic.imageDataUrl}
                alt={`Sello ${label}`}
                className="print-sign-img mb-0.5 max-h-5 max-w-full object-contain object-left"
                crossOrigin="anonymous"
              />
            ) : null}
            <p className="print-sign-firmado text-[7px] font-bold uppercase leading-none tracking-wide text-teal">
              Firmado electrónicamente
            </p>
            <p
              className="print-sign-name mt-0.5 text-[8px] font-semibold leading-tight text-ink"
              title={electronic.subjectCn}
            >
              <span className="line-clamp-2 break-words">
                {electronic.subjectCn}
              </span>
            </p>
            <p className="print-sign-meta-line mt-0.5 text-[7px] leading-tight text-muted">
              <span className="line-clamp-2 break-words">
                {shortDate(electronic.signedAt)}
                {methodTag(electronic.method)
                  ? ` · ${methodTag(electronic.method)}`
                  : ''}
              </span>
            </p>
            <p className="print-sign-verify text-[7px] font-medium leading-tight text-navy">
              Verifique con QR
            </p>
          </div>
        </div>
      ) : displayName ? (
        <div className="mt-auto flex min-h-0 flex-1 flex-col justify-end overflow-hidden pt-1">
          <p
            className="text-[9px] font-semibold leading-tight text-ink"
            title={displayName}
          >
            <span className="line-clamp-2 break-words">{displayName}</span>
          </p>
          <p className="mt-1 border-t border-line pt-0.5 text-center text-[7px] leading-tight text-muted">
            {plainName && !signedElectronic
              ? 'Pendiente sello electrónico'
              : 'Pendiente de firma'}
          </p>
        </div>
      ) : (
        <p className="print-sign-empty mt-auto text-[8px] text-muted">
          Pendiente de firma
        </p>
      )}
    </div>
  )
}
