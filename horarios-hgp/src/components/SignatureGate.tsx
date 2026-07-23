import { useEffect, useState } from 'react'
import type { AppUser, ElectronicSignRecord } from '../types'
import {
  formatElectronicStamp,
  firmaEcApiStatusLabel,
  getSessionPassword,
  getSignatureImage,
  getStoredCertMeta,
  hasStoredCertificate,
  isFirmaEcApiConfigured,
  loadFirmaEcConfig,
  openFirmaEcProtocolSign,
  signWithStoredCertificate,
  slotLabel,
  type FirmaEcSlot,
  type ElectronicSignResult,
} from '../lib/firmaEc'
import { buildSignatureQrDataUrl } from '../lib/signatureQr'

export type SignatureConfirmResult = {
  signedName: string
  electronic: ElectronicSignRecord
}

type Props = {
  open: boolean
  title: string
  subtitle?: string
  defaultName: string
  confirmLabel: string
  slot: FirmaEcSlot
  user: AppUser | null
  scheduleId?: string
  unitName?: string
  /** PDF del horario en base64 (para API FirmaEC / app de escritorio). */
  getDocumentPdfBase64?: () => Promise<{ base64: string; fileName: string }>
  onCancel: () => void
  onConfirm: (result: SignatureConfirmResult) => void
}

type SignMode = 'certificado' | 'nombre' | 'app_firmaec'

/**
 * Modal de firma electrónica: el sello solo se crea al confirmar aquí.
 * Conecta .p12 local y, si hay X-API-KEY, la app FirmaEC (protocolo).
 */
export function SignatureGate({
  open,
  title,
  subtitle,
  defaultName,
  confirmLabel,
  slot,
  user,
  scheduleId,
  unitName,
  getDocumentPdfBase64,
  onCancel,
  onConfirm,
}: Props) {
  const [name, setName] = useState(defaultName)
  const [ack, setAck] = useState(false)
  const [mode, setMode] = useState<SignMode>('nombre')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [hasCert, setHasCert] = useState(false)
  const [hasImage, setHasImage] = useState(false)
  const [certCn, setCertCn] = useState('')
  const [apiReady, setApiReady] = useState(false)
  const [apiLabel, setApiLabel] = useState('')

  useEffect(() => {
    if (!open) return
    setName(defaultName)
    setAck(false)
    setError('')
    setBusy(false)
    const uid = user?.id
    const ready = !!uid && hasStoredCertificate(uid)
    const img = !!uid && !!getSignatureImage(uid)
    const cfg = loadFirmaEcConfig()
    const api = isFirmaEcApiConfigured(cfg)
    setHasCert(ready)
    setHasImage(img)
    setApiReady(api)
    setApiLabel(firmaEcApiStatusLabel(cfg))
    if (ready && uid) {
      const meta = getStoredCertMeta(uid)
      setCertCn(meta?.subjectCn ?? '')
      setPassword(getSessionPassword(uid))
      setMode(cfg.preferProtocol && api ? 'app_firmaec' : 'certificado')
    } else if (api && getDocumentPdfBase64) {
      setCertCn('')
      setPassword('')
      setMode('app_firmaec')
    } else if (img) {
      setCertCn('')
      setPassword('')
      setMode('certificado')
    } else {
      setCertCn('')
      setPassword('')
      setMode('nombre')
    }
  }, [open, defaultName, user, getDocumentPdfBase64])

  if (!open) return null

  async function finishWithQr(
    base: Omit<ElectronicSignRecord, 'qrDataUrl'>,
  ): Promise<ElectronicSignRecord> {
    const qrDataUrl = await buildSignatureQrDataUrl({
      subjectCn: base.subjectCn,
      slot: base.slot,
      signedAt: base.signedAt,
      serialNumber: base.serialNumber,
      issuerCn: base.issuerCn,
      method: base.method,
      scheduleId,
      unitName,
    })
    return { ...base, qrDataUrl }
  }

  async function submitNombre() {
    if (!user) {
      setError('Debe iniciar sesión para firmar')
      return
    }
    setBusy(true)
    setError('')
    try {
      const signedAt = new Date().toISOString()
      const subjectCn = name.trim()
      const stampText = `${subjectCn}\nFirmado electrónicamente · HGP\n${new Date(signedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}`
      const electronic = await finishWithQr({
        slot,
        subjectCn,
        signedAt,
        method: 'nombre_qr',
        stampText,
        imageDataUrl: getSignatureImage(user.id) ?? undefined,
      })
      onConfirm({ signedName: subjectCn, electronic })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo generar el QR')
    } finally {
      setBusy(false)
    }
  }

  async function submitCertificado() {
    if (!user) return
    setBusy(true)
    setError('')
    try {
      const result: ElectronicSignResult = await signWithStoredCertificate(
        user,
        slot,
        password,
      )
      const stampText = formatElectronicStamp(result)
      const electronic = await finishWithQr({
        slot: result.slot,
        subjectCn: result.subjectCn,
        serialNumber: result.serialNumber,
        issuerCn: result.issuerCn,
        signedAt: result.signedAt,
        method: result.method,
        stampText,
        imageDataUrl: result.imageDataUrl,
      })
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

  async function submitAppFirmaEc() {
    if (!user) return
    if (!getDocumentPdfBase64) {
      setError(
        'No hay documento PDF disponible para enviar a FirmaEC. Use certificado .p12 o firme con nombre.',
      )
      return
    }
    setBusy(true)
    setError('')
    try {
      const { base64, fileName } = await getDocumentPdfBase64()
      const { protocolUrl } = await openFirmaEcProtocolSign(
        base64,
        fileName,
        slot,
      )
      const signedAt = new Date().toISOString()
      const meta = getStoredCertMeta(user.id)
      const subjectCn = meta?.subjectCn || name.trim() || user.name
      const stampText = `${subjectCn}\nFirmado con app FirmaEC\n${new Date(signedAt).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' })}`
      const electronic = await finishWithQr({
        slot,
        subjectCn,
        serialNumber: meta?.serialNumber,
        issuerCn: meta?.issuerCn,
        signedAt,
        method: 'firmaec_protocol',
        stampText,
        imageDataUrl: getSignatureImage(user.id) ?? undefined,
      })
      // Si el navegador no abrió el esquema, avisar
      if (!protocolUrl.startsWith('firmaec://')) {
        setError('No se pudo armar el enlace FirmaEC')
        return
      }
      onConfirm({ signedName: subjectCn, electronic })
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo conectar con la API FirmaEC',
      )
    } finally {
      setBusy(false)
    }
  }

  const canSubmit =
    ack &&
    !!user &&
    (mode === 'nombre'
      ? name.trim().length >= 3
      : mode === 'certificado'
        ? hasCert || hasImage
        : apiReady && !!getDocumentPdfBase64)

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
          {' · '}Solo al confirmar se estampa la firma electrónica con QR.
        </p>
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-xs font-semibold ${
            apiReady
              ? 'border border-teal/30 bg-teal/5 text-navy'
              : 'border border-line bg-sand/40 text-muted'
          }`}
        >
          FirmaEC API: {apiLabel}
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">
            Método de firma
          </legend>
          {(hasCert || hasImage) && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                className="mt-1"
                checked={mode === 'certificado'}
                onChange={() => setMode('certificado')}
              />
              <span>
                <strong>Certificado .p12 / imagen</strong>
                <br />
                <span className="text-xs text-muted">
                  {hasCert
                    ? `Certificado: ${certCn || 'cargado'}`
                    : 'Imagen de firma cargada'}
                </span>
              </span>
            </label>
          )}
          {apiReady && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="radio"
                className="mt-1"
                checked={mode === 'app_firmaec'}
                onChange={() => setMode('app_firmaec')}
                disabled={!getDocumentPdfBase64}
              />
              <span>
                <strong>App FirmaEC (API MINTEL)</strong>
                <br />
                <span className="text-xs text-muted">
                  {getDocumentPdfBase64
                    ? 'Envía el PDF a FirmaEC y abre la app de escritorio'
                    : 'No hay PDF disponible en este paso'}
                </span>
              </span>
            </label>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input
              type="radio"
              className="mt-1"
              checked={mode === 'nombre'}
              onChange={() => setMode('nombre')}
            />
            <span>
              <strong>Confirmar con nombre + QR</strong>
              <br />
              <span className="text-xs text-muted">
                Genera sello electrónico local (sin .p12)
              </span>
            </span>
          </label>
        </fieldset>

        {mode === 'certificado' && hasCert && (
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
            Contraseña del certificado (.p12)
            <input
              type="password"
              autoComplete="off"
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm font-medium text-ink"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Si no tiene, déjela vacía"
            />
          </label>
        )}

        {mode === 'nombre' && (
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
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

        {!hasCert && !hasImage && !apiReady && (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            Para certificado .p12 o API FirmaEC, configure <strong>FirmaEC</strong>{' '}
            en Mi perfil. Mientras tanto puede firmar con nombre + QR.
          </p>
        )}

        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            Confirmo que firmo este horario bajo mi responsabilidad. El sello
            electrónico solo se aplicará al confirmar.
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
            disabled={busy || !canSubmit}
            onClick={() =>
              void (mode === 'certificado'
                ? submitCertificado()
                : mode === 'app_firmaec'
                  ? submitAppFirmaEc()
                  : submitNombre())
            }
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-40"
          >
            {busy
              ? mode === 'app_firmaec'
                ? 'Conectando FirmaEC…'
                : 'Firmando…'
              : mode === 'app_firmaec'
                ? 'Abrir FirmaEC y firmar'
                : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
