import { describe, expect, it } from "vitest";
import { mapHeaders } from "./headers";
import { parseCsv } from "./parseFile";
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
