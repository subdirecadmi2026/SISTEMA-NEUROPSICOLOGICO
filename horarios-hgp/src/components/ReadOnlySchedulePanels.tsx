import type { ScheduleDoc } from '../types'
import { ScheduleTable } from './ScheduleTable'

type Props = {
  doc: ScheduleDoc
  compact?: boolean
}

/**
 * Planillas de solo lectura para revisor / validador.
 * Médico: horario (turnos) + distribución (áreas), por separado.
 */
export function ReadOnlySchedulePanels({ doc, compact = true }: Props) {
  const isMedico = doc.serviceType === 'medico'

  return (
    <div className="mb-6 space-y-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="border-b border-line bg-sand/40 px-4 py-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {isMedico
              ? 'Horario · consulta / jornada (solo visualización)'
              : 'Planilla (solo visualización)'}
          </p>
          {isMedico ? (
            <p className="text-[11px] text-muted">
              Turnos CE, PT, X, L… — no se edita desde este perfil
            </p>
          ) : null}
        </div>
        <ScheduleTable
          doc={doc}
          gridMode="turno"
          readOnly
          paintMode={false}
          activeCode=""
          compact={compact}
          onChange={() => undefined}
          onAddStaff={() => undefined}
          onNewDemo={() => undefined}
        />
      </div>

      {isMedico ? (
        <div className="overflow-hidden rounded-2xl border border-teal/30 bg-white shadow-sm">
          <div className="border-b border-teal/20 bg-teal/5 px-4 py-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal">
              Distribución · áreas de servicio (solo visualización)
            </p>
            <p className="text-[11px] text-muted">
              CX, Emergencia, Hospitalización, Interconsultas, Quirófano, UCI…
            </p>
          </div>
          <ScheduleTable
            doc={doc}
            gridMode="area"
            readOnly
            paintMode={false}
            activeCode=""
            compact={compact}
            onChange={() => undefined}
            onAddStaff={() => undefined}
            onNewDemo={() => undefined}
          />
        </div>
      ) : null}
    </div>
  )
}
