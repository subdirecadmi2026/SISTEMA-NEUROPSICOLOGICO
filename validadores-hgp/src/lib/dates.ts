const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export function parseDate(raw: string): Date | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^\d{4,5}(?:\.\d+)?$/.test(value)) {
    const serial = Number(value);
    if (serial > 20000 && serial < 80000) {
      return new Date(EXCEL_EPOCH + Math.round(serial * 86400000));
    }
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (iso) {
    return makeDate(
      Number(iso[1]),
      Number(iso[2]),
      Number(iso[3]),
      Number(iso[4] ?? 0),
      Number(iso[5] ?? 0),
      Number(iso[6] ?? 0),
    );
  }
  const dmy = value.match(
    /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (dmy) {
    return makeDate(
      Number(dmy[3]),
      Number(dmy[2]),
      Number(dmy[1]),
      Number(dmy[4] ?? 0),
      Number(dmy[5] ?? 0),
      Number(dmy[6] ?? 0),
    );
  }
  return null;
}

function makeDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(from: Date, to: Date): number {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / 86400000);
}

export function hoursBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 3600000;
}

export function formatDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isFutureDay(date: Date, now = new Date()): boolean {
  return startOfDay(date).getTime() > startOfDay(now).getTime();
}

export function ageFromBirth(birth: Date, ref: Date): number {
  let age = ref.getFullYear() - birth.getFullYear();
  const month = ref.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && ref.getDate() < birth.getDate())) age -= 1;
  return age;
}
