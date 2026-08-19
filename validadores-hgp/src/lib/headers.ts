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
    "numero historia",
    "num historia",
    "nro hc",
    "num hc",
    "h clinica",
    "historia clin",
  ],
  cedula: [
    "cedula",
    "ci",
    "identificacion",
    "documento",
    "nui",
    "dni",
    "cedula identidad",
    "num cedula",
    "numero cedula",
    "c c",
    "cc",
  ],
  apellidosNombres: [
    "apellidos y nombres",
    "nombres y apellidos",
    "paciente",
    "nombre completo",
    "apellidos nombres",
  ],
  sexo: ["sexo", "genero"],
  fechaNacimiento: [
    "fecha de nacimiento",
    "fecha nacimiento",
    "fnacimiento",
    "nacimiento",
    "f nac",
    "fec nac",
  ],
  edad: ["edad"],
  fechaIngreso: [
    "fecha de ingreso",
    "fecha ingreso",
    "ingreso",
    "f ingreso",
    "fec ing",
    "fecha hospitalizacion",
    "fecha hosp",
  ],
  fechaEgreso: [
    "fecha de egreso",
    "fecha egreso",
    "egreso",
    "f egreso",
    "alta",
    "fec egr",
    "fecha de alta",
    "fecha alta",
  ],
  diasEstada: [
    "dias de estada",
    "dias estada",
    "estada",
    "dias de estancia",
    "estancia",
    "dias estadia",
    "los",
  ],
  especialidad: ["especialidad"],
  servicio: ["servicio", "area", "unidad"],
  diagnosticoPrincipal: [
    "diagnostico principal",
    "dx principal",
    "cie10",
    "cie 10",
    "diagnostico",
    "dx",
    "dx1",
    "cie",
    "codigo cie",
    "codigo diagnostico",
    "diag principal",
  ],
  diagnosticosSecundarios: [
    "diagnosticos secundarios",
    "dx secundarios",
    "diagnostico secundario",
    "dx2",
  ],
  condicionEgreso: [
    "condicion de egreso",
    "condicion egreso",
    "condicion",
    "estado de egreso",
    "cond egr",
    "vivo muerto",
    "condicion al egreso",
  ],
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
    "numero historia",
  ],
  cedula: ["cedula", "ci", "identificacion", "documento", "nui", "num cedula"],
  apellidosNombres: [
    "apellidos y nombres",
    "nombres y apellidos",
    "paciente",
    "nombre completo",
    "apellidos nombres",
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
    "fec llegada",
    "hora ing",
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
    "hora egr",
  ],
  triage: ["triage", "clasificacion", "triaje", "color triage", "clasif"],
  motivoConsulta: ["motivo de consulta", "motivo consulta", "motivo"],
  diagnostico: [
    "diagnostico",
    "dx",
    "cie10",
    "cie 10",
    "diagnostico principal",
    "cie",
    "codigo cie",
  ],
  condicionSalida: [
    "condicion de salida",
    "condicion salida",
    "condicion",
    "disposicion",
    "destino final",
    "cond salida",
  ],
  destino: ["destino", "servicio destino", "referido a"],
  especialidad: ["especialidad"],
  medico: ["medico", "profesional", "tratante"],
  establecimiento: ["establecimiento", "unidad operativa", "hospital"],
};

const NAME_PART_ALIASES = {
  apellido1: ["primer apellido", "apellido 1", "apellido1", "apellido paterno", "apellidopaterno"],
  apellido2: ["segundo apellido", "apellido 2", "apellido2", "apellido materno", "apellidomaterno"],
  nombres: ["nombres", "nombre", "primer nombre", "nombres paciente"],
};

export function fieldsFor(kind: ValidatorKind): readonly string[] {
  return kind === "egresos" ? EGRESOS_FIELDS : EMERGENCIA_FIELDS;
}

export function aliasesFor(kind: ValidatorKind): Record<string, string[]> {
  return kind === "egresos" ? EGRESOS_ALIASES : EMERGENCIA_ALIASES;
}

function matchesAlias(normalized: string, aliases: string[]): boolean {
  if (aliases.includes(normalized)) return true;
  return aliases.some(
    (alias) =>
      alias.length >= 5 &&
      (normalized === alias ||
        normalized.includes(alias) ||
        (alias.includes(normalized) && normalized.length >= 5)),
  );
}

export function mapHeaders(
  kind: ValidatorKind,
  headers: string[],
): { mapping: Record<string, string>; unmatched: string[]; score: number } {
  const aliases = aliasesFor(kind);
  const mapping: Record<string, string> = {};
  const unmatched: string[] = [];
  const used = new Set<string>();

  headers.forEach((header) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;
    const field = Object.keys(aliases).find((key) => {
      if (used.has(key)) return false;
      return matchesAlias(normalized, aliases[key] ?? []);
    });
    if (field) {
      mapping[header] = field;
      used.add(field);
    } else {
      unmatched.push(header);
    }
  });

  return { mapping, unmatched, score: used.size };
}

export function composePatientName(headers: string[], record: string[]): string {
  const parts: string[] = [];
  (["apellido1", "apellido2", "nombres"] as const).forEach((part) => {
    const index = headers.findIndex((header) =>
      matchesAlias(normalizeHeader(header), NAME_PART_ALIASES[part]),
    );
    if (index >= 0) parts.push((record[index] ?? "").trim());
  });
  return parts.filter(Boolean).join(" ");
}
