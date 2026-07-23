import { useEffect, useState } from 'react'
import type { AppUser } from '../types'
import {
  clearFirmaEcVault,
  getStoredCertMeta,
  hasStoredCertificate,
  loadFirmaEcConfig,
  saveCertificateForUser,
  saveFirmaEcConfig,
  setSessionPassword,
  type FirmaEcCertMeta,
  type FirmaEcConfig,
} from '../lib/firmaEc'

type Props = {
  user: AppUser
  onFlash: (msg: string) => void
}

/**
 * Carga del certificado FirmaEC (.p12) + contraseña de sesión y API opcional.
 */
export function FirmaEcSettings({ user, onFlash }: Props) {
  const [open, setOpen] = useState(false)
  const [meta, setMeta] = useState<FirmaEcCertMeta | null>(null)
  const [password, setPassword] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [cfg, setCfg] = useState<FirmaEcConfig>(() => loadFirmaEcConfig())
  const [error, setError] = useState('')

  useEffect(() => {
    setMeta(getStoredCertMeta(user.id))
  }, [user.id, open])

  async function handleSaveCert() {
    if (!file) {
      setError('Seleccione el archivo .p12 / .pfx')
      return
    }
    if (!password) {
      setError('Ingrese la contraseña del certificado')
      return
    }
    setBusy(true)
    setError('')
    try {
      const saved = await saveCertificateForUser(user, file, password)
      setMeta(saved)
      setFile(null)
      onFlash(`Certificado FirmaEC cargado: ${saved.subjectCn}`)
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

  function handleSaveCfg() {
    saveFirmaEcConfig(cfg)
    onFlash('Configuración FirmaEC guardada')
  }

  const loaded = hasStoredCertificate(user.id)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-white/25 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
        title="Certificado de firma electrónica FirmaEC"
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
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-white p-5 text-ink shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-xl text-navy">
                  Firma electrónica · FirmaEC
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Suba su certificado (.p12) emitido por entidad acreditada. La
                  contraseña solo se guarda en esta sesión del navegador.
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

            {meta && (
              <div className="mb-4 rounded-xl border border-teal/30 bg-teal/5 px-3 py-2 text-sm">
                <p className="font-semibold text-navy">{meta.subjectCn}</p>
                <p className="text-xs text-muted">
                  Archivo: {meta.fileName}
                  {meta.issuerCn ? ` · Emisor: ${meta.issuerCn}` : ''}
                </p>
                {meta.notAfter && (
                  <p className="text-xs text-muted">
                    Válido hasta{' '}
                    {new Date(meta.notAfter).toLocaleDateString('es-EC')}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-rose-800 underline"
                  onClick={() => {
                    clearFirmaEcVault(user.id)
                    setMeta(null)
                    setPassword('')
                    onFlash('Certificado eliminado de este navegador')
                  }}
                >
                  Quitar certificado
                </button>
              </div>
            )}

            <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
              Archivo .p12 / .pfx
              <input
                type="file"
                accept=".p12,.pfx,application/x-pkcs12"
                className="mt-1 block w-full text-sm"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted">
              Contraseña del certificado
              <input
                type="password"
                autoComplete="off"
                className="mt-1 w-full rounded-xl border border-line px-3 py-2 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña del .p12"
              />
            </label>

            {error && (
              <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
                {error}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSaveCert()}
                className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? 'Validando…' : 'Guardar certificado'}
              </button>
              {meta && password && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionPassword(user.id, password)
                    onFlash('Contraseña guardada solo para esta sesión')
                  }}
                  className="rounded-xl border border-line px-3 py-2 text-sm font-semibold"
                >
                  Guardar clave en sesión
                </button>
              )}
            </div>

            <details className="mt-5 rounded-xl border border-line">
              <summary className="cursor-pointer bg-sand/40 px-3 py-2 text-sm font-semibold text-navy">
                API FirmaEC institucional (opcional)
              </summary>
              <div className="space-y-3 p-3 text-sm">
                <p className="text-xs text-muted">
                  Para el flujo oficial con protocolo{' '}
                  <code className="text-[11px]">firmaec://</code> el hospital
                  debe registrarse en MINTEL y obtener X-API-KEY. Sin API key
                  igual puede firmar con el .p12 cargado aquí.
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
                    placeholder="Clave institucional"
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Cédula del firmante
                  <input
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5"
                    value={cfg.cedula}
                    onChange={(e) =>
                      setCfg({ ...cfg, cedula: e.target.value })
                    }
                  />
                </label>
                <label className="block text-xs font-semibold text-muted">
                  Ambiente
                  <select
                    className="mt-1 w-full rounded-lg border border-line px-2 py-1.5"
                    value={cfg.ambiente}
                    onChange={(e) =>
                      setCfg({
                        ...cfg,
                        ambiente: e.target.value as FirmaEcConfig['ambiente'],
                      })
                    }
                  >
                    <option value="pruebas">Pruebas (impws)</option>
                    <option value="produccion">Producción (ws)</option>
                  </select>
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
