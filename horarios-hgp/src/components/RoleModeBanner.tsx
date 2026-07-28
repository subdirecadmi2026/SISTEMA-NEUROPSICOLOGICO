import type { AppUser, ScheduleDoc } from '../types'
import { STATUS_LABEL } from '../types'
import {
  isJefeRole,
  isRevisorRole,
  isValidadorRole,
  roleLabel,
} from '../lib/auth'

type Props = {
  user: AppUser | null
  doc: ScheduleDoc
  canEdit: boolean
}

/** Explica qué puede hacer la sesión actual con este horario. */
export function RoleModeBanner({ user, doc, canEdit }: Props) {
  if (!user) {
    return (
      <div className="no-print border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
        Sin sesión · elija su perfil en la pantalla de acceso
      </div>
    )
  }

  const role = roleLabel(user.role)
  const status = STATUS_LABEL[doc.status]

  if (user.role === 'admin') {
    return (
      <div className="no-print border-b border-sky-200 bg-sky-50 px-4 py-2 text-center text-sm text-sky-950">
        <strong>{role}</strong> · acceso total · horario en{' '}
        <strong>{status}</strong>
        {canEdit ? '' : ' (puede reabrir desde el flujo de aprobación)'}
      </div>
    )
  }

  if (isJefeRole(user.role)) {
    if (canEdit) {
      return (
        <div className="no-print border-b border-teal/30 bg-teal/10 px-4 py-2 text-center text-sm text-navy">
          <strong>Jefe de servicio</strong> · puede elaborar y guardar · estado{' '}
          <strong>{status}</strong>
          {' · '}
          use <strong>Flujo / archivo</strong> para ver el estado de cada mes
        </div>
      )
    }
    return (
      <div className="no-print border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm text-amber-950">
        <strong>Jefe</strong> · edición bloqueada ({status}). Revise{' '}
        <strong>Flujo / archivo</strong> o espere devolución del revisor.
      </div>
    )
  }

  if (isRevisorRole(user.role)) {
    const tip =
      doc.status === 'EN_REVISION'
        ? 'Puede aprobar o devolver con comentario de corrección.'
        : doc.status === 'BORRADOR'
          ? 'El jefe aún no ha enviado este horario.'
          : 'Solo visualización en este estado.'
    return (
      <div className="no-print border-b border-violet-200 bg-violet-50 px-4 py-2 text-center text-sm text-violet-950">
        <strong>Revisor (visualización)</strong> · no edita turnos · {tip}
      </div>
    )
  }

  if (isValidadorRole(user.role)) {
    const tip =
      doc.status === 'APROBADO'
        ? 'Puede validar este horario.'
        : doc.status === 'ARCHIVADO'
          ? 'Horario ya validado.'
          : 'Espere a que el revisor apruebe.'
    return (
      <div className="no-print border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-center text-sm text-emerald-950">
        <strong>Validador</strong> · no edita turnos · {tip}
      </div>
    )
  }

  return (
    <div className="no-print border-b border-line bg-sand/60 px-4 py-2 text-center text-sm text-muted">
      Sesión: {role} · estado {status}
    </div>
  )
}
