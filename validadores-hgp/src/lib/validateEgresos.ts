import type { DataRow, Issue, ValidatorKind } from "../types";
import { validarCedula } from "./cedula";
import {
  isFemaleOnlyCie10,
  isMaleOnlyCie10,
  isObstetricCie10,
  isPerinatalCie10,
  parseCie10,
} from "./cie10";
import { ageFromBirth, daysBetween, isFutureDay, parseDate } from "./dates";
import { normalizeSexo, normalizeText, normalizeUpper, parseAgeYears } from "./normalize";

const EGRESOS_REQUIRED = [
  "historiaClinica",
  "apellidosNombres",
  "sexo",
  "fechaIngreso",
  "fechaEgreso",
  "diagnosticoPrincipal",
  "condicionEgreso",
] as const;

const CONDICION_EGRESO: Record<string, string> = {
  VIVO: "VIVO",
  ALTA: "VIVO",
  "ALTA MEDICA": "VIVO",
  FALLECIDO: "FALLECIDO",
  MUERTO: "FALLECIDO",
  DEFUNCION: "FALLECIDO",
  FALLECIDA: "FALLECIDO",
  TRANSFERIDO: "TRANSFERIDO",
  REFERIDO: "TRANSFERIDO",
  TRASLADO: "TRANSFERIDO",
  "ALTA VOLUNTARIA": "ALTA_VOLUNTARIA",
  VOLUNTARIA: "ALTA_VOLUNTARIA",
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

export function makeRowKey(kind: ValidatorKind, values: Record<string, string>, fallback: string) {
  if (kind === "egresos") {
    return [
      "egresos",
      values.historiaClinica,
      values.cedula,
      values.fechaIngreso,
      values.fechaEgreso,
      fallback,
    ]
      .map((part) => normalizeUpper(part ?? ""))
      .join("|");
  }
  return [
    "emergencia",
    values.historiaClinica,
    values.cedula,
    values.fechaHoraLlegada,
    fallback,
  ]
    .map((part) => normalizeUpper(part ?? ""))
    .join("|");
}

function commonPersonIssues(row: DataRow, prefix: string): Issue[] {
  const issues: Issue[] = [];
  const sexo = normalizeSexo(row.values.sexo ?? "");
  if ((row.values.sexo ?? "").trim() && !sexo) {
    issues.push(
      issue(row, "sexo", `${prefix}-SEX-001`, "error", "validez", "Sexo no reconocido. Use H/M."),
    );
  }
  const cedula = (row.values.cedula ?? "").replace(/\s/g, "");
  if (!cedula) {
    issues.push(
      issue(row, "cedula", `${prefix}-CED-002`, "warning", "completitud", "Cédula vacía."),
    );
  } else if (!validarCedula(cedula)) {
    issues.push(
      issue(row, "cedula", `${prefix}-CED-001`, "error", "validez", "Cédula ecuatoriana inválida."),
    );
  }
  return issues;
}

function diagnosisIssues(
  row: DataRow,
  field: string,
  prefix: string,
  raw: string,
): Issue[] {
  const issues: Issue[] = [];
  const parsed = parseCie10(raw);
  if (!parsed) {
    issues.push(
      issue(
        row,
        field,
        `${prefix}-CIE-002`,
        "error",
        "validez",
        "El diagnóstico no tiene formato CIE-10 (ej. J18.9).",
      ),
    );
    return issues;
  }
  const sexo = normalizeSexo(row.values.sexo ?? "");
  if (sexo === "H" && isFemaleOnlyCie10(parsed)) {
    issues.push(
      issue(
        row,
        field,
        `${prefix}-CIE-003`,
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
        field,
        `${prefix}-CIE-003`,
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
        field,
        `${prefix}-CIE-004`,
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
        field,
        `${prefix}-CIE-005`,
        "warning",
        "consistencia",
        "Código obstétrico (O) con edad poco probable.",
      ),
    );
  }
  return issues;
}

export function validateEgresos(rows: DataRow[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, number>();

  rows.forEach((row) => {
    EGRESOS_REQUIRED.forEach((field) => {
      if (!normalizeText(row.values[field] ?? "")) {
        issues.push(
          issue(row, field, `EG-REQ-${field}`, "error", "completitud", "Campo obligatorio vacío."),
        );
      }
    });

    issues.push(...commonPersonIssues(row, "EG"));

    const ingreso = parseDate(row.values.fechaIngreso ?? "");
    const egreso = parseDate(row.values.fechaEgreso ?? "");
    if ((row.values.fechaIngreso ?? "").trim() && !ingreso) {
      issues.push(
        issue(row, "fechaIngreso", "EG-FEC-001", "error", "validez", "Fecha de ingreso inválida."),
      );
    }
    if ((row.values.fechaEgreso ?? "").trim() && !egreso) {
      issues.push(
        issue(row, "fechaEgreso", "EG-FEC-002", "error", "validez", "Fecha de egreso inválida."),
      );
    }
    if (ingreso && isFutureDay(ingreso)) {
      issues.push(
        issue(row, "fechaIngreso", "EG-FEC-005", "error", "consistencia", "La fecha de ingreso es futura."),
      );
    }
    if (egreso && isFutureDay(egreso)) {
      issues.push(
        issue(row, "fechaEgreso", "EG-FEC-004", "error", "consistencia", "La fecha de egreso es futura."),
      );
    }
    if (ingreso && egreso && egreso < ingreso) {
      issues.push(
        issue(
          row,
          "fechaEgreso",
          "EG-FEC-003",
          "error",
          "consistencia",
          "La fecha de egreso es anterior al ingreso.",
        ),
      );
    }
    if (ingreso && egreso && egreso >= ingreso) {
      const stay = daysBetween(ingreso, egreso);
      if (stay > 365) {
        issues.push(
          issue(
            row,
            "diasEstada",
            "EG-FEC-006",
            "warning",
            "consistencia",
            `Estada de ${stay} días supera un año.`,
            String(stay),
          ),
        );
      }
      const declared = Number((row.values.diasEstada ?? "").replace(",", "."));
      if (Number.isFinite(declared) && declared >= 0 && Math.abs(declared - stay) > 1) {
        issues.push(
          issue(
            row,
            "diasEstada",
            "EG-FEC-007",
            "warning",
            "consistencia",
            `Días de estada (${declared}) no coinciden con ${stay} días calculados.`,
          ),
        );
      }
    }

    const dx = row.values.diagnosticoPrincipal ?? "";
    if (normalizeText(dx)) {
      issues.push(...diagnosisIssues(row, "diagnosticoPrincipal", "EG", dx));
    }

    const condicionRaw = normalizeUpper(row.values.condicionEgreso ?? "");
    const condicion = CONDICION_EGRESO[condicionRaw];
    if (condicionRaw && !condicion) {
      issues.push(
        issue(
          row,
          "condicionEgreso",
          "EG-DEF-003",
          "error",
          "validez",
          "Condición de egreso no reconocida.",
        ),
      );
    }

    const birth = parseDate(row.values.fechaNacimiento ?? "");
    const age = parseAgeYears(row.values.edad ?? "");
    if ((row.values.fechaNacimiento ?? "").trim() && !birth) {
      issues.push(
        issue(
          row,
          "fechaNacimiento",
          "EG-EDAD-003",
          "warning",
          "validez",
          "Fecha de nacimiento inválida.",
        ),
      );
    }
    if ((row.values.edad ?? "").trim() && age === null) {
      issues.push(issue(row, "edad", "EG-EDAD-001", "warning", "validez", "Edad no numérica."));
    }
    if (birth && ingreso && age !== null) {
      const computed = ageFromBirth(birth, ingreso);
      if (Math.abs(computed - Math.round(age)) > 1) {
        issues.push(
          issue(
            row,
            "edad",
            "EG-EDAD-002",
            "warning",
            "consistencia",
            `La edad (${Math.round(age)}) no coincide con la fecha de nacimiento (${computed} años).`,
          ),
        );
      }
    }

    const dupKey = [
      normalizeUpper(row.values.historiaClinica ?? ""),
      normalizeUpper(row.values.fechaIngreso ?? ""),
      normalizeUpper(row.values.fechaEgreso ?? ""),
    ].join("|");
    if (normalizeText(row.values.historiaClinica ?? "") && ingreso && egreso) {
      const previous = seen.get(dupKey);
      if (previous) {
        issues.push(
          issue(
            row,
            "historiaClinica",
            "EG-DUP-001",
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
