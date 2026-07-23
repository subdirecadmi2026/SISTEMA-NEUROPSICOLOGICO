import { useEffect, useState } from 'react'

type Props = {
  open: boolean
  title: string
  subtitle?: string
  defaultName: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: (signedName: string) => void
}

/**
 * Modal de firma explícita antes de enviar / aprobar / validar.
 */
export function SignatureGate({
  open,
  title,
  subtitle,
  defaultName,
  confirmLabel,
  onCancel,
  onConfirm,
}: Props) {
  const [name, setName] = useState(defaultName)
  const [ack, setAck] = useState(false)

  useEffect(() => {
    if (open) {
      setName(defaultName)
      setAck(false)
    }
  }, [open, defaultName])

  if (!open) return null

  const canConfirm = name.trim().length >= 3 && ack

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-navy/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signature-gate-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-white p-5 shadow-xl">
        <h2
          id="signature-gate-title"
          className="font-display text-xl text-navy"
        >
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        ) : null}

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

        <label className="mt-3 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            className="mt-1"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span>
            Confirmo que firmo este horario bajo mi responsabilidad y que los
            datos son correctos.
          </span>
        </label>

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
            disabled={!canConfirm}
            onClick={() => onConfirm(name.trim())}
            className="rounded-xl bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
