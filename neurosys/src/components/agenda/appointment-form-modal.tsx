"use client";

import { Check, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import type {
  AppointmentActionResult,
  AppointmentOptions,
} from "@/lib/agenda/types";

type Props = {
  open: boolean;
  options: AppointmentOptions;
  initialDate: string;
  initialTime: string;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<AppointmentActionResult>;
};

export function AppointmentFormModal({
  open,
  options,
  initialDate,
  initialTime,
  onClose,
  onSubmit,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  if (!open) return null;

  const canSchedule =
    options.patients.length > 0 && options.professionals.length > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    const result = await onSubmit(new FormData(event.currentTarget));
    setSubmitting(false);
    setFeedback(result.message);
    if (result.ok) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      role="presentation"
    >
      <button
        aria-label="Cerrar formulario"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <section
        aria-labelledby="new-appointment-title"
        aria-modal="true"
        className="relative my-6 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 id="new-appointment-title" className="text-lg font-bold text-slate-950">
              Agendar cita
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona paciente, profesional y disponibilidad.
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <form
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
          onSubmit={handleSubmit}
        >
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">Paciente</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs"
              name="patientId"
              required
            >
              {options.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Servicio</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs"
              name="serviceName"
            >
              <option>Neurorehabilitación</option>
              <option>Evaluación neuropsicológica</option>
              <option>Psicoterapia infantil</option>
              <option>Terapia de lenguaje</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Profesional
            </span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs"
              name="professionalId"
              required
            >
              {options.professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>
                  {professional.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Fecha</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs"
              defaultValue={initialDate}
              name="date"
              required
              type="date"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Hora</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs"
              defaultValue={initialTime}
              name="time"
              required
              type="time"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Duración</span>
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs"
              defaultValue="60"
              name="duration"
            >
              <option value="30">30 minutos</option>
              <option value="60">60 minutos</option>
              <option value="90">90 minutos</option>
              <option value="120">120 minutos</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Sala</span>
            <input
              className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs"
              maxLength={120}
              name="roomName"
              placeholder="Consultorio o sala"
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Nota para recepción
            </span>
            <textarea
              className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-xs"
              maxLength={1000}
              name="notes"
              rows={2}
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-600 sm:col-span-2">
            <input
              className="accent-indigo-600"
              defaultChecked
              name="reminderConsent"
              type="checkbox"
            />
            El paciente autorizó recordatorios de esta cita.
          </label>
          {!canSchedule && (
            <p className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800 sm:col-span-2">
              Registra al menos un paciente y un profesional activo para agendar.
            </p>
          )}
          {feedback && (
            <p
              className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800 sm:col-span-2"
              role="status"
            >
              {feedback}
            </p>
          )}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600"
              onClick={onClose}
              type="button"
            >
              Volver
            </button>
            <button
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              disabled={submitting || !canSchedule}
              type="submit"
            >
              <Check size={15} /> {submitting ? "Guardando..." : "Crear cita"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
