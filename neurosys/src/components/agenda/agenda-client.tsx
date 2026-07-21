"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createAppointment,
  getAppointmentOptions,
  listAppointments,
  rescheduleAppointment,
  updateAppointmentStatus,
} from "@/app/agenda/actions";
import {
  addDays,
  addMonths,
  appointmentIso,
  ecuadorDateKey,
  formatDate,
  mondayOf,
  monthDays,
  TIME_ZONE,
} from "@/lib/agenda/calendar";
import type {
  AppointmentActionResult,
  AppointmentOptions,
  AppointmentStatus,
  CalendarAppointment,
  CalendarView,
} from "@/lib/agenda/types";
import { AppointmentDetailModal } from "./appointment-detail-modal";
import { AppointmentFormModal } from "./appointment-form-modal";
import { MonthView, WeekView } from "./calendar-views";

const demoOptions: AppointmentOptions = {
  patients: [
    { id: "00000000-0000-4000-8000-000000000001", name: "Mateo Guerrero" },
    { id: "00000000-0000-4000-8000-000000000002", name: "Sofía Andrade" },
    { id: "00000000-0000-4000-8000-000000000003", name: "Daniela Cedeño" },
  ],
  professionals: [
    { id: "00000000-0000-4000-8000-000000000011", name: "Dra. Ana Pérez" },
    { id: "00000000-0000-4000-8000-000000000012", name: "Dr. Luis Romero" },
  ],
};

function demoAppointments(today: string): CalendarAppointment[] {
  const week = mondayOf(today);
  const definitions: Array<{
    day: number;
    time: string;
    patient: string;
    service: string;
    professional: string;
    room: string;
    status: AppointmentStatus;
  }> = [
    { day: 0, time: "09:00", patient: "Mateo Guerrero", service: "Neurorehabilitación", professional: "Dra. Ana Pérez", room: "Sala cognitiva", status: "pending" },
    { day: 1, time: "10:00", patient: "Sofía Andrade", service: "Terapia de lenguaje", professional: "Dr. Luis Romero", room: "Consultorio 2", status: "confirmed" },
    { day: 2, time: "08:30", patient: "Daniela Cedeño", service: "Evaluación neuropsicológica", professional: "Dra. Ana Pérez", room: "Sala 1", status: "checked_in" },
    { day: 2, time: "11:00", patient: "Mateo Guerrero", service: "Psicoterapia infantil", professional: "Dr. Luis Romero", room: "Consultorio 3", status: "in_progress" },
    { day: 2, time: "13:00", patient: "Sofía Andrade", service: "Neurorehabilitación", professional: "Dra. Ana Pérez", room: "Sala cognitiva", status: "completed" },
    { day: 2, time: "15:00", patient: "Daniela Cedeño", service: "Terapia de lenguaje", professional: "Dr. Luis Romero", room: "Consultorio 2", status: "cancelled" },
    { day: 2, time: "16:30", patient: "Mateo Guerrero", service: "Evaluación neuropsicológica", professional: "Dra. Ana Pérez", room: "Sala 1", status: "no_show" },
    { day: 4, time: "09:30", patient: "Sofía Andrade", service: "Psicoterapia infantil", professional: "Dra. Ana Pérez", room: "Consultorio 3", status: "confirmed" },
  ];

  return definitions.map((item, index) => {
    const startsAt = appointmentIso(addDays(week, item.day), item.time);
    const endsAt = new Date(new Date(startsAt).getTime() + 60 * 60_000).toISOString();
    return {
      id: `demo-${index + 1}`,
      patient: item.patient,
      service: item.service,
      professional: item.professional,
      room: item.room,
      startsAt,
      endsAt,
      status: item.status,
      cancellationReason:
        item.status === "cancelled" ? "Paciente informó que no podrá asistir." : null,
      checkedInAt: ["checked_in", "in_progress", "completed"].includes(item.status)
        ? startsAt
        : null,
      startedAt: ["in_progress", "completed"].includes(item.status) ? startsAt : null,
      completedAt: item.status === "completed" ? endsAt : null,
    };
  });
}

export function AgendaClient({ demoMode }: { demoMode: boolean }) {
  const today = useMemo(() => ecuadorDateKey(), []);
  const [view, setView] = useState<CalendarView>("week");
  const [cursor, setCursor] = useState(today);
  const [options, setOptions] = useState<AppointmentOptions>(demoOptions);
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(() =>
    demoMode ? demoAppointments(today) : [],
  );
  const [selected, setSelected] = useState<CalendarAppointment | null>(null);
  const [newAppointment, setNewAppointment] = useState<{
    date: string;
    time: string;
  } | null>(null);
  const [loading, setLoading] = useState(!demoMode);
  const [reload, setReload] = useState(0);

  const weekStart = mondayOf(cursor);
  const monthGrid = useMemo(() => monthDays(cursor), [cursor]);
  const range =
    view === "week"
      ? { from: weekStart, to: addDays(weekStart, 7) }
      : {
          from: monthGrid[0],
          to: addDays(monthGrid[monthGrid.length - 1], 1),
        };

  useEffect(() => {
    if (demoMode) return;
    let active = true;
    void Promise.all([
      getAppointmentOptions(),
      listAppointments(
        new Date(`${range.from}T00:00:00-05:00`).toISOString(),
        new Date(`${range.to}T00:00:00-05:00`).toISOString(),
      ),
    ]).then(([newOptions, records]) => {
      if (!active) return;
      if (newOptions) setOptions(newOptions);
      if (records) setAppointments(records);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [demoMode, range.from, range.to, reload]);

  const visibleAppointments = appointments.filter((appointment) => {
    const date = ecuadorDateKey(new Date(appointment.startsAt));
    return date >= range.from && date < range.to;
  });

  const label =
    view === "week"
      ? `${formatDate(weekStart, { day: "numeric", month: "short" })} – ${formatDate(
          addDays(weekStart, 6),
          { day: "numeric", month: "short", year: "numeric" },
        )}`
      : formatDate(cursor.slice(0, 7) + "-01", {
          month: "long",
          year: "numeric",
        });

  function openSlot(date: string, time = "09:00") {
    setNewAppointment({ date, time });
  }

  function movePeriod(direction: -1 | 1) {
    setCursor(
      view === "week"
        ? addDays(cursor, direction * 7)
        : addMonths(cursor, direction),
    );
  }

  function updateLocalAppointment(
    id: string,
    changes: Partial<CalendarAppointment>,
  ) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, ...changes } : appointment,
      ),
    );
    setSelected((current) =>
      current?.id === id ? { ...current, ...changes } : current,
    );
  }

  async function submitNew(formData: FormData): Promise<AppointmentActionResult> {
    if (!demoMode) {
      const result = await createAppointment(formData);
      if (result.ok) setReload((value) => value + 1);
      return result;
    }

    const patientId = String(formData.get("patientId"));
    const professionalId = String(formData.get("professionalId"));
    const date = String(formData.get("date"));
    const time = String(formData.get("time"));
    const duration = Number(formData.get("duration"));
    const startsAt = appointmentIso(date, time);
    const appointment: CalendarAppointment = {
      id: `demo-local-${Date.now()}`,
      patient:
        options.patients.find((patient) => patient.id === patientId)?.name ??
        "Paciente",
      professional:
        options.professionals.find(
          (professional) => professional.id === professionalId,
        )?.name ?? "Profesional",
      service: String(formData.get("serviceName")),
      room: String(formData.get("roomName") || "Sin sala"),
      startsAt,
      endsAt: new Date(
        new Date(startsAt).getTime() + duration * 60_000,
      ).toISOString(),
      status: "pending",
      cancellationReason: null,
      checkedInAt: null,
      startedAt: null,
      completedAt: null,
    };
    setAppointments((current) => [...current, appointment]);
    return { ok: true, message: "Cita creada en la demostración." };
  }

  async function changeStatus(
    status: AppointmentStatus,
    reason?: string,
  ): Promise<AppointmentActionResult> {
    if (!selected) return { ok: false, message: "Selecciona una cita." };
    const result = demoMode
      ? { ok: true, message: "Estado actualizado en la demostración." }
      : await updateAppointmentStatus(selected.id, status, reason);
    if (result.ok) {
      const now = new Date().toISOString();
      updateLocalAppointment(selected.id, {
        status,
        cancellationReason: status === "cancelled" ? reason ?? null : null,
        checkedInAt: status === "checked_in" ? now : selected.checkedInAt,
        startedAt: status === "in_progress" ? now : selected.startedAt,
        completedAt: status === "completed" ? now : selected.completedAt,
      });
    }
    return result;
  }

  async function reschedule(formData: FormData): Promise<AppointmentActionResult> {
    if (!selected) return { ok: false, message: "Selecciona una cita." };
    const result = demoMode
      ? { ok: true, message: "Cita reprogramada en la demostración." }
      : await rescheduleAppointment(formData);
    if (result.ok) {
      const startsAt = appointmentIso(
        String(formData.get("date")),
        String(formData.get("time")),
      );
      updateLocalAppointment(selected.id, {
        startsAt,
        endsAt: new Date(
          new Date(startsAt).getTime() +
            Number(formData.get("duration")) * 60_000,
        ).toISOString(),
      });
    }
    return result;
  }

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
                demoMode
                  ? "bg-amber-50 text-amber-700"
                  : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {demoMode ? "Modo demostrativo · cambios locales" : "Agenda conectada"}
            </span>
          </div>
          <button
            className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200"
            onClick={() => openSlot(today)}
          >
            <Plus size={16} /> Nueva cita
          </button>
        </div>

        <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                aria-label={view === "week" ? "Semana anterior" : "Mes anterior"}
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"
                onClick={() => movePeriod(-1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                aria-label={view === "week" ? "Semana siguiente" : "Mes siguiente"}
                className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500"
                onClick={() => movePeriod(1)}
              >
                <ChevronRight size={16} />
              </button>
              <button
                className="ml-1 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-bold text-slate-600"
                onClick={() => setCursor(today)}
              >
                Hoy
              </button>
              <h2 className="ml-1 capitalize text-sm font-bold text-slate-800 sm:ml-2">
                {label}
              </h2>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold text-slate-500">
                {loading
                  ? "Cargando..."
                  : `${visibleAppointments.length} cita${
                      visibleAppointments.length === 1 ? "" : "s"
                    }`}
              </p>
              <div className="flex rounded-xl bg-slate-100 p-1">
                {(["week", "month"] as const).map((calendarView) => (
                  <button
                    aria-pressed={view === calendarView}
                    className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${
                      view === calendarView
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-500"
                    }`}
                    key={calendarView}
                    onClick={() => setView(calendarView)}
                  >
                    {calendarView === "week" ? "Semana" : "Mes"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {view === "week" ? (
            <WeekView
              appointments={visibleAppointments}
              onAppointment={setSelected}
              onSlot={openSlot}
              today={today}
              weekStart={weekStart}
            />
          ) : (
            <MonthView
              appointments={visibleAppointments}
              days={monthGrid}
              monthKey={cursor.slice(0, 7)}
              onAppointment={setSelected}
              onSlot={openSlot}
              today={today}
            />
          )}
        </section>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[9px] font-medium text-slate-500">
          <UserRound size={13} /> Horario mostrado en {TIME_ZONE}
          <span className="mx-1 text-slate-300">·</span>
          <CalendarDays size={13} /> Pulsa un horario para agendar
        </div>
      </main>

      <AppointmentFormModal
        initialDate={newAppointment?.date ?? today}
        initialTime={newAppointment?.time ?? "09:00"}
        key={`${newAppointment?.date}-${newAppointment?.time}`}
        onClose={() => setNewAppointment(null)}
        onSubmit={submitNew}
        open={newAppointment !== null}
        options={options}
      />
      <AppointmentDetailModal
        appointment={selected}
        key={selected?.id ?? "closed"}
        onClose={() => setSelected(null)}
        onReschedule={reschedule}
        onStatus={changeStatus}
      />
    </>
  );
}
