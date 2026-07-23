import { useMemo, useState } from 'react'
import type { ScheduleDoc, AppUser } from '../types'
import { STATUS_LABEL } from '../types'
import {
  transitionStatus,
  roleLabel,
  isJefeRole,
  isRevisorRole,
  isValidadorRole,
  resolveReviewComments,
} from '../lib/auth'
import { runAllValidations } from '../lib/validation'
import { notifyJefeScheduleValidated } from '../lib/notifications'
import { SignatureGate } from './SignatureGate'

type Props = {
  doc: ScheduleDoc
  user: AppUser | null
  onChange: (doc: ScheduleDoc) => void
  onFlash: (msg: string) => void
  onNotify?: () => void
}

const STEPS: Array<{ key: ScheduleDoc['status']; label: string }> = [
  { key: 'BORRADOR', label: '1. Elaborar (Jefe)' },
  { key: 'EN_REVISION', label: '2. Revisar' },
  { key: 'APROBADO', label: '3. Aprobado' },
  { key: 'ARCHIVADO', label: '4. Validar' },
]

type SignIntent =
  | { next: 'EN_REVISION' }
  | { next: 'APROBADO' }
  | { next: 'ARCHIVADO' }
  | null

export function ApprovalPanel({
  doc,
  user,
  onChange,
  onFlash,
  onNotify,
}: Props) {
  const [correction, setCorrection] = useState('')
  const [signIntent, setSignIntent] = useState<SignIntent>(null)
  const alerts = runAllValidations(doc)
  const errors = alerts.filter((a) => a.level === 'error')
  const named = doc.staff.filter((s) => s.name.trim()).length
  const stepIdx = STEPS.findIndex((s) => s.key === doc.status)
  const comments = doc.reviewComments ?? []
  const openComments = useMemo(
    () => comments.filter((c) => !c.resolved),
    [comments],
  )

  const canSend = !!user && isJefeRole(user.role)
  const canReview = !!user && isRevisorRole(user.role)
  const canValidate = !!user && isValidadorRole(user.role)

  function requestSend() {
    if (!user) {
      onFlash('Seleccione un usuario arriba (Entrar como) para el flujo')
      return
    }
    if (named < 1) {
      onFlash('Debe registrar al menos 1 nombre de personal/médico')
      return
    }
    if (Object.keys(doc.cells).length === 0) {
      onFlash('Pinte al menos una clave antes de enviar a revisión')
      return
    }
    if (!doc.jefeServicio.trim()) {
      onFlash('Indique el jefe / líder de servicio antes de enviar')
      return
    }
    setSignIntent({ next: 'EN_REVISION' })
  }

  function go(
    next: ScheduleDoc['status'],
    opts?: { comment?: string; signedName?: string },
  ) {
    if (!user) {
      onFlash('Seleccione un usuario arriba (Entrar como) para el flujo')
      return
    }
    const res = transitionStatus(doc, next, user, opts)
    if (!res.ok) {
      onFlash(res.error)
      return
    }
    onChange(res.doc)
    setCorrection('')
    setSignIntent(null)
    if (next === 'ARCHIVADO') {
      notifyJefeScheduleValidated(
        res.doc,
        opts?.signedName?.trim() || user.name,
      )
      onNotify?.()
    }
    onFlash(
      next === 'EN_REVISION'
        ? `Firmado y enviado a revisión · ${opts?.signedName || user.name}`
        : next === 'APROBADO'
          ? `Firmado y aprobado · ${opts?.signedName || user.name}`
          : next === 'ARCHIVADO'
            ? `Firmado y validado · aviso enviado al jefe`
            : `Estado: ${STATUS_LABEL[next]} · ${user.name}`,
    )
  }

  const signTitle =
    signIntent?.next === 'EN_REVISION'
      ? 'Firmar y enviar a revisión'
      : signIntent?.next === 'APROBADO'
        ? 'Firmar y aprobar (Revisor)'
        : signIntent?.next === 'ARCHIVADO'
          ? 'Firmar y validar'
          : ''

  const signConfirm =
    signIntent?.next === 'EN_REVISION'
      ? 'Firmar y enviar'
      : signIntent?.next === 'APROBADO'
        ? 'Firmar y aprobar'
        : 'Firmar y validar'

  return (
    <section
      className="no-print mb-4 rounded-2xl border border-line bg-white/85 p-4 shadow-sm"
      id="flujo-aprobacion"
    >
      <SignatureGate
        open={!!signIntent}
        title={signTitle}
        subtitle="Su firma quedará impresa en el horario institucional (Jefe / Revisor / Validador)."
        defaultName={user?.name ?? ''}
        confirmLabel={signConfirm}
        onCancel={() => setSignIntent(null)}
        onConfirm={(signedName) => {
          if (!signIntent) return
          go(signIntent.next, { signedName })
        }}
      />

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
          {doc.status === 'BORRADOR' && canSend && (
            <button
              type="button"
              onClick={requestSend}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white"
            >
              Firmar y enviar a revisión
            </button>
          )}
          {doc.status === 'EN_REVISION' && canReview && (
            <button
              type="button"
              onClick={() => setSignIntent({ next: 'APROBADO' })}
              className="rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white"
            >
              Firmar y aprobar
            </button>
          )}
          {doc.status === 'APROBADO' && canValidate && (
            <button
              type="button"
              onClick={() => setSignIntent({ next: 'ARCHIVADO' })}
              className="rounded-lg bg-teal px-3 py-2 text-sm font-semibold text-white"
            >
              Firmar y validar
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

      <p className="mb-3 text-xs text-muted">
        <strong>Jefe</strong> firma y envía → <strong>Revisor</strong> firma y
        aprueba (o pide corrección) → <strong>Validador</strong> firma y
        aprueba; el jefe recibe aviso de horario aprobado.
      </p>

      {doc.status === 'EN_REVISION' && canReview && (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
          <p className="mb-1 text-sm font-semibold text-navy">
            Pedir corrección (devolver al jefe)
          </p>
          <p className="mb-2 text-xs text-muted">
            El horario vuelve a borrador. El jefe verá su comentario para
            corregir.
          </p>
          <textarea
            className="mb-2 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            rows={3}
            placeholder="Ej.: Día 12 sin cobertura nocturna; complete N1 o justifique…"
            value={correction}
            onChange={(e) => setCorrection(e.target.value)}
          />
          <button
            type="button"
            onClick={() => go('BORRADOR', { comment: correction })}
            className="rounded-lg border border-amber-700 bg-white px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
          >
            Devolver con comentario
          </button>
        </div>
      )}

      {openComments.length > 0 && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50/80 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-rose-900">
              Correcciones pendientes ({openComments.length})
            </p>
            {doc.status === 'BORRADOR' && canSend && (
              <button
                type="button"
                onClick={() => {
                  onChange(resolveReviewComments(doc, user))
                  onFlash('Correcciones marcadas como atendidas')
                }}
                className="rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-semibold text-rose-900"
              >
                Marcar atendidas
              </button>
            )}
          </div>
          <ul className="space-y-2">
            {openComments.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-rose-100 bg-white px-3 py-2 text-sm"
              >
                <p className="text-ink">{c.message}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {c.userName} · {roleLabel(c.role)} ·{' '}
                  {new Date(c.at).toLocaleString('es-EC')}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {comments.length > 0 && openComments.length === 0 && (
        <details className="mb-3 rounded-lg border border-line">
          <summary className="cursor-pointer bg-sand/50 px-3 py-2 text-xs font-semibold text-navy">
            Historial de correcciones ({comments.length})
          </summary>
          <ul className="max-h-40 overflow-y-auto">
            {comments.map((c) => (
              <li
                key={c.id}
                className="border-t border-line px-3 py-2 text-xs text-muted"
              >
                <span className="font-semibold text-navy">{c.userName}:</span>{' '}
                {c.message}
              </li>
            ))}
          </ul>
        </details>
      )}

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
            Alertas informativas ({alerts.length}) — {errors.length} crítico(s)
            · no bloquean el envío
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
