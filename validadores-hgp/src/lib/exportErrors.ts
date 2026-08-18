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

function errorRows(dataset: Dataset, reviewed: Map<string, ReviewedEntry>) {
  return dataset.issues.map((item) => {
    const row = dataset.rows.find((entry) => entry.rowKey === item.rowKey);
    const review = reviewed.get(item.rowKey);
    return {
      validador: dataset.kind === "egresos" ? "Egresos" : "Emergencia",
      archivo: dataset.fileName,
      fila: String(item.rowNumber),
      historia: row?.values.historiaClinica ?? "",
      paciente: row?.values.apellidosNombres ?? "",
      campo: FIELD_LABELS[item.field] ?? item.field,
      codigo: item.code,
      severidad: item.severity === "error" ? "Error" : "Advertencia",
      dimension: DIMENSION_LABELS[item.dimension],
      mensaje: item.message,
      valor: item.value,
      revisada: review ? "Sí" : "No",
      nota: review?.note ?? "",
      revisadaEl: review?.reviewedAt ?? "",
    };
  });
}

export async function exportErrorsExcel(
  dataset: Dataset,
  score: QualityScore,
  reviewed: Map<string, ReviewedEntry>,
) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Validadores HGP";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Puntaje");
  summary.columns = [
    { header: "Indicador", key: "k", width: 32 },
    { header: "Valor", key: "v", width: 24 },
  ];
  const summaryRows: [string, string | number][] = [
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
  ];
  summaryRows.forEach(([k, v]) => summary.addRow({ k, v }));
  summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  summary.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1C3A5C" },
  };

  const sheet = workbook.addWorksheet("Errores");
  sheet.columns = [
    { header: "Validador", key: "validador", width: 14 },
    { header: "Archivo", key: "archivo", width: 28 },
    { header: "Fila", key: "fila", width: 8 },
    { header: "Historia clínica", key: "historia", width: 16 },
    { header: "Paciente", key: "paciente", width: 28 },
    { header: "Campo", key: "campo", width: 22 },
    { header: "Código", key: "codigo", width: 22 },
    { header: "Severidad", key: "severidad", width: 14 },
    { header: "Dimensión", key: "dimension", width: 14 },
    { header: "Mensaje", key: "mensaje", width: 52 },
    { header: "Valor", key: "valor", width: 22 },
    { header: "Revisada", key: "revisada", width: 12 },
    { header: "Nota de revisión", key: "nota", width: 32 },
    { header: "Revisada el", key: "revisadaEl", width: 22 },
  ];
  errorRows(dataset, reviewed).forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1C3A5C" },
  };
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 14 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
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
    ...errorRows(dataset, reviewed).map((row) =>
      [
        row.validador,
        row.archivo,
        row.fila,
        row.historia,
        row.paciente,
        row.campo,
        row.codigo,
        row.severidad,
        row.dimension,
        row.mensaje,
        row.valor,
        row.revisada,
        row.nota,
        row.revisadaEl,
      ]
        .map(csvEscape)
        .join(";"),
    ),
  ];
  downloadBlob(
    new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    `errores-${dataset.kind}-${stamp()}.csv`,
  );
}

export async function downloadTemplate(kind: ValidatorKind) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(kind === "egresos" ? "Egresos" : "Emergencia");
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
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF2E7D84" },
  };
  headers.forEach((_, index) => {
    sheet.getColumn(index + 1).width = 22;
  });
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `plantilla-${kind}-hgp.xlsx`,
  );
}
