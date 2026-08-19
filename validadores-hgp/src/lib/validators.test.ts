import { describe, expect, it } from "vitest";
import { demoEgresos, demoEmergencia } from "../data/demo";
import { computeQualityScore } from "./qualityScore";
import { validateEgresos } from "./validateEgresos";
import { validateEmergencia } from "./validateEmergencia";

describe("validador de egresos", () => {
  it("detecta cédula inválida, fechas invertidas, CIE-10 y duplicados", () => {
    const { issues } = demoEgresos();
    const codes = issues.map((item) => item.code);
    expect(codes).toContain("EG-CED-001");
    expect(codes).toContain("EG-FEC-003");
    expect(codes).toContain("EG-REQ-diagnosticoPrincipal");
    expect(codes).toContain("EG-CIE-002");
    expect(codes).toContain("EG-CIE-003");
    expect(codes).toContain("EG-DUP-001");
    expect(codes).toContain("EG-FEC-004");
    expect(codes).toContain("EG-FEC-006");
    expect(codes).toContain("EG-SEX-001");
    expect(codes).toContain("EG-CED-002");
    expect(codes).toContain("EG-REQ-apellidosNombres");
  });

  it("no marca error en un egreso completo y coherente", () => {
    const { rows } = demoEgresos();
    const clean = validateEgresos([rows[0]]);
    expect(clean.filter((item) => item.severity === "error")).toEqual([]);
  });
});

describe("validador de emergencia", () => {
  it("detecta triage, tiempos, hospitalización sin destino y duplicados", () => {
    const { issues } = demoEmergencia();
    const codes = issues.map((item) => item.code);
    expect(codes).toContain("EM-CED-001");
    expect(codes).toContain("EM-HOR-004");
    expect(codes).toContain("EM-REQ-diagnostico");
    expect(codes).toContain("EM-CIE-003");
    expect(codes).toContain("EM-HOR-007");
    expect(codes).toContain("EM-SAL-002");
    expect(codes).toContain("EM-DUP-001");
    expect(codes).toContain("EM-TRI-001");
    expect(codes).toContain("EM-HOR-008");
    expect(codes).toContain("EM-REQ-apellidosNombres");
  });

  it("acepta un registro de emergencia válido", () => {
    const { rows } = demoEmergencia();
    const clean = validateEmergencia([rows[0]]);
    expect(clean.filter((item) => item.severity === "error")).toEqual([]);
  });
});

describe("puntaje de calidad", () => {
  it("baja el puntaje con errores y no lo sube al marcar revisadas", () => {
    const dataset = demoEgresos();
    const empty = computeQualityScore(dataset.rows, dataset.issues, new Set());
    const reviewed = computeQualityScore(
      dataset.rows,
      dataset.issues,
      new Set(dataset.rows.map((row) => row.rowKey)),
    );
    expect(empty.overall).toBeLessThan(95);
    expect(empty.label).not.toBe("Excelente");
    expect(reviewed.overall).toBe(empty.overall);
    expect(reviewed.pendingRows).toBe(0);
    expect(reviewed.reviewedRows).toBe(dataset.rows.length);
    expect(empty.dimensions.completitud).toBeGreaterThan(0);
    expect(empty.dimensions.unicidad).toBeLessThan(100);
  });

  it("clasifica un archivo sin hallazgos como excelente", () => {
    const dataset = demoEgresos();
    const score = computeQualityScore([dataset.rows[0]], [], new Set());
    expect(score.overall).toBe(100);
    expect(score.label).toBe("Excelente");
    expect(score.cleanRows).toBe(1);
  });
});
