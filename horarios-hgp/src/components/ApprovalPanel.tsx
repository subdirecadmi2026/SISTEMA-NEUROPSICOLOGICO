import type { ScheduleDoc, AppUser } from '../types'
import { STATUS_LABEL } from '../types'
import { transitionStatus } from '../lib/auth'
import { runAllValidations } from '../lib/validation'

type Props = {
  doc: ScheduleDoc
  user: AppUser | null
  onChange: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
}

export function ApprovalPanel({ doc, user, onChange, onFlash }: Props) {
  const alerts = runAllValidations(doc)
  const errors = alerts.filter((a) => a.level === 'error')

  function go(next: ScheduleDoc['status']) {
    if (!user) {
      onFlash('Inicie sesión para cambiar el estado')
      return
    }
    if (next === 'EN_REVISION' && errors.length > 0) {
      onFlash('Corrija errores antes de enviar a revisión')
      return
    }
    const res = transitionStatus(doc, next, user)
    if (!res.ok) {
      onFlash(res.error)
      return
    }
    onChange(res.doc)
    onFlash(`Estado: ${STATUS_LABEL[next]}`)
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-navy">Flujo de aprobación</h2>
          <p className="text-sm text-muted">
            Estado actual:{' '}
            <span className="font-semibold text-navy">
              {STATUS_LABEL[doc.status]}
            </span>{' '}
            · v{doc.version}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {doc.status === 'BORRADOR' && (
            <button
              type="button"
              onClick={() => go('EN_REVISION')}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white"
            >
              Enviar a revisión
            </button>
          )}
          {doc.status === 'EN_REVISION' && (
            <>
              <button
                type="button"
                onClick={() => go('BORRADOR')}
                className="rounded-lg border border-line px-3 py-2 text-sm"
              >
                Devolver a borrador
              </button>
              <button
                type="button"
                onClick={() => go('APROBADO')}
                className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white"
              >
                Aprobar
              </button>
            </>
          )}
          {doc.status === 'APROBADO' && (
            <button
              type="button"
              onClick={() => go('ARCHIVADO')}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Archivar
            </button>
          )}
          {(doc.status === 'ARCHIVADO' || doc.status === 'APROBADO') &&
            user?.role === 'admin' && (
              <button
                type="button"
                onClick={() => go('BORRADOR')}
                className="rounded-lg border border-amber-600 px-3 py-2 text-sm text-amber-800"
              >
                Reabrir (admin)
              </button>
            )}
        </div>
      </div>

      {doc.signatures.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {doc.signatures.map((s) => (
            <div
              key={s.at + s.name}
              className="rounded-lg border border-line bg-sand/40 px-3 py-2 text-xs"
            >
              <p className="font-semibold text-navy">{s.name}</p>
              <p className="text-muted">{s.cargo}</p>
              <p className="text-muted">
                {new Date(s.at).toLocaleString('es-EC')}
              </p>
            </div>
          ))}
        </div>
      )}

      {alerts.length > 0 && (
        <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-line">
          {alerts.slice(0, 30).map((a, i) => (
            <p
              key={`${a.code}-${i}`}
              className={`border-b border-line px-3 py-1.5 text-xs last:border-0 ${
                a.level === 'error'
                  ? 'bg-red-50 text-red-800'
                  : a.level === 'warning'
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-muted'
              }`}
            >
              {a.message}
            </p>
          ))}
        </div>
      )}
    </section>
  )
}
