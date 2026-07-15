"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createAppointment,
  getAppointmentOptions,
  listAppointments,
  type AppointmentOptions,
  type CalendarAppointment,
} from "./actions";

const TIME_ZONE = "America/Guayaquil";
const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const weekdays = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const demoOptions: AppointmentOptions = {
  patients: [{ id: "00000000-0000-4000-8000-000000000001", name: "Mateo Guerrero" }],
  professionals: [{ id: "00000000-0000-4000-8000-000000000011", name: "Dra. Ana Pérez" }],
};

function ecuadorDateKey(date = new Date()) {
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

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function mondayOf(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  return addDays(dateKey, -offset);
}

function demoAppointments(weekStart: string): CalendarAppointment[] {
  return [
    {
      id: "demo-appointment",
      patient: "Mateo Guerrero",
      service: "Neurorehabilitación",
      professional: "Dra. Ana Pérez",
      room: "Sala cognitiva",
      startsAt: `${addDays(weekStart, 2)}T09:00:00-05:00`,
      endsAt: `${addDays(weekStart, 2)}T10:00:00-05:00`,
      status: "confirmed",
    },
  ];
}

function AppointmentModal({
  open,
  close,
  options,
  initialDate,
  initialTime,
}: {
  open: boolean;
  close: () => void;
  options: AppointmentOptions;
  initialDate: string;
  initialTime: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");
  if (!open) return null;
  const canSchedule =
    options.patients.length > 0 && options.professionals.length > 0;

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
      <button aria-label="Cerrar formulario" className="absolute inset-0 cursor-default" onClick={close} />
      <section className="relative my-6 w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Agendar cita</h2>
            <p className="mt-1 text-xs text-slate-500">
              Selecciona paciente, profesional y disponibilidad.
            </p>
          </div>
          <button aria-label="Cerrar" onClick={close} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>
        <form className="grid gap-4 p-6 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">Paciente</span>
            <select name="patientId" required className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs">
              {options.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Servicio</span>
            <select name="serviceName" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs">
              <option>Neurorehabilitación</option>
              <option>Evaluación neuropsicológica</option>
              <option>Psicoterapia infantil</option>
              <option>Terapia de lenguaje</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Profesional</span>
            <select name="professionalId" required className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs">
              {options.professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Fecha</span>
            <input name="date" type="date" required defaultValue={initialDate} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs" />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Hora</span>
            <input name="time" type="time" required defaultValue={initialTime} className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs" />
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Duración</span>
            <select name="duration" defaultValue="60" className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs">
              <option value="30">30 minutos</option>
              <option value="60">60 minutos</option>
              <option value="90">90 minutos</option>
              <option value="120">120 minutos</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">Sala</span>
            <input name="roomName" maxLength={120} placeholder="Consultorio o sala" className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">Nota para recepción</span>
            <textarea name="notes" rows={2} maxLength={1000} className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-xs" />
          </label>
          <label className="flex items-center gap-2 text-[10px] text-slate-600 sm:col-span-2">
            <input name="reminderConsent" type="checkbox" defaultChecked className="accent-indigo-600" />
            El paciente autorizó recordatorios de esta cita.
          </label>
          {!canSchedule && (
            <p className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800 sm:col-span-2">
              Registra al menos un paciente y un profesional activo para agendar.
            </p>
          )}
          {feedback && (
            <p role="status" className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800 sm:col-span-2">{feedback}</p>
          )}
          <div className="flex justify-end gap-3 sm:col-span-2">
            <button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600">Cancelar</button>
            <button type="submit" disabled={submitting || !canSchedule} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
              <Check size={15} /> {submitting ? "Guardando..." : "Confirmar cita"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AgendaPage() {
  const todayKey = ecuadorDateKey();
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayKey));
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [options, setOptions] = useState<AppointmentOptions>(demoOptions);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(() =>
    demoAppointments(mondayOf(todayKey)),
  );
  const days = useMemo(
    () => Array.from({ length: 6 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAppointments(demoAppointments(weekStart));
      return;
    }
    const from = new Date(`${weekStart}T00:00:00-05:00`).toISOString();
    const to = new Date(`${addDays(weekStart, 7)}T00:00:00-05:00`).toISOString();
    void Promise.all([getAppointmentOptions(), listAppointments(from, to)]).then(
      ([newOptions, records]) => {
        if (newOptions) setOptions(newOptions);
        if (records) setAppointments(records);
      },
    );
  }, [weekStart, modalOpen]);

  function openSlot(date: string, time = "09:00") {
    setSelectedDate(date);
    setSelectedTime(time);
    setModalOpen(true);
  }

  const monthLabel = new Intl.DateTimeFormat("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${weekStart}T12:00:00Z`));

  return (
    <>
      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-indigo-600">Operación clínica</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Agenda inteligente</h1>
            <p className="mt-2 text-xs text-slate-500">Coordina profesionales, consultorios y servicios.</p>
            <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${isSupabaseConfigured ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {isSupabaseConfigured ? "Agenda conectada" : "Modo demostrativo"}
            </span>
          </div>
          <button onClick={() => openSlot(todayKey)} className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200">
            <Plus size={16} /> Nueva cita
          </button>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <button aria-label="Semana anterior" onClick={() => setWeekStart(addDays(weekStart, -7))} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"><ChevronLeft size={16} /></button>
              <button aria-label="Semana siguiente" onClick={() => setWeekStart(addDays(weekStart, 7))} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"><ChevronRight size={16} /></button>
              <button onClick={() => setWeekStart(mondayOf(todayKey))} className="ml-1 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600">Hoy</button>
              <h2 className="ml-2 capitalize text-sm font-bold text-slate-800">{monthLabel}</h2>
            </div>
            <p className="text-[10px] font-semibold text-slate-500">
              {appointments.length} cita{appointments.length === 1 ? "" : "s"} esta semana
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="grid grid-cols-[70px_repeat(6,1fr)] border-b border-slate-100">
                <div className="border-r border-slate-100 p-3" />
                {days.map((day, index) => (
                  <div key={day} className={`border-r border-slate-100 p-3 text-center last:border-r-0 ${day === todayKey ? "bg-indigo-50/50" : ""}`}>
                    <p className={`text-[9px] font-bold ${day === todayKey ? "text-indigo-600" : "text-slate-400"}`}>{weekdays[index]}</p>
                    <span className={`mx-auto mt-1 grid size-7 place-items-center rounded-full text-xs font-bold ${day === todayKey ? "bg-indigo-600 text-white" : "text-slate-700"}`}>
                      {Number(day.slice(-2))}
                    </span>
                  </div>
                ))}
              </div>
              <div className="relative grid grid-cols-[70px_repeat(6,1fr)]">
                <div className="border-r border-slate-100">
                  {hours.map((hour) => <div key={hour} className="h-20 border-b border-slate-100 pr-3 pt-2 text-right text-[9px] font-medium text-slate-400">{hour}</div>)}
                </div>
                {days.map((day) => (
                  <div key={day} className={`relative border-r border-slate-100 last:border-r-0 ${day === todayKey ? "bg-indigo-50/20" : ""}`} style={{ height: `${hours.length * 80}px` }}>
                    {hours.map((hour) => <button key={hour} aria-label={`Agendar el ${day} a las ${hour}`} onClick={() => openSlot(day, hour)} className="block h-20 w-full border-b border-slate-100 hover:bg-indigo-50/50" />)}
                    {appointments
                      .filter((appointment) => ecuadorDateKey(new Date(appointment.startsAt)) === day)
                      .map((appointment) => {
                        const start = new Date(appointment.startsAt);
                        const end = new Date(appointment.endsAt);
                        const time = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit", hour12: false }).format(start);
                        const [hour, minute] = time.split(":").map(Number);
                        const top = ((hour * 60 + minute - 8 * 60) / 60) * 80;
                        const height = Math.max(36, ((end.getTime() - start.getTime()) / 3600000) * 80 - 4);
                        return (
                          <article key={appointment.id} className="absolute left-1.5 right-1.5 overflow-hidden rounded-lg border-l-[3px] border-indigo-400 bg-indigo-50 p-2 text-left text-indigo-800 shadow-sm" style={{ top: `${top}px`, height: `${height}px` }}>
                            <p className="truncate text-[10px] font-bold">{appointment.patient}</p>
                            <p className="mt-1 truncate text-[9px] opacity-75">{time} · {appointment.service}</p>
                            {height >= 70 && <p className="mt-1 flex items-center gap-1 truncate text-[8px] opacity-60"><Clock3 size={9} /> {appointment.professional}</p>}
                            {height >= 90 && <p className="mt-1 flex items-center gap-1 truncate text-[8px] opacity-60"><MapPin size={9} /> {appointment.room}</p>}
                          </article>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <div className="mt-4 flex items-center gap-2 text-[9px] font-medium text-slate-500">
          <UserRound size={13} /> Horario mostrado en America/Guayaquil
        </div>
      </main>
      <AppointmentModal open={modalOpen} close={() => setModalOpen(false)} options={options} initialDate={selectedDate} initialTime={selectedTime} />
    </>
  );
}
