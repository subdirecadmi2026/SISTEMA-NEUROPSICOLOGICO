import { useEffect, useState } from 'react'
import type { AppUser, ElectronicSignRecord } from '../types'
import {
  formatElectronicStamp,
  getSessionPassword,
  getStoredCertMeta,
  hasStoredCertificate,
  signWithStoredCertificate,
  slotLabel,
  type FirmaEcSlot,
  type ElectronicSignResult,
} from '../lib/firmaEc'

export type SignatureConfirmResult = {
  signedName: string
  electronic?: ElectronicSignRecord
}

type Props = {
  open: boolean
  title: string
  subtitle?: string
  defaultName: string
  confirmLabel: string
  /** Casilla institucional donde se estampa la firma. */
  slot: FirmaEcSlot
  user: AppUser | null
  onCancel: () => void
  onConfirm: (result: SignatureConfirmResult) => void
}

/**
 * Modal de firma: nombre simple o firma electrónica FirmaEC (.p12).
 */
export function SignatureGate({
  open,
  title,
  subtitle,
  defaultName,
  confirmLabel,
  slot,
  user,
  onCancel,
  onConfirm,
}: Props) {
  const [name, setName] = useState(defaultName)
  const [ack, setAck] = useState(false)
  const [useElectronic, setUseElectronic] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasCert, setHasCert] = useState(false)
  const [certCn, setCertCn] = useState('')

  useEffect(() => {
    if (!open) return
    setName(defaultName)
    setAck(false)
    setError('')
    setBusy(false)
    const uid = user?.id
    const ready = !!uid && hasStoredCertificate(uid)
    setHasCert(ready)
    if (ready && uid) {
      const meta = getStoredCertMeta(uid)
      setCertCn(meta?.subjectCn ?? '')
      setPassword(getSessionPassword(uid))
      setUseElectronic(true)
    } else {
      setCertCn('')
      setPassword('')
      setUseElectronic(false)
    }
  }, [open, defaultName, user])

  if (!open) return null

  const canSimple = name.trim().length >= 3 && ack && !useElectronic
  const canElectronic =
    useElectronic && ack && password.length > 0 && hasCert && !!user

  function submitSimple() {
    onConfirm({ signedName: name.trim() })
  }

  function submitElectronic() {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      const result: ElectronicSignResult = signWithStoredCertificate(
        user,
        slot,
        password,
      )
      const stampText = formatElectronicStamp(result)
      const electronic: ElectronicSignRecord = {
        slot: result.slot,
        subjectCn: result.subjectCn,
        serialNumber: result.serialNumber,
        issuerCn: result.issuerCn,
        signedAt: result.signedAt,
        method: 'pkcs12_local',
        stampText,
      }
      onConfirm({ signedName: result.subjectCn, electronic })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo firmar. Revise la contraseña del .p12',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-gate-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-xl">
        <h2
          id="signature-gate-title"
          className="font-display text-xl text-navy"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}
        <p className="mt-2 rounded-lg bg-sand/60 px-3 py-2 text-xs text-muted">
          Casilla: <strong className="text-navy">{slotLabel(slot)}</strong>
        </p>

        {hasCert ? (
          <div className="mt-4 rounded-xl border border-teal/30 bg-teal/5 p-3">
            <label className="flex items-start gap-2 text-sm text-ink">
              <input
                type="checkbox"
                className="mt-1"
                checked={useElectronic}
                onChange={(e) => setUseElectronic(e.target.checked)}
              />
              <span>
                <strong>¿Firmar electrónicamente con FirmaEC?</strong>
                <br />
                <span className="text-xs text-muted">
                  Certificado: {certCn || 'cargado'} · se estampa
                  automáticamente en la casilla del {slotLabel(slot)}.
                </span>
              </span>
            </label>
            {useElectronic && (
              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
                Contraseña del certificado (.p12)
                <input
                  type="password"
                  autoComplete="off"
                  className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña del archivo de firma"
                />
              </label>
            )}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Para firma electrónica, cargue su certificado FirmaEC (.p12) en{' '}
            <strong>FirmaEC</strong> (botón en la barra superior). Mientras
            tanto puede firmar con su nombre.
          </p>
        )}

        {!useElectronic && (
          <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-muted">
            Nombre completo (firma)
            <input
              autoFocus
              className="mt-1 w-full rounded-xl border border-line bg-sand/30 px-3 py-2.5 text-sm font-medium text-ink"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Escriba su nombre para firmar"
            />
          </label>
        )}

        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            Confirmo que firmo este horario bajo mi responsabilidad
            {useElectronic
              ? ' con mi certificado de firma electrónica.'
              : ' y que los datos son correctos.'}
          </span>
        </label>

        {error && (
          <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold text-navy hover:bg-sand"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={
              busy || (useElectronic ? !canElectronic : !canSimple)
            }
            onClick={() =>
              useElectronic ? submitElectronic() : submitSimple()
            }
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-40"
          >
            {busy
              ? 'Firmando…'
              : useElectronic
                ? 'Confirmar firma electrónica'
                : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
