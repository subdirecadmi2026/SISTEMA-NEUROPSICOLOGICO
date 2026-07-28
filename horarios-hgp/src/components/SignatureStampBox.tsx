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

function normalizeName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Casilla institucional.
 * Siempre muestra el nombre del responsable configurado.
 * El sello electrónico (QR + «Firmado electrónicamente») se suma
 * cuando existe registro en electronicSigns.
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
  /** Nombre del responsable (admin / jefe del horario). */
  const responsibleName = (designatedName || plainName || '').trim()
  const certName = signedElectronic ? electronic!.subjectCn.trim() : ''
  const showCertAsExtra =
    !!certName &&
    !!responsibleName &&
    normalizeName(certName) !== normalizeName(responsibleName)
  /** Nombre principal visible en la casilla. */
  const primaryName = responsibleName || certName

  return (
    <div
      className="print-sign-box flex min-h-[4.75rem] flex-col overflow-hidden rounded px-1.5 py-1"
      style={{ border: '1px solid #d5dee6', backgroundColor: '#ffffff' }}
    >
      <p
        className="print-sign-role shrink-0 text-[8px] font-semibold uppercase leading-tight tracking-wide"
        style={{ color: '#1c3a5c' }}
      >
        <span className="line-clamp-2 break-words">{label}</span>
      </p>

      {signedElectronic && electronic ? (
        <div className="print-sign-stamp mt-0.5 flex items-start gap-1 overflow-hidden">
          {qr ? (
            <img
              src={qr}
              alt={`Código QR firma ${label}`}
              className="print-sign-qr h-9 w-9 shrink-0 object-contain"
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="print-sign-qr-placeholder flex h-9 w-9 shrink-0 items-center justify-center text-[7px]"
              style={{ border: '1px dashed #d5dee6', color: '#5a6b7a' }}
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
            {primaryName ? (
              <p
                className="print-sign-name text-[8px] font-semibold leading-tight"
                style={{ color: '#1e2a36' }}
                title={primaryName}
              >
                <span className="line-clamp-2 break-words">{primaryName}</span>
              </p>
            ) : null}
            <p
              className="print-sign-firmado mt-0.5 text-[7px] font-bold uppercase leading-none tracking-wide"
              style={{ color: '#2e7d84' }}
            >
              Firmado electrónicamente
            </p>
            {showCertAsExtra ? (
              <p
                className="print-sign-cert mt-0.5 text-[7px] leading-tight"
                style={{ color: '#5a6b7a' }}
                title={certName}
              >
                <span className="line-clamp-1 break-words">Cert: {certName}</span>
              </p>
            ) : null}
            <p
              className="print-sign-meta-line mt-0.5 text-[7px] leading-tight"
              style={{ color: '#5a6b7a' }}
            >
              <span className="line-clamp-2 break-words">
                {shortDate(electronic.signedAt)}
                {methodTag(electronic.method)
                  ? ` · ${methodTag(electronic.method)}`
                  : ''}
              </span>
            </p>
            <p
              className="print-sign-verify text-[7px] font-medium leading-tight"
              style={{ color: '#1c3a5c' }}
            >
              Verifique con QR
            </p>
          </div>
        </div>
      ) : primaryName ? (
        <div className="mt-2 flex flex-col overflow-hidden">
          <p
            className="text-[9px] font-semibold leading-tight"
            style={{ color: '#1e2a36' }}
            title={primaryName}
          >
            <span className="line-clamp-2 break-words">{primaryName}</span>
          </p>
          <p
            className="mt-2 border-t pt-0.5 text-center text-[7px] leading-tight"
            style={{ borderColor: '#d5dee6', color: '#5a6b7a' }}
          >
            {plainName && !signedElectronic
              ? 'Pendiente sello electrónico'
              : 'Pendiente de firma'}
          </p>
        </div>
      ) : (
        <p className="print-sign-empty mt-3 text-[8px]" style={{ color: '#5a6b7a' }}>
          Pendiente de firma
        </p>
      )}
    </div>
  )
}
