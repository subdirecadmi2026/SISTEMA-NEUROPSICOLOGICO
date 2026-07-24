import type { ServiceType } from '../types'
import { habitualTurnoOptions } from '../lib/staffOptions'

type Props = {
  serviceType: ServiceType
  value: string
  disabled?: boolean
  className?: string
  title?: string
  onChange: (code: string) => void
  /** Permite escribir un código fuera del catálogo. */
  allowCustom?: boolean
}

/**
 * Selector de clave habitual (solo turnos con horas).
 * Evita usar áreas (H/E/QX) como jornada del personal.
 */
export function HabitualCodeSelect({
  serviceType,
  value,
  disabled,
  className = '',
  title,
  onChange,
  allowCustom = true,
}: Props) {
  const options = habitualTurnoOptions(serviceType)
  const current = value.trim().toUpperCase()
  const known = options.some((o) => o.code.toUpperCase() === current)

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <select
        disabled={disabled}
        aria-label="Clave habitual"
        title={title ?? 'Clave habitual del turno (CE, PT1, HE, X…)'}
        className="w-full rounded-lg border border-line bg-white px-2 py-2 text-sm font-bold text-navy outline-none ring-teal focus:ring-2 disabled:opacity-60"
        value={known ? current : allowCustom && current ? '__custom__' : ''}
        onChange={(e) => {
          const v = e.target.value
          if (v === '__custom__') return
          onChange(v)
        }}
      >
        <option value="">Elegir clave…</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>
            {o.code} · {o.hours} h — {o.label}
          </option>
        ))}
        {allowCustom && current && !known ? (
          <option value="__custom__">
            Otra: {current} (editar abajo)
          </option>
        ) : null}
      </select>
      {allowCustom && (!known || current === '') ? (
        <input
          disabled={disabled}
          aria-label="Código personalizado"
          className="w-full rounded-lg border border-dashed border-line bg-sand/30 px-2 py-1.5 text-center text-xs font-bold uppercase text-navy disabled:opacity-60"
          value={current}
          placeholder="Cód."
          maxLength={8}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      ) : null}
    </div>
  )
}
