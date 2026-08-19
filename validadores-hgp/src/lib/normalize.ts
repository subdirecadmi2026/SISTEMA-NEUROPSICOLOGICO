export function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeHeader(value: string): string {
  return stripAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeUpper(value: string): string {
  return stripAccents(normalizeText(value)).toUpperCase();
}

export function normalizeSexo(value: string): "H" | "M" | "" {
  const v = normalizeUpper(value);
  if (!v) return "";
  if (["H", "HOMBRE", "MASCULINO", "VARON", "MALE", "1"].includes(v)) return "H";
  if (["M", "F", "MUJER", "FEMENINO", "FEMALE", "2"].includes(v)) return "M";
  return "";
}

export function parseAgeYears(value: string): number | null {
  const trimmed = normalizeText(value);
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const n = Number(match[1].replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 120) return null;
  const unit = stripAccents(trimmed).toLowerCase();
  if (/\bd(ias|ia)?\b/.test(unit) || /\bhoras?\b/.test(unit)) return n / 365;
  if (/\bm(es(es)?|eses)\b/.test(unit)) return n / 12;
  return n;
}
