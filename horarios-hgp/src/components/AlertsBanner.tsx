import type { ScheduleDoc } from '../types'

type Props = {
  doc: ScheduleDoc
  onGoContingency?: () => void
  onGoDistribution?: () => void
}

/** Desactivado: las alertas informativas ya no se muestran en pantalla. */
export function AlertsBanner(_props: Props) {
  return null
}
