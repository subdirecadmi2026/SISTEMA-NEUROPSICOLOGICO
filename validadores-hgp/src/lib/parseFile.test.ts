import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mapHeaders } from "./headers";
import { loadDataset, parseCsv } from "./parseFile";
import { normalizeSexo } from "./normalize";
import { parseDate } from "./dates";

describe("mapeo de encabezados", () => {
  it("reconoce alias de egresos y emergencia", () => {
    const egresos = mapHeaders("egresos", [
      "Historia clínica",
      "Cédula",
      "Apellidos y nombres",
      "Sexo",
      "Fecha ingreso",
      "Fecha egreso",
      "CIE-10",
      "Condición de egreso",
    ]);
    expect(egresos.mapping["CIE-10"]).toBe("diagnosticoPrincipal");
    expect(egresos.mapping["Fecha ingreso"]).toBe("fechaIngreso");

    const emergencia = mapHeaders("emergencia", [
      "HC",
      "Paciente",
      "Triage",
      "Llegada",
      "Diagnóstico",
      "Condición de salida",
      "Sexo",
    ]);
    expect(emergencia.mapping.HC).toBe("historiaClinica");
    expect(emergencia.mapping.Triage).toBe("triage");
    expect(emergencia.mapping.Llegada).toBe("fechaHoraLlegada");
  });

  it("encuentra el encabezado aunque el Excel tenga título arriba", async () => {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Hospital General Puyo"],
      ["Reporte de egresos julio 2026"],
      [
        "Número de historia",
        "Cédula",
        "Nombres y apellidos",
        "Sexo",
        "Fecha ingreso",
        "Fecha egreso",
        "CIE-10",
        "Condición de egreso",
      ],
      ["HC-1", "1600123457", "PEREZ JUAN", "H", "01/07/2026", "03/07/2026", "J18.9", "Vivo"],
    ]);
    XLSX.utils.book_append_sheet(wb, sheet, "Reporte");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const dataset = await loadDataset(
      "egresos",
      new File([buffer], "reporte-hospital.xlsx"),
    );
    expect(dataset.rows).toHaveLength(1);
    expect(dataset.rows[0].values.historiaClinica).toBe("HC-1");
    expect(dataset.rows[0].values.diagnosticoPrincipal).toBe("J18.9");
  });
});

describe("CSV", () => {
  it("respeta punto y coma y comillas", () => {
    const rows = parseCsv(
      'Historia clínica;Apellidos y nombres\n"HC-1";"PEREZ, JUAN"\n',
    );
    expect(rows[0]).toEqual(["Historia clínica", "Apellidos y nombres"]);
    expect(rows[1]).toEqual(["HC-1", "PEREZ, JUAN"]);
  });
});

describe("Excel de entrega", () => {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../archivos");

  it("carga el demo de egresos y encuentra errores", async () => {
    const buffer = await readFile(path.join(dir, "demo-egresos-hgp.xlsx"));
    const dataset = await loadDataset(
      "egresos",
      new File([buffer], "demo-egresos-hgp.xlsx"),
    );
    expect(dataset.rows.length).toBe(14);
    expect(dataset.issues.some((item) => item.code === "EG-CIE-002")).toBe(true);
  });

  it("carga el demo de emergencia y encuentra errores", async () => {
    const buffer = await readFile(path.join(dir, "demo-emergencia-hgp.xlsx"));
    const dataset = await loadDataset(
      "emergencia",
      new File([buffer], "demo-emergencia-hgp.xlsx"),
    );
    expect(dataset.rows.length).toBe(12);
    expect(dataset.issues.some((item) => item.code === "EM-TRI-001")).toBe(true);
  });
});

describe("normalización", () => {
  it("interpreta sexo según uso hospitalario MSP (M = mujer)", () => {
    expect(normalizeSexo("Hombre")).toBe("H");
    expect(normalizeSexo("M")).toBe("M");
    expect(normalizeSexo("Femenino")).toBe("M");
    expect(normalizeSexo("Masculino")).toBe("H");
  });

  it("lee fechas d/m/Y y hora", () => {
    const date = parseDate("16/07/2026 20:10");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getDate()).toBe(16);
    expect(date?.getHours()).toBe(20);
  });
});
