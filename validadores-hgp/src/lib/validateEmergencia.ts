import type { DataRow, Issue } from "../types";
import { hoursBetween, isFutureDay, parseDate } from "./dates";
import { normalizeSexo, normalizeText, normalizeUpper, parseAgeYears } from "./normalize";
import { validarCedula } from "./cedula";
import {
  isFemaleOnlyCie10,
  isMaleOnlyCie10,
  isObstetricCie10,
  isPerinatalCie10,
  parseCie10,
} from "./cie10";

const EM_REQUIRED = [
  "historiaClinica",
  "apellidosNombres",
  "sexo",
  "fechaHoraLlegada",
  "diagnostico",
  "condicionSalida",
  "triage",
] as const;

const TRIAGE: Record<string, string> = {
  ROJO: "ROJO",
  I: "ROJO",
  "1": "ROJO",
  RESUCITACION: "ROJO",
  NARANJA: "NARANJA",
  II: "NARANJA",
  "2": "NARANJA",
  EMERGENCIA: "NARANJA",
  AMARILLO: "AMARILLO",
  III: "AMARILLO",
  "3": "AMARILLO",
  URGENCIA: "AMARILLO",
  VERDE: "VERDE",
  IV: "VERDE",
  "4": "VERDE",
  ESTANDAR: "VERDE",
  AZUL: "AZUL",
  V: "AZUL",
  "5": "AZUL",
  NO_URGENTE: "AZUL",
  "NO URGENTE": "AZUL",
};

const CONDICION_SALIDA: Record<string, string> = {
  ALTA: "ALTA",
  "ALTA MEDICA": "ALTA",
  VIVO: "ALTA",
  HOSPITALIZACION: "HOSPITALIZACION",
  HOSPITALIZADO: "HOSPITALIZACION",
  INGRESO: "HOSPITALIZACION",
  REFERIDO: "REFERIDO",
  TRANSFERIDO: "REFERIDO",
  TRASLADO: "REFERIDO",
  FALLECIDO: "FALLECIDO",
  MUERTO: "FALLECIDO",
  DEFUNCION: "FALLECIDO",
  FUGA: "FUGA",
  ABANDONO: "FUGA",
};

function issue(
  row: DataRow,
  field: string,
  code: string,
  severity: Issue["severity"],
  dimension: Issue["dimension"],
  message: string,
  value = row.values[field] ?? "",
): Issue {
  return {
    id: `${row.rowKey}:${code}`,
    rowNumber: row.rowNumber,
    rowKey: row.rowKey,
    field,
    code,
    severity,
    dimension,
    message,
    value,
  };
}

function diagnosisIssues(row: DataRow): Issue[] {
  const issues: Issue[] = [];
  const raw = row.values.diagnostico ?? "";
  const parsed = parseCie10(raw);
  if (!parsed) {
    issues.push(
      issue(
        row,
        "diagnostico",
        "EM-CIE-002",
        "error",
        "validez",
        "El diagnóstico no tiene formato CIE-10 (ej. S06.0).",
      ),
    );
    return issues;
  }
  const sexo = normalizeSexo(row.values.sexo ?? "");
  if (sexo === "H" && isFemaleOnlyCie10(parsed)) {
    issues.push(
      issue(
        row,
        "diagnostico",
        "EM-CIE-003",
        "error",
        "consistencia",
        `Diagnóstico ${parsed.compact} es incompatible con sexo masculino.`,
      ),
    );
  }
  if (sexo === "M" && isMaleOnlyCie10(parsed)) {
    issues.push(
      issue(
        row,
        "diagnostico",
        "EM-CIE-003",
        "error",
        "consistencia",
        `Diagnóstico ${parsed.compact} es incompatible con sexo femenino.`,
      ),
    );
  }
  const age = parseAgeYears(row.values.edad ?? "");
  if (age !== null && isPerinatalCie10(parsed) && age >= 1) {
    issues.push(
      issue(
        row,
        "diagnostico",
        "EM-CIE-004",
        "warning",
        "consistencia",
        "Código perinatal (P) con edad de 1 año o más.",
      ),
    );
  }
  if (age !== null && isObstetricCie10(parsed) && (age < 12 || age > 55)) {
    issues.push(
      issue(
        row,
        "diagnostico",
        "EM-CIE-005",
        "warning",
        "consistencia",
        "Código obstétrico (O) con edad poco probable.",
      ),
    );
  }
  return issues;
}

export function validateEmergencia(rows: DataRow[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row) => {
    EM_REQUIRED.forEach((field) => {
      if (!normalizeText(row.values[field] ?? "")) {
        issues.push(
          issue(row, field, `EM-REQ-${field}`, "error", "completitud", "Campo obligatorio vacío."),
        );
      }
    });

    const sexo = normalizeSexo(row.values.sexo ?? "");
    if ((row.values.sexo ?? "").trim() && !sexo) {
      issues.push(issue(row, "sexo", "EM-SEX-001", "error", "validez", "Sexo no reconocido. Use H/M."));
    }
    const cedula = (row.values.cedula ?? "").replace(/\s/g, "");
    if (!cedula) {
      issues.push(issue(row, "cedula", "EM-CED-002", "warning", "completitud", "Cédula vacía."));
    } else if (!validarCedula(cedula)) {
      issues.push(
        issue(row, "cedula", "EM-CED-001", "error", "validez", "Cédula ecuatoriana inválida."),
      );
    }

    const triageRaw = normalizeUpper(row.values.triage ?? "");
    if (triageRaw && !TRIAGE[triageRaw]) {
      issues.push(
        issue(row, "triage", "EM-TRI-001", "error", "validez", "Triage no reconocido (rojo a azul)."),
      );
    }

    const llegada = parseDate(row.values.fechaHoraLlegada ?? "");
    const atencion = parseDate(row.values.fechaHoraAtencion ?? "");
    const salida = parseDate(row.values.fechaHoraSalida ?? "");

    if ((row.values.fechaHoraLlegada ?? "").trim() && !llegada) {
      issues.push(
        issue(row, "fechaHoraLlegada", "EM-HOR-001", "error", "validez", "Fecha/hora de llegada inválida."),
      );
    }
    if ((row.values.fechaHoraAtencion ?? "").trim() && !atencion) {
      issues.push(
        issue(row, "fechaHoraAtencion", "EM-HOR-002", "error", "validez", "Fecha/hora de atención inválida."),
      );
    }
    if ((row.values.fechaHoraSalida ?? "").trim() && !salida) {
      issues.push(
        issue(row, "fechaHoraSalida", "EM-HOR-003", "error", "validez", "Fecha/hora de salida inválida."),
      );
    }
    if (llegada && isFutureDay(llegada)) {
      issues.push(
        issue(row, "fechaHoraLlegada", "EM-HOR-009", "error", "consistencia", "La llegada es una fecha futura."),
      );
    }
    if (llegada && atencion && atencion < llegada) {
      issues.push(
        issue(
          row,
          "fechaHoraAtencion",
          "EM-HOR-004",
          "error",
          "consistencia",
          "La atención es anterior a la llegada.",
        ),
      );
    }
    if (llegada && salida && salida < llegada) {
      issues.push(
        issue(
          row,
          "fechaHoraSalida",
          "EM-HOR-005",
          "error",
          "consistencia",
          "La salida es anterior a la llegada.",
        ),
      );
    }
    if (atencion && salida && salida < atencion) {
      issues.push(
        issue(
          row,
          "fechaHoraSalida",
          "EM-HOR-006",
          "error",
          "consistencia",
          "La salida es anterior a la atención.",
        ),
      );
    }
    if (llegada && salida && salida >= llegada) {
      const hours = hoursBetween(llegada, salida);
      if (hours > 72) {
        issues.push(
          issue(
            row,
            "fechaHoraSalida",
            "EM-HOR-008",
            "error",
            "consistencia",
            `Permanencia de ${hours.toFixed(1)} h en emergencia (máx. 72 h).`,
            `${hours.toFixed(1)} h`,
          ),
        );
      } else if (hours > 24) {
        issues.push(
          issue(
            row,
            "fechaHoraSalida",
            "EM-HOR-007",
            "warning",
            "consistencia",
            `Permanencia de ${hours.toFixed(1)} h supera 24 horas.`,
            `${hours.toFixed(1)} h`,
          ),
        );
      }
    }

    if (normalizeText(row.values.diagnostico ?? "")) {
      issues.push(...diagnosisIssues(row));
    }

    const condicionRaw = normalizeUpper(row.values.condicionSalida ?? "");
    const condicion = CONDICION_SALIDA[condicionRaw];
    if (condicionRaw && !condicion) {
      issues.push(
        issue(
          row,
          "condicionSalida",
          "EM-SAL-001",
          "error",
          "validez",
          "Condición de salida no reconocida.",
        ),
      );
    }
    if (condicion === "HOSPITALIZACION" && !normalizeText(row.values.destino ?? "")) {
      issues.push(
        issue(
          row,
          "destino",
          "EM-SAL-002",
          "error",
          "completitud",
          "Hospitalización sin servicio de destino.",
        ),
      );
    }
    if (condicion === "REFERIDO" && !normalizeText(row.values.destino ?? "")) {
      issues.push(
        issue(
          row,
          "destino",
          "EM-SAL-003",
          "warning",
          "completitud",
          "Referido sin establecimiento de destino.",
        ),
      );
    }

    const dupKey = [
      normalizeUpper(row.values.historiaClinica ?? ""),
      normalizeUpper(row.values.fechaHoraLlegada ?? ""),
    ].join("|");
    if (normalizeText(row.values.historiaClinica ?? "") && llegada) {
      const previous = seen.get(dupKey);
      if (previous) {
        issues.push(
          issue(
            row,
            "historiaClinica",
            "EM-DUP-001",
            "error",
            "unicidad",
            `Registro duplicado de la fila ${previous}.`,
          ),
        );
      } else {
        seen.set(dupKey, row.rowNumber);
      }
    }
  });

  return issues;
}
