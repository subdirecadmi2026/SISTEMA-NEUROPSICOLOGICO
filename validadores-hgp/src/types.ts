export type ValidatorKind = "egresos" | "emergencia";

export type Severity = "error" | "warning";

export type Dimension = "completitud" | "validez" | "consistencia" | "unicidad";

export type Issue = {
  id: string;
  rowNumber: number;
  rowKey: string;
  field: string;
  code: string;
  severity: Severity;
  dimension: Dimension;
  message: string;
  value: string;
};

export type DataRow = {
  rowNumber: number;
  rowKey: string;
  values: Record<string, string>;
};

export type QualityScore = {
  overall: number;
  label: "Excelente" | "Bueno" | "Regular" | "Crítico";
  dimensions: Record<Dimension, number>;
  totalRows: number;
  errorRows: number;
  warningRows: number;
  cleanRows: number;
  pendingRows: number;
  reviewedRows: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
};

export type ReviewedEntry = {
  rowKey: string;
  reviewedAt: string;
  note: string;
};

export type Dataset = {
  kind: ValidatorKind;
  fileName: string;
  loadedAt: string;
  headers: string[];
  rows: DataRow[];
  issues: Issue[];
};

export const EGRESOS_FIELDS = [
  "historiaClinica",
  "cedula",
  "apellidosNombres",
  "sexo",
  "fechaNacimiento",
  "edad",
  "fechaIngreso",
  "fechaEgreso",
  "diasEstada",
  "especialidad",
  "servicio",
  "diagnosticoPrincipal",
  "diagnosticosSecundarios",
  "condicionEgreso",
  "tipoEgreso",
  "procedimiento",
  "medico",
  "establecimiento",
] as const;

export const EMERGENCIA_FIELDS = [
  "historiaClinica",
  "cedula",
  "apellidosNombres",
  "sexo",
  "edad",
  "fechaHoraLlegada",
  "fechaHoraAtencion",
  "fechaHoraSalida",
  "triage",
  "motivoConsulta",
  "diagnostico",
  "condicionSalida",
  "destino",
  "especialidad",
  "medico",
  "establecimiento",
] as const;

export type EgresosField = (typeof EGRESOS_FIELDS)[number];
export type EmergenciaField = (typeof EMERGENCIA_FIELDS)[number];

export const FIELD_LABELS: Record<string, string> = {
  historiaClinica: "Historia clínica",
  cedula: "Cédula",
  apellidosNombres: "Apellidos y nombres",
  sexo: "Sexo",
  fechaNacimiento: "Fecha de nacimiento",
  edad: "Edad",
  fechaIngreso: "Fecha de ingreso",
  fechaEgreso: "Fecha de egreso",
  diasEstada: "Días de estada",
  especialidad: "Especialidad",
  servicio: "Servicio",
  diagnosticoPrincipal: "Diagnóstico principal",
  diagnosticosSecundarios: "Diagnósticos secundarios",
  condicionEgreso: "Condición de egreso",
  tipoEgreso: "Tipo de egreso",
  procedimiento: "Procedimiento",
  medico: "Médico",
  establecimiento: "Establecimiento",
  fechaHoraLlegada: "Fecha/hora de llegada",
  fechaHoraAtencion: "Fecha/hora de atención",
  fechaHoraSalida: "Fecha/hora de salida",
  triage: "Triage",
  motivoConsulta: "Motivo de consulta",
  diagnostico: "Diagnóstico",
  condicionSalida: "Condición de salida",
  destino: "Destino",
};

export const DIMENSION_LABELS: Record<Dimension, string> = {
  completitud: "Completitud",
  validez: "Validez",
  consistencia: "Consistencia",
  unicidad: "Unicidad",
};
