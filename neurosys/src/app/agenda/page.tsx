"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  MapPin,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createAppointment,
  getAppointmentOptions,
  type AppointmentOptions,
} from "./actions";

const days = [
  { weekday: "LUN", number: 13 },
  { weekday: "MAR", number: 14 },
  { weekday: "MIÉ", number: 15, today: true },
  { weekday: "JUE", number: 16 },
  { weekday: "VIE", number: 17 },
  { weekday: "SÁB", number: 18 },
];

const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

const appointments = [
  {
    day: 0,
    start: 0.5,
    duration: 1,
    patient: "Emilia Morales",
    service: "Psicoterapia infantil",
    professional: "Ps. Carlos Mena",
    room: "Consultorio 2",
    tone: "border-indigo-300 bg-indigo-50 text-indigo-800",
  },
  {
    day: 1,
    start: 1,
    duration: 1.5,
    patient: "Julián Torres",
    service: "Terapia de lenguaje",
    professional: "Lic. María León",
    room: "Sala 1",
    tone: "border-amber-300 bg-amber-50 text-amber-800",
  },
  {
    day: 2,
    start: 0.5,
    duration: 0.75,
    patient: "Mateo Guerrero",
    service: "Evaluación neuropsicológica",
    professional: "Dra. Ana Pérez",
    room: "Consultorio 3",
    tone: "border-violet-300 bg-violet-50 text-violet-800",
  },
  {
    day: 2,
    start: 1.5,
    duration: 1,
    patient: "Sofía Andrade",
    service: "Psicoterapia infantil",
    professional: "Ps. Carlos Mena",
    room: "Consultorio 2",
    tone: "border-emerald-300 bg-emerald-50 text-emerald-800",
  },
  {
    day: 2,
    start: 3.5,
    duration: 1,
    patient: "Valentina Ruiz",
    service: "Aplicación WAIS",
    professional: "Dra. Ana Pérez",
    room: "Consultorio 3",
    tone: "border-indigo-300 bg-indigo-50 text-indigo-800",
  },
  {
    day: 3,
    start: 2,
    duration: 1,
    patient: "Daniel Paz",
    service: "Neurorehabilitación",
    professional: "Dra. Ana Pérez",
    room: "Sala cognitiva",
    tone: "border-sky-300 bg-sky-50 text-sky-800",
  },
  {
    day: 4,
    start: 1,
    duration: 1,
    patient: "Mateo Guerrero",
    service: "Neurorehabilitación",
    professional: "Dra. Ana Pérez",
    room: "Sala cognitiva",
    tone: "border-violet-300 bg-violet-50 text-violet-800",
  },
  {
    day: 5,
    start: 2.5,
    duration: 1,
    patient: "Lucía Vega",
    service: "Terapia familiar",
    professional: "Ps. Carlos Mena",
    room: "Consultorio 1",
    tone: "border-rose-300 bg-rose-50 text-rose-800",
  },
];

function AppointmentModal({
  open,
  close,
  options,
}: {
  open: boolean;
  close: () => void;
  options: AppointmentOptions;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    const result = await createAppointment(new FormData(event.currentTarget));
    setSubmitting(false);
    setFeedback(result.message);
    if (result.ok) close();
  }

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm">
      <button
        aria-label="Cerrar formulario"
        className="absolute inset-0 cursor-default"
        onClick={close}
      />
      <section className="relative my-6 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Agendar cita</h2>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona paciente, servicio y disponibilidad.
            </p>
          </div>
          <button
            aria-label="Cerrar"
            onClick={close}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X size={18} />
          </button>
        </div>
        <form
          className="grid gap-4 p-6 sm:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Paciente
            </span>
            <select
              name="patientId"
              required
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-indigo-400"
            >
              {options.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Servicio
            </span>
            <select
              name="serviceName"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-indigo-400"
            >
              {[
                "Neurorehabilitación",
                "Evaluación neuropsicológica",
                "Psicoterapia infantil",
              ].map((service) => (
                <option key={service}>{service}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Profesional
            </span>
            <select
              name="professionalId"
              required
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-indigo-400"
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
              name="date"
              type="date"
              required
              defaultValue="2026-07-15"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Hora</span>
            <input
              name="time"
              type="time"
              required
              defaultValue="09:00"
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-indigo-400"
            />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Nota para recepción
            </span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Indicaciones opcionales..."
              className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-xs outline-none focus:border-indigo-400"
            />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-600 sm:col-span-2">
            <input
              name="reminderConsent"
              type="checkbox"
              defaultChecked
              className="accent-indigo-600"
            />
            Enviar confirmación automática al paciente
          </label>
          {feedback && (
            <p
              role="status"
              className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800 sm:col-span-2"
            >
              {feedback}
            </p>
          )}
          <div className="mt-2 flex justify-end gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={close}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              <Check size={15} />
              {submitting ? "Guardando..." : "Confirmar cita"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AgendaPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [appointmentOptions, setAppointmentOptions] =
    useState<AppointmentOptions>({
      patients: [
        { id: "00000000-0000-4000-8000-000000000001", name: "Mateo Guerrero" },
        { id: "00000000-0000-4000-8000-000000000002", name: "Sofía Andrade" },
        { id: "00000000-0000-4000-8000-000000000003", name: "Julián Torres" },
      ],
      professionals: [
        { id: "00000000-0000-4000-8000-000000000011", name: "Dra. Ana Pérez" },
        { id: "00000000-0000-4000-8000-000000000012", name: "Ps. Carlos Mena" },
        { id: "00000000-0000-4000-8000-000000000013", name: "Lic. María León" },
      ],
    });

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void getAppointmentOptions().then((options) => {
      if (options) setAppointmentOptions(options);
    });
  }, [modalOpen]);

  return (
    <>
      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-indigo-600">Operación clínica</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Agenda inteligente
            </h1>
            <p className="mt-2 text-xs text-slate-500">
              Coordina profesionales, consultorios y servicios.
            </p>
            <span
              className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${
                isSupabaseConfigured
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isSupabaseConfigured ? "Agenda conectada" : "Modo demostrativo"}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200"
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button
                aria-label="Semana anterior"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label="Semana siguiente"
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"
              >
                <ChevronRight size={16} />
              </button>
              <button className="ml-1 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">
                Hoy
              </button>
              <h2 className="ml-2 text-sm font-bold text-slate-800">
                13 – 18 de julio, 2026
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-semibold text-slate-600">
                <UserRound size={14} /> Todos los profesionales
              </button>
              <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-[10px] font-semibold text-slate-600">
                <MapPin size={14} /> Todas las salas
              </button>
              <button
                aria-label="Filtros"
                className="rounded-xl border border-slate-200 p-2.5 text-slate-500"
              >
                <Filter size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[70px_repeat(6,1fr)] border-b border-slate-100">
                <div className="border-r border-slate-100 p-3" />
                {days.map((day) => (
                  <div
                    key={day.number}
                    className={`border-r border-slate-100 p-3 text-center last:border-r-0 ${
                      day.today ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    <p
                      className={`text-[9px] font-bold ${
                        day.today ? "text-indigo-600" : "text-slate-400"
                      }`}
                    >
                      {day.weekday}
                    </p>
                    <span
                      className={`mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs font-bold ${
                        day.today
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700"
                      }`}
                    >
                      {day.number}
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative grid grid-cols-[70px_repeat(6,1fr)]">
                <div className="border-r border-slate-100">
                  {hours.map((hour) => (
                    <div
                      key={hour}
                      className="h-20 border-b border-slate-100 pr-3 pt-2 text-right text-[9px] font-medium text-slate-400"
                    >
                      {hour}
                    </div>
                  ))}
                </div>
                {days.map((day, dayIndex) => (
                  <div
                    key={day.number}
                    className={`relative border-r border-slate-100 last:border-r-0 ${
                      day.today ? "bg-indigo-50/20" : ""
                    }`}
                    style={{ height: `${hours.length * 80}px` }}
                  >
                    {hours.map((hour) => (
                      <button
                        key={hour}
                        aria-label={`Agendar el ${day.number} a las ${hour}`}
                        onClick={() => setModalOpen(true)}
                        className="block h-20 w-full border-b border-slate-100 hover:bg-indigo-50/50"
                      />
                    ))}
                    {appointments
                      .filter((appointment) => appointment.day === dayIndex)
                      .map((appointment) => (
                        <button
                          key={`${appointment.patient}-${appointment.start}`}
                          className={`absolute left-1.5 right-1.5 overflow-hidden rounded-lg border-l-[3px] p-2 text-left shadow-sm ${appointment.tone}`}
                          style={{
                            top: `${appointment.start * 80}px`,
                            height: `${appointment.duration * 80 - 4}px`,
                          }}
                        >
                          <p className="truncate text-[10px] font-bold">
                            {appointment.patient}
                          </p>
                          <p className="mt-1 truncate text-[9px] opacity-75">
                            {appointment.service}
                          </p>
                          {appointment.duration >= 1 && (
                            <p className="mt-1 flex items-center gap-1 truncate text-[8px] opacity-60">
                              <Clock3 size={9} /> {appointment.professional}
                            </p>
                          )}
                        </button>
                      ))}
                    {day.today && (
                      <div
                        className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                        style={{ top: "292px" }}
                      >
                        <span className="-ml-1 size-2 rounded-full bg-rose-500" />
                        <span className="h-px flex-1 bg-rose-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 flex flex-wrap gap-4 text-[9px] font-medium text-slate-500">
          {[
            ["bg-indigo-400", "Evaluación"],
            ["bg-emerald-400", "Psicoterapia"],
            ["bg-amber-400", "Lenguaje"],
            ["bg-violet-400", "Neurorehabilitación"],
            ["bg-rose-400", "Terapia familiar"],
          ].map(([color, label]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${color}`} /> {label}
            </span>
          ))}
        </div>
      </main>
      <AppointmentModal
        open={modalOpen}
        close={() => setModalOpen(false)}
        options={appointmentOptions}
      />
    </>
  );
}
