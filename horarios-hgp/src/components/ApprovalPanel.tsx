import type { ScheduleDoc, AppUser } from '../types'
import { STATUS_LABEL } from '../types'
import { transitionStatus, roleLabel } from '../lib/auth'
import { runAllValidations } from '../lib/validation'

type Props = {
  doc: ScheduleDoc
  user: AppUser | null
  onChange: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
}

const STEPS: Array<{ key: ScheduleDoc['status']; label: string }> = [
  { key: 'BORRADOR', label: '1. Elaborar' },
  { key: 'EN_REVISION', label: '2. Revisar' },
  { key: 'APROBADO', label: '3. Aprobar' },
  { key: 'ARCHIVADO', label: '4. Archivar' },
]

export function ApprovalPanel({ doc, user, onChange, onFlash }: Props) {
  const alerts = runAllValidations(doc)
  const errors = alerts.filter((a) => a.level === 'error')
  const named = doc.staff.filter((s) => s.name.trim()).length
  const stepIdx = STEPS.findIndex((s) => s.key === doc.status)

  function go(next: ScheduleDoc['status']) {
    if (!user) {
      onFlash('Seleccione un usuario arriba (Entrar como) para firmar el flujo')
      return
    }
    if (next === 'EN_REVISION') {
      if (named < 1) {
        onFlash('Debe registrar al menos 1 nombre de personal/médico')
        return
      }
      if (errors.length > 0) {
        onFlash('Corrija errores (cobertura/contingencia) antes de enviar')
        return
      }
    }
    const res = transitionStatus(doc, next, user)
    if (!res.ok) {
      onFlash(res.error)
      return
    }
    onChange(res.doc)
    onFlash(`Estado: ${STATUS_LABEL[next]} · firmó ${user.name}`)
  }

  return (
    <section className="no-print mb-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-navy">Flujo de aprobación</h2>
          <p className="text-sm text-muted">
            Estado:{' '}
            <span className="font-semibold text-navy">
              {STATUS_LABEL[doc.status]}
            </span>{' '}
            · v{doc.version}
            {user ? (
              <>
                {' '}
                · Sesión: <strong>{user.name}</strong> ({roleLabel(user.role)})
              </>
            ) : (
              <span className="ml-1 font-semibold text-amber-800">
                · Sin sesión: use «Entrar como»
              </span>
            )}
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
                Aprobar y firmar
              </button>
            </>
          )}
          {doc.status === 'APROBADO' && (
            <button
              type="button"
              onClick={() => go('ARCHIVADO')}
              className="rounded-lg border border-line px-3 py-2 text-sm"
            >
              Archivar en Talento Humano
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

      {/* Stepper */}
      <ol className="mb-3 grid gap-2 sm:grid-cols-4">
        {STEPS.map((s, i) => {
          const active = s.key === doc.status
          const done = i < stepIdx
          return (
            <li
              key={s.key}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                active
                  ? 'border-teal bg-teal text-white'
                  : done
                    ? 'border-navy/20 bg-navy/5 text-navy'
                    : 'border-line bg-sand/40 text-muted'
              }`}
            >
              {s.label}
            </li>
          )
        })}
      </ol>

      <p className="mb-2 text-xs text-muted">
        Guía: <strong>Líder</strong> elabora y envía →{' '}
        <strong>Gestión / Subdirección / Dirección</strong> aprueba →{' '}
        <strong>Talento Humano</strong> archiva. Al aprobarse, el horario se
        bloquea.
      </p>

      {doc.signatures.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {doc.signatures.map((s) => (
            <div
              key={s.at + s.name + s.role}
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
        <details className="mt-3 rounded-lg border border-line">
          <summary className="cursor-pointer bg-sand/50 px-3 py-2 text-xs font-semibold text-navy">
            Alertas de validación ({alerts.length}) — {errors.length} error(es)
          </summary>
          <div className="max-h-40 overflow-y-auto">
            {alerts.slice(0, 40).map((a, i) => (
              <p
                key={`${a.code}-${i}`}
                className={`border-t border-line px-3 py-1.5 text-xs ${
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
        </details>
      )}
    </section>
  )
}
