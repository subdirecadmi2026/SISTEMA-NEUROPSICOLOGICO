"use client";

import {
  CalendarClock,
  Clock3,
  MapPin,
  Stethoscope,
  UserRound,
  X,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  ecuadorDateKey,
  formatDate,
  formatTime,
  statusLabels,
  statusStyles,
  validTransitions,
} from "@/lib/agenda/calendar";
import type {
  AppointmentActionResult,
  AppointmentStatus,
  CalendarAppointment,
} from "@/lib/agenda/types";

const actionLabels: Partial<Record<AppointmentStatus, string>> = {
  confirmed: "Confirmar",
  checked_in: "Registrar check-in",
  in_progress: "Iniciar atención",
  completed: "Completar",
  no_show: "Marcar no asistió",
};

type Props = {
  appointment: CalendarAppointment | null;
  onClose: () => void;
  onStatus: (
    status: AppointmentStatus,
    reason?: string,
  ) => Promise<AppointmentActionResult>;
  onReschedule: (formData: FormData) => Promise<AppointmentActionResult>;
};

export function AppointmentDetailModal({
  appointment,
  onClose,
  onStatus,
  onReschedule,
}: Props) {
  const [mode, setMode] = useState<"actions" | "cancel" | "reschedule">("actions");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (!appointment) return null;

  const duration = Math.round(
    (new Date(appointment.endsAt).getTime() -
      new Date(appointment.startsAt).getTime()) /
      60_000,
  );
  const transitions = validTransitions[appointment.status];
  const reschedulable = ["pending", "confirmed"].includes(appointment.status);

  async function runStatus(status: AppointmentStatus, reason?: string) {
    setBusy(true);
    setFeedback("");
    const result = await onStatus(status, reason);
    setBusy(false);
    setFeedback(result.message);
    if (result.ok) setMode("actions");
  }

  async function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (!reason) {
      setFeedback("El motivo de cancelación es obligatorio.");
      return;
    }
    await runStatus("cancelled", reason);
  }

  async function submitReschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setFeedback("");
    const result = await onReschedule(new FormData(event.currentTarget));
    setBusy(false);
    setFeedback(result.message);
    if (result.ok) setMode("actions");
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm"
      role="presentation"
    >
      <button
        aria-label="Cerrar detalle"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <aside
        aria-labelledby="appointment-detail-title"
        aria-modal="true"
        className="relative h-full w-full overflow-y-auto bg-white shadow-2xl sm:max-w-md"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
              Detalle de cita
            </p>
            <h2
              className="mt-1 text-xl font-bold text-slate-950"
              id="appointment-detail-title"
            >
              {appointment.patient}
            </h2>
          </div>
          <button
            aria-label="Cerrar"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${statusStyles[appointment.status]}`}
          >
            {statusLabels[appointment.status]}
          </span>

          <dl className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <Detail icon={<CalendarClock size={16} />} label="Horario">
              {formatDate(appointment.startsAt, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
              , {formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}
            </Detail>
            <Detail icon={<Stethoscope size={16} />} label="Servicio">
              {appointment.service}
            </Detail>
            <Detail icon={<UserRound size={16} />} label="Profesional">
              {appointment.professional}
            </Detail>
            <Detail icon={<MapPin size={16} />} label="Sala">
              {appointment.room}
            </Detail>
            <Detail icon={<Clock3 size={16} />} label="Duración">
              {duration} minutos
            </Detail>
          </dl>

          {appointment.cancellationReason && (
            <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-[10px] font-bold uppercase text-rose-700">
                Motivo de cancelación
              </p>
              <p className="mt-1 text-xs text-rose-800">
                {appointment.cancellationReason}
              </p>
            </div>
          )}

          {mode === "actions" && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-800">Acciones disponibles</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {transitions
                  .filter((status) => status !== "cancelled")
                  .map((status) => (
                    <button
                      className="rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                      disabled={busy}
                      key={status}
                      onClick={() => void runStatus(status)}
                    >
                      {actionLabels[status]}
                    </button>
                  ))}
                {reschedulable && (
                  <button
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700"
                    onClick={() => {
                      setFeedback("");
                      setMode("reschedule");
                    }}
                  >
                    Reprogramar
                  </button>
                )}
                {transitions.includes("cancelled") && (
                  <button
                    className="rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-700"
                    onClick={() => {
                      setFeedback("");
                      setMode("cancel");
                    }}
                  >
                    Cancelar cita
                  </button>
                )}
              </div>
              {transitions.length === 0 && (
                <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  Esta cita está en un estado final y no admite más acciones.
                </p>
              )}
            </div>
          )}

          {mode === "cancel" && (
            <form className="space-y-4" onSubmit={submitCancellation}>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cancelar cita</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Registra el motivo para mantener la trazabilidad.
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Motivo obligatorio
                </span>
                <textarea
                  className="w-full resize-none rounded-xl border border-slate-200 p-3 text-xs"
                  maxLength={500}
                  name="reason"
                  required
                  rows={3}
                />
              </label>
              <FormButtons
                busy={busy}
                confirmLabel="Confirmar cancelación"
                onBack={() => setMode("actions")}
              />
            </form>
          )}

          {mode === "reschedule" && (
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitReschedule}>
              <input name="appointmentId" type="hidden" value={appointment.id} />
              <div className="sm:col-span-2">
                <h3 className="text-sm font-bold text-slate-900">Reprogramar cita</h3>
                <p className="mt-1 text-xs text-slate-500">
                  El sistema validará la disponibilidad del profesional.
                </p>
              </div>
              <label className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">Fecha</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs"
                  defaultValue={ecuadorDateKey(new Date(appointment.startsAt))}
                  name="date"
                  required
                  type="date"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">Hora</span>
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs"
                  defaultValue={formatTime(appointment.startsAt)}
                  name="time"
                  required
                  type="time"
                />
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Duración
                </span>
                <select
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs"
                  defaultValue={String(duration)}
                  name="duration"
                >
                  {[30, 60, 90, 120].map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {minutes} minutos
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-2">
                <FormButtons
                  busy={busy}
                  confirmLabel="Guardar nuevo horario"
                  onBack={() => setMode("actions")}
                />
              </div>
            </form>
          )}

          {feedback && (
            <p
              className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800"
              role="status"
            >
              {feedback}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div>
        <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
          {label}
        </dt>
        <dd className="mt-0.5 text-xs font-medium capitalize text-slate-700">
          {children}
        </dd>
      </div>
    </div>
  );
}

function FormButtons({
  busy,
  confirmLabel,
  onBack,
}: {
  busy: boolean;
  confirmLabel: string;
  onBack: () => void;
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600"
        onClick={onBack}
        type="button"
      >
        Volver
      </button>
      <button
        className="rounded-xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        {busy ? "Guardando..." : confirmLabel}
      </button>
    </div>
  );
}
