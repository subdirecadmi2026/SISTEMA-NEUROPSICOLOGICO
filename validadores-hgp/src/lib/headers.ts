import { EMERGENCIA_FIELDS, EGRESOS_FIELDS, type ValidatorKind } from "../types";
import { normalizeHeader } from "./normalize";

const EGRESOS_ALIASES: Record<(typeof EGRESOS_FIELDS)[number], string[]> = {
  historiaClinica: [
    "historia clinica",
    "historia",
    "hc",
    "nro historia",
    "numero de historia",
    "nhc",
    "n historia",
  ],
  cedula: ["cedula", "ci", "identificacion", "documento", "nui", "dni"],
  apellidosNombres: [
    "apellidos y nombres",
    "nombres y apellidos",
    "paciente",
    "nombre",
    "nombres",
    "apellidos nombres",
  ],
  sexo: ["sexo", "genero"],
  fechaNacimiento: ["fecha de nacimiento", "fecha nacimiento", "fnacimiento", "nacimiento"],
  edad: ["edad"],
  fechaIngreso: ["fecha de ingreso", "fecha ingreso", "ingreso", "f ingreso"],
  fechaEgreso: ["fecha de egreso", "fecha egreso", "egreso", "f egreso", "alta"],
  diasEstada: ["dias de estada", "dias estada", "estada", "dias de estancia", "estancia"],
  especialidad: ["especialidad"],
  servicio: ["servicio", "area", "unidad"],
  diagnosticoPrincipal: [
    "diagnostico principal",
    "dx principal",
    "cie10",
    "cie 10",
    "diagnostico",
    "dx",
  ],
  diagnosticosSecundarios: [
    "diagnosticos secundarios",
    "dx secundarios",
    "diagnostico secundario",
  ],
  condicionEgreso: ["condicion de egreso", "condicion egreso", "condicion", "estado de egreso"],
  tipoEgreso: ["tipo de egreso", "tipo egreso"],
  procedimiento: ["procedimiento", "cirugia", "qx"],
  medico: ["medico", "profesional", "tratante", "medico tratante"],
  establecimiento: ["establecimiento", "unidad operativa", "hospital"],
};

const EMERGENCIA_ALIASES: Record<(typeof EMERGENCIA_FIELDS)[number], string[]> = {
  historiaClinica: [
    "historia clinica",
    "historia",
    "hc",
    "nro historia",
    "numero de historia",
    "nhc",
  ],
  cedula: ["cedula", "ci", "identificacion", "documento", "nui"],
  apellidosNombres: [
    "apellidos y nombres",
    "nombres y apellidos",
    "paciente",
    "nombre",
    "nombres",
  ],
  sexo: ["sexo", "genero"],
  edad: ["edad"],
  fechaHoraLlegada: [
    "fecha hora de llegada",
    "fecha hora llegada",
    "llegada",
    "ingreso",
    "fecha llegada",
    "hora llegada",
  ],
  fechaHoraAtencion: [
    "fecha hora de atencion",
    "fecha hora atencion",
    "atencion",
    "fecha atencion",
    "hora atencion",
  ],
  fechaHoraSalida: [
    "fecha hora de salida",
    "fecha hora salida",
    "salida",
    "egreso",
    "fecha salida",
    "hora salida",
  ],
  triage: ["triage", "clasificacion", "triaje"],
  motivoConsulta: ["motivo de consulta", "motivo consulta", "motivo"],
  diagnostico: ["diagnostico", "dx", "cie10", "cie 10", "diagnostico principal"],
  condicionSalida: [
    "condicion de salida",
    "condicion salida",
    "condicion",
    "disposicion",
    "destino final",
  ],
  destino: ["destino", "servicio destino", "referido a"],
  especialidad: ["especialidad"],
  medico: ["medico", "profesional", "tratante"],
  establecimiento: ["establecimiento", "unidad operativa", "hospital"],
};

export function fieldsFor(kind: ValidatorKind): readonly string[] {
  return kind === "egresos" ? EGRESOS_FIELDS : EMERGENCIA_FIELDS;
}

export function aliasesFor(kind: ValidatorKind): Record<string, string[]> {
  return kind === "egresos" ? EGRESOS_ALIASES : EMERGENCIA_ALIASES;
}

export function mapHeaders(
  kind: ValidatorKind,
  headers: string[],
): { mapping: Record<string, string>; unmatched: string[] } {
  const aliases = aliasesFor(kind);
  const mapping: Record<string, string> = {};
  const unmatched: string[] = [];
  const used = new Set<string>();

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;
    const field = Object.keys(aliases).find((key) => {
      if (used.has(key)) return false;
      return aliases[key].includes(normalized);
    });
    if (field) {
      mapping[header] = field;
      used.add(field);
    } else {
      unmatched.push(header);
    }
  });

  return { mapping, unmatched };
}
