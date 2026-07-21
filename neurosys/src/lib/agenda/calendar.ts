import type { AppointmentStatus } from "./types";

export const TIME_ZONE = "America/Guayaquil";
export const CALENDAR_START_HOUR = 8;
export const CALENDAR_END_HOUR = 18;
export const WEEKDAYS_SHORT = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];

export const statusLabels: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  checked_in: "Check-in",
  in_progress: "En atención",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export const statusStyles: Record<AppointmentStatus, string> = {
  pending: "border-amber-400 bg-amber-50 text-amber-800",
  confirmed: "border-indigo-400 bg-indigo-50 text-indigo-800",
  checked_in: "border-cyan-400 bg-cyan-50 text-cyan-800",
  in_progress: "border-violet-400 bg-violet-50 text-violet-800",
  completed: "border-emerald-400 bg-emerald-50 text-emerald-800",
  cancelled: "border-slate-400 bg-slate-100 text-slate-600",
  no_show: "border-rose-400 bg-rose-50 text-rose-800",
};

export const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function ecuadorDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function mondayOf(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  return addDays(dateKey, -((date.getUTCDay() + 6) % 7));
}

export function addMonths(dateKey: string, amount: number) {
  const date = new Date(`${dateKey.slice(0, 7)}-01T12:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 10);
}

export function monthDays(dateKey: string) {
  const first = `${dateKey.slice(0, 7)}-01`;
  const nextMonth = addMonths(first, 1);
  const gridStart = mondayOf(first);
  const last = addDays(nextMonth, -1);
  const gridEnd = addDays(mondayOf(last), 6);
  const count = Math.max(
    35,
    Math.round(
      (new Date(`${gridEnd}T12:00:00Z`).getTime() -
        new Date(`${gridStart}T12:00:00Z`).getTime()) /
        86_400_000,
    ) + 1,
  );
  return Array.from({ length: count }, (_, index) => addDays(gridStart, index));
}

export function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: typeof value === "string" && value.length === 10 ? "UTC" : TIME_ZONE,
    ...options,
  }).format(
    typeof value === "string"
      ? new Date(`${value}${value.length === 10 ? "T12:00:00Z" : ""}`)
      : value,
  );
}

export function appointmentIso(date: string, time: string) {
  return new Date(`${date}T${time}:00-05:00`).toISOString();
}
