import { describe, expect, it } from "vitest";
import { validarCedula } from "./cedula";

describe("validarCedula", () => {
  it("acepta cédulas de Pastaza con dígito verificador correcto", () => {
    expect(validarCedula("1600123457")).toBe(true);
    expect(validarCedula("1600345670")).toBe(true);
  });

  it("rechaza dígito verificador, provincia o longitud inválidos", () => {
    expect(validarCedula("1600123458")).toBe(false);
    expect(validarCedula("0999999999")).toBe(false);
    expect(validarCedula("160012345")).toBe(false);
    expect(validarCedula("")).toBe(false);
  });
});
