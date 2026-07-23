import { useEffect, useRef, useState } from 'react'
import type { AppUser } from '../types'
import {
  clearFirmaEcVault,
  clearSignatureImage,
  certificateDaysLeft,
  getSignatureImage,
  getStoredCertMeta,
  hasStoredCertificate,
  isCertificateExpired,
  loadFirmaEcConfig,
  saveCertificateForUser,
  saveFirmaEcConfig,
  saveSignatureImageFile,
  setSessionPassword,
  type FirmaEcCertMeta,
  type FirmaEcConfig,
} from '../lib/firmaEc'

type Props = {
  user: AppUser
  onFlash: (msg: string) => void
}

/**
 * Carga certificado FirmaEC (.p12) y/o imagen de firma.
 */
export function FirmaEcSettings({ user, onFlash }: Props) {
  const [open, setOpen] = useState(false)
  const [meta, setMeta] = useState<FirmaEcCertMeta | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [cfg, setCfg] = useState<FirmaEcConfig>(() => loadFirmaEcConfig())
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setMeta(getStoredCertMeta(user.id))
    setImagePreview(getSignatureImage(user.id))
    setError('')
  }, [user.id, open])

  function takeP12File(f: File | null) {
    if (!f) return
    setFile(f)
    setError('')
  }

  async function handleSaveCert() {
    if (!file) {
      setError('Seleccione el archivo .p12 o .pfx de su firma electrónica')
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await saveCertificateForUser(user, file, password)
      setMeta(saved)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      onFlash(`Certificado cargado: ${saved.subjectCn}`)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo abrir el certificado. Revise la contraseña.',
      )
    } finally {
      setBusy(false)
    }
  }

  async function handleSaveImage(f: File | null) {
    if (!f) return
    setBusy(true)
    setError('')
    try {
      const url = await saveSignatureImageFile(user, f)
      setImagePreview(url)
      onFlash('Imagen de firma guardada')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la imagen')
    } finally {
      setBusy(false)
    }
  }

  function handleSaveCfg() {
    saveFirmaEcConfig(cfg)
    onFlash('Configuración FirmaEC guardada')
  }

  const loaded = hasStoredCertificate(user.id) || !!imagePreview

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-teal-soft/50 bg-teal/25 px-3 py-2 text-sm font-semibold text-white hover:bg-teal/40"
        title="Cargar certificado o imagen de firma"
      >
        FirmaEC
        {loaded ? (
          <span className="ml-1.5 text-[10px] font-bold text-teal-soft">●</span>
        ) : null}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center bg-navy/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-5 text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-xl text-navy">
                  Cargar firma electrónica
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Puede cargar el certificado <strong>.p12 / .pfx</strong> de
                  FirmaEC y/o una <strong>imagen</strong> de su firma para el
                  horario.
                </p>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-muted hover:text-navy"
                onClick={() => setOpen(false)}
              >
                Cerrar
              </button>
            </div>

            {/* 1. Certificado .p12 */}
            <section className="mb-4 rounded-xl border border-line p-3">
              <h3 className="text-sm font-bold text-navy">
                1. Certificado FirmaEC (.p12 / .pfx)
              </h3>
              <p className="mt-1 text-xs text-muted">
                Es el archivo que le entregó la entidad certificadora (BCE,
                Security Data, etc.), no un PDF ni una foto.
              </p>

              {meta && (
                <div className="mt-2 rounded-lg border border-teal/30 bg-teal/5 px-3 py-2 text-sm">
                  <p className="font-semibold text-navy">{meta.subjectCn}</p>
                  <p className="text-xs text-muted">
                    {meta.fileName}
                    {meta.issuerCn ? ` · ${meta.issuerCn}` : ''}
                    {meta.hasPrivateKey === false
                      ? ' · sin clave privada detectada'
                      : ''}
                  </p>
                  {meta.notAfter && (
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        isCertificateExpired(meta)
                          ? 'text-rose-800'
                          : (certificateDaysLeft(meta) ?? 99) <= 30
                            ? 'text-amber-800'
                            : 'text-muted'
                      }`}
                    >
                      {isCertificateExpired(meta)
                        ? `Vencido desde ${new Date(meta.notAfter).toLocaleDateString('es-EC')}`
                        : `Vigente hasta ${new Date(meta.notAfter).toLocaleDateString('es-EC')}${
                            (certificateDaysLeft(meta) ?? 999) <= 30
                              ? ` · quedan ${certificateDaysLeft(meta)} día(s)`
                              : ''
                          }`}
                    </p>
                  )}
                </div>
              )}

              <div
                className={`mt-3 rounded-xl border-2 border-dashed px-3 py-6 text-center transition ${
                  dragOver
                    ? 'border-teal bg-teal/10'
                    : 'border-line bg-sand/30'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOver(true)
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  takeP12File(e.dataTransfer.files?.[0] ?? null)
                }}
              >
                <p className="text-sm text-ink">
                  Arrastre aquí el .p12 o elija el archivo
                </p>
                <button
                  type="button"
                  className="mt-2 rounded-lg bg-navy px-3 py-1.5 text-xs font-semibold text-white"
                  onClick={() => fileRef.current?.click()}
                >
                  Elegir archivo .p12
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".p12,.pfx,application/x-pkcs12,application/pkcs12,*/*"
                  className="hidden"
                  onChange={(e) => takeP12File(e.target.files?.[0] ?? null)}
                />
                {file && (
                  <p className="mt-2 text-xs font-semibold text-teal">
                    Seleccionado: {file.name} (
                    {Math.round(file.size / 1024)} KB)
                  </p>
                )}
              </div>

              <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
                Contraseña del certificado
                <input
                  type="password"
                  autoComplete="new-password"
                  className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Si no tiene contraseña, deje vacío"
                />
              </label>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !file}
                  onClick={() => void handleSaveCert()}
                  className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {busy ? 'Validando…' : 'Guardar certificado'}
                </button>
                {meta && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSessionPassword(user.id, password)
                        onFlash('Contraseña guardada en esta sesión')
                      }}
                      className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
                    >
                      Guardar clave en sesión
                    </button>
                    <button
                      type="button"
                      className="rounded-xl border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-900"
                      onClick={() => {
                        void clearFirmaEcVault(user.id).then(() => {
                          setMeta(null)
                          setImagePreview(null)
                          setPassword('')
                          setFile(null)
                          onFlash('Firma eliminada de este navegador')
                        })
                      }}
                    >
                      Quitar todo
                    </button>
                  </>
                )}
              </div>
            </section>

            {/* 2. Imagen */}
            <section className="mb-4 rounded-xl border border-line p-3">
              <h3 className="text-sm font-bold text-navy">
                2. Imagen de firma (opcional)
              </h3>
              <p className="mt-1 text-xs text-muted">
                Si no tiene el .p12 a mano, puede subir una imagen PNG/JPG de su
                firma para estamparla en la casilla del horario.
              </p>
              {imagePreview && (
                <div className="mt-2 rounded-lg border border-line bg-white p-2">
                  <img
                    src={imagePreview}
                    alt="Vista previa de firma"
                    className="mx-auto max-h-20 object-contain"
                  />
                  <button
                    type="button"
                    className="mt-1 text-xs font-semibold text-rose-800 underline"
                    onClick={() => {
                      clearSignatureImage(user.id)
                      setImagePreview(null)
                      onFlash('Imagen de firma eliminada')
                    }}
                  >
                    Quitar imagen
                  </button>
                </div>
              )}
              <button
                type="button"
                className="mt-2 rounded-lg border border-line bg-sand/40 px-3 py-2 text-xs font-semibold"
                onClick={() => imgRef.current?.click()}
              >
                Elegir imagen PNG/JPG
              </button>
              <input
                ref={imgRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/*"
                className="hidden"
                onChange={(e) =>
                  void handleSaveImage(e.target.files?.[0] ?? null)
                }
              />
            </section>

            {error && (
              <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {error}
              </p>
            )}

            <details className="rounded-xl border border-line">
              <summary className="cursor-pointer bg-sand/40 px-3 py-2 text-sm font-semibold text-navy">
                API FirmaEC institucional (opcional)
              </summary>
              <div className="space-y-3 p-3 text-sm">
                <p className="text-xs text-muted">
                  Solo si el hospital tiene X-API-KEY de MINTEL. No es
                  necesario para cargar el .p12 aquí.
                </p>
                <label className="block text-xs font-semibold text-muted">
                  Sistema
                  <input
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5"
                    value={cfg.sistema}
                    onChange={(e) =>
                      setCfg({ ...cfg, sistema: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  X-API-KEY
                  <input
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5"
                    value={cfg.apiKey}
                    onChange={(e) =>
                      setCfg({ ...cfg, apiKey: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Cédula
                  <input
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5"
                    value={cfg.cedula}
                    onChange={(e) =>
                      setCfg({ ...cfg, cedula: e.target.value })
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={handleSaveCfg}
                  className="rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Guardar API
                </button>
              </div>
            </details>
          </div>
        </div>
      )}
    </>
  )
}
