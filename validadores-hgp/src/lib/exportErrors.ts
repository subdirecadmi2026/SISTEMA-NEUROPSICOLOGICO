import * as XLSX from "xlsx";
import {
  DIMENSION_LABELS,
  FIELD_LABELS,
  type Dataset,
  type QualityScore,
  type ReviewedEntry,
  type ValidatorKind,
} from "../types";

function csvEscape(value: string): string {
  const text = value.replace(/"/g, '""');
  return `"${text}"`;
}

function stamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function writeWorkbook(sheets: { name: string; rows: (string | number)[][] }[], filename: string) {
  const workbook = XLSX.utils.book_new();
  sheets.forEach((sheet) => {
    const ws = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
  });
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    filename,
  );
}

function errorRows(dataset: Dataset, reviewed: Map<string, ReviewedEntry>) {
  return dataset.issues.map((item) => {
    const row = dataset.rows.find((entry) => entry.rowKey === item.rowKey);
    const review = reviewed.get(item.rowKey);
    return [
      dataset.kind === "egresos" ? "Egresos" : "Emergencia",
      dataset.fileName,
      item.rowNumber,
      row?.values.historiaClinica ?? "",
      row?.values.apellidosNombres ?? "",
      FIELD_LABELS[item.field] ?? item.field,
      item.code,
      item.severity === "error" ? "Error" : "Advertencia",
      DIMENSION_LABELS[item.dimension],
      item.message,
      item.value,
      review ? "Sí" : "No",
      review?.note ?? "",
      review?.reviewedAt ?? "",
    ];
  });
}

export async function exportErrorsExcel(
  dataset: Dataset,
  score: QualityScore,
  reviewed: Map<string, ReviewedEntry>,
) {
  writeWorkbook(
    [
      {
        name: "Puntaje",
        rows: [
          ["Indicador", "Valor"],
          ["Validador", dataset.kind === "egresos" ? "Egresos hospitalarios" : "Emergencia"],
          ["Archivo", dataset.fileName],
          ["Puntaje de calidad", score.overall],
          ["Clasificación", score.label],
          ["Completitud", score.dimensions.completitud],
          ["Validez", score.dimensions.validez],
          ["Consistencia", score.dimensions.consistencia],
          ["Unicidad", score.dimensions.unicidad],
          ["Registros", score.totalRows],
          ["Filas con error", score.errorRows],
          ["Filas con advertencia", score.warningRows],
          ["Filas limpias", score.cleanRows],
          ["Filas revisadas", score.reviewedRows],
          ["Pendientes de revisión", score.pendingRows],
          ["Errores", score.errorCount],
          ["Advertencias", score.warningCount],
        ],
      },
      {
        name: "Errores",
        rows: [
          [
            "Validador",
            "Archivo",
            "Fila",
            "Historia clínica",
            "Paciente",
            "Campo",
            "Código",
            "Severidad",
            "Dimensión",
            "Mensaje",
            "Valor",
            "Revisada",
            "Nota de revisión",
            "Revisada el",
          ],
          ...errorRows(dataset, reviewed),
        ],
      },
    ],
    `errores-${dataset.kind}-${stamp()}.xlsx`,
  );
}

export function exportErrorsCsv(
  dataset: Dataset,
  reviewed: Map<string, ReviewedEntry>,
) {
  const headers = [
    "Validador",
    "Archivo",
    "Fila",
    "Historia clínica",
    "Paciente",
    "Campo",
    "Código",
    "Severidad",
    "Dimensión",
    "Mensaje",
    "Valor",
    "Revisada",
    "Nota de revisión",
    "Revisada el",
  ];
  const lines = [
    headers.join(";"),
    ...errorRows(dataset, reviewed).map((row) => row.map((value) => csvEscape(String(value))).join(";")),
  ];
  downloadBlob(
    new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    `errores-${dataset.kind}-${stamp()}.csv`,
  );
}

export async function downloadTemplate(kind: ValidatorKind) {
  const headers =
    kind === "egresos"
      ? [
          "Historia clínica",
          "Cédula",
          "Apellidos y nombres",
          "Sexo",
          "Fecha de nacimiento",
          "Edad",
          "Fecha de ingreso",
          "Fecha de egreso",
          "Días de estada",
          "Especialidad",
          "Servicio",
          "Diagnóstico principal",
          "Diagnósticos secundarios",
          "Condición de egreso",
          "Tipo de egreso",
          "Procedimiento",
          "Médico",
          "Establecimiento",
        ]
      : [
          "Historia clínica",
          "Cédula",
          "Apellidos y nombres",
          "Sexo",
          "Edad",
          "Fecha/hora de llegada",
          "Fecha/hora de atención",
          "Fecha/hora de salida",
          "Triage",
          "Motivo de consulta",
          "Diagnóstico",
          "Condición de salida",
          "Destino",
          "Especialidad",
          "Médico",
          "Establecimiento",
        ];
  writeWorkbook(
    [{ name: kind === "egresos" ? "Egresos" : "Emergencia", rows: [headers] }],
    `plantilla-${kind}-hgp.xlsx`,
  );
}
