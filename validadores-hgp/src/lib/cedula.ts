/** Valida cédula ecuatoriana de 10 dígitos. */
export function validarCedula(raw: string): boolean {
  const cedula = raw.replace(/\D/g, "");
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || provincia > 24) return false;
  const tercer = Number(cedula[2]);
  if (tercer > 6) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    let value = Number(cedula[i]) * coef[i];
    if (value > 9) value -= 9;
    sum += value;
  }
  const digito = (10 - (sum % 10)) % 10;
  return digito === Number(cedula[9]);
}
