export type Cie10Code = {
  letter: string;
  category: number;
  decimal: string | null;
  compact: string;
};

const CIE_RE = /^([A-Z])(\d{2})(?:[.]?(\d{1,2}))?$/;

export function parseCie10(raw: string): Cie10Code | null {
  const compact = raw.replace(/\s+/g, "").toUpperCase();
  const match = compact.match(CIE_RE);
  if (!match) return null;
  return {
    letter: match[1],
    category: Number(match[2]),
    decimal: match[3] ?? null,
    compact: match[3] ? `${match[1]}${match[2]}.${match[3]}` : `${match[1]}${match[2]}`,
  };
}

export function isFemaleOnlyCie10(code: Cie10Code): boolean {
  const { letter, category } = code;
  if (letter === "O") return true;
  if (letter === "C" && category >= 51 && category <= 58) return true;
  if (letter === "D" && category >= 25 && category <= 28) return true;
  if (letter === "N" && category >= 70 && category <= 98) return true;
  if (letter === "Z" && category >= 32 && category <= 39) return true;
  return false;
}

export function isMaleOnlyCie10(code: Cie10Code): boolean {
  const { letter, category } = code;
  if (letter === "C" && category >= 60 && category <= 63) return true;
  if (letter === "N" && category >= 40 && category <= 51) return true;
  return false;
}

export function isPerinatalCie10(code: Cie10Code): boolean {
  return code.letter === "P";
}

export function isObstetricCie10(code: Cie10Code): boolean {
  return code.letter === "O";
}
