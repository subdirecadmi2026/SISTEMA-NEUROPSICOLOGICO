import type { DataRow, Dimension, Issue, QualityScore } from "../types";

const WEIGHTS: Record<Dimension, number> = {
  completitud: 0.3,
  validez: 0.3,
  consistencia: 0.25,
  unicidad: 0.15,
};

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function labelFor(score: number): QualityScore["label"] {
  if (score >= 95) return "Excelente";
  if (score >= 85) return "Bueno";
  if (score >= 70) return "Regular";
  return "Crítico";
}

function dimensionScore(totalRows: number, issues: Issue[], dimension: Dimension): number {
  if (totalRows === 0) return 100;
  const relevant = issues.filter((item) => item.dimension === dimension);
  const errorRows = new Set(
    relevant.filter((item) => item.severity === "error").map((item) => item.rowKey),
  );
  const warningRows = new Set(
    relevant
      .filter((item) => item.severity === "warning" && !errorRows.has(item.rowKey))
      .map((item) => item.rowKey),
  );
  const penalty = errorRows.size + 0.25 * warningRows.size;
  return clamp(100 * (1 - penalty / totalRows));
}

export function computeQualityScore(
  rows: DataRow[],
  issues: Issue[],
  reviewedKeys: Set<string>,
): QualityScore {
  const totalRows = rows.length;
  const issuesByRow = new Map<string, Issue[]>();
  issues.forEach((item) => {
    const list = issuesByRow.get(item.rowKey) ?? [];
    list.push(item);
    issuesByRow.set(item.rowKey, list);
  });

  const errorRows = new Set<string>();
  const warningRows = new Set<string>();
  issuesByRow.forEach((list, key) => {
    if (list.some((item) => item.severity === "error")) errorRows.add(key);
    else if (list.some((item) => item.severity === "warning")) warningRows.add(key);
  });

  const dimensions = {
    completitud: dimensionScore(totalRows, issues, "completitud"),
    validez: dimensionScore(totalRows, issues, "validez"),
    consistencia: dimensionScore(totalRows, issues, "consistencia"),
    unicidad: dimensionScore(totalRows, issues, "unicidad"),
  };

  const overall =
    totalRows === 0
      ? 100
      : clamp(
          dimensions.completitud * WEIGHTS.completitud +
            dimensions.validez * WEIGHTS.validez +
            dimensions.consistencia * WEIGHTS.consistencia +
            dimensions.unicidad * WEIGHTS.unicidad,
        );

  const pendingRows = [...errorRows, ...warningRows].filter((key) => !reviewedKeys.has(key)).length;
  const reviewedRows = rows.filter((row) => reviewedKeys.has(row.rowKey)).length;

  return {
    overall: Number(overall.toFixed(1)),
    label: labelFor(overall),
    dimensions: {
      completitud: Number(dimensions.completitud.toFixed(1)),
      validez: Number(dimensions.validez.toFixed(1)),
      consistencia: Number(dimensions.consistencia.toFixed(1)),
      unicidad: Number(dimensions.unicidad.toFixed(1)),
    },
    totalRows,
    errorRows: errorRows.size,
    warningRows: warningRows.size,
    cleanRows: totalRows - errorRows.size - warningRows.size,
    pendingRows,
    reviewedRows,
    issueCount: issues.length,
    errorCount: issues.filter((item) => item.severity === "error").length,
    warningCount: issues.filter((item) => item.severity === "warning").length,
  };
}
