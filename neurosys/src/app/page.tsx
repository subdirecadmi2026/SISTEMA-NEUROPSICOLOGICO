import {
  Activity,
  CalendarDays,
  ChevronRight,
  Clock3,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

type TodayAppointment = {
  id: string;
  time: string;
  patient: string;
  initials: string;
  service: string;
  status: string;
};

const statusLabels: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  checked_in: "En espera",
  in_progress: "En consulta",
  completed: "Completada",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

function dateKeyInEcuador(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function loadDashboard() {
  const fallback = {
    name: "Diego",
    patientCount: 1486,
    newPatients: 32,
    completedSessions: 386,
    appointments: [
      {
        id: "demo",
        time: "09:00",
        patient: "Mateo Guerrero",
        initials: "MG",
        service: "Evaluación neuropsicológica",
        status: "Confirmada",
      },
    ] satisfies TodayAppointment[],
  };
  if (!isSupabaseConfigured) return fallback;

  const supabase = await createClient();
  if (!supabase) return fallback;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("active", true)
    .limit(1)
    .maybeSingle();
  if (!membership) redirect("/onboarding");

  const today = dateKeyInEcuador();
  const monthStart = `${today.slice(0, 8)}01`;
  const todayStart = new Date(`${today}T00:00:00-05:00`).toISOString();
  const tomorrowStart = new Date(
    `${new Date(`${today}T12:00:00Z`).toISOString().slice(0, 10)}T00:00:00-05:00`,
  );
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);
  const monthStartIso = new Date(`${monthStart}T00:00:00-05:00`).toISOString();

  const [profileResult, patientsResult, newPatientsResult, completedResult, agendaResult] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("status", "active")
        .is("deleted_at", null),
      supabase
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .gte("created_at", monthStartIso)
        .is("deleted_at", null),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", membership.organization_id)
        .eq("status", "completed")
        .gte("starts_at", monthStartIso)
        .is("deleted_at", null),
      supabase
        .from("appointments")
        .select(
          "id, starts_at, service_name, status, patients!appointments_patient_id_fkey(first_names, last_names)",
        )
        .eq("organization_id", membership.organization_id)
        .gte("starts_at", todayStart)
        .lt("starts_at", tomorrowStart.toISOString())
        .is("deleted_at", null)
        .order("starts_at")
        .limit(20),
    ]);

  return {
    name: profileResult.data?.full_name?.split(" ")[0] ?? "equipo",
    patientCount: patientsResult.count ?? 0,
    newPatients: newPatientsResult.count ?? 0,
    completedSessions: completedResult.count ?? 0,
    appointments: (agendaResult.data ?? []).map((appointment) => {
      const patient = Array.isArray(appointment.patients)
        ? appointment.patients[0]
        : appointment.patients;
      const firstNames = patient?.first_names ?? "Paciente";
      const lastNames = patient?.last_names ?? "";
      return {
        id: appointment.id,
        time: new Intl.DateTimeFormat("es-EC", {
          timeZone: "America/Guayaquil",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date(appointment.starts_at)),
        patient: `${firstNames} ${lastNames}`.trim(),
        initials: `${firstNames[0] ?? ""}${lastNames[0] ?? ""}`.toUpperCase(),
        service: appointment.service_name,
        status: statusLabels[appointment.status] ?? appointment.status,
      };
    }),
  };
}

export default async function Home() {
  const dashboard = await loadDashboard();
  const stats = [
    {
      label: "Citas de hoy",
      value: dashboard.appointments.length,
      detail: "Agenda del centro",
      icon: CalendarDays,
      tone: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Pacientes activos",
      value: dashboard.patientCount,
      detail: `${dashboard.newPatients} nuevos este mes`,
      icon: Users,
      tone: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Sesiones realizadas",
      value: dashboard.completedSessions,
      detail: "Durante este mes",
      icon: Activity,
      tone: "bg-violet-50 text-violet-600",
    },
  ];

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-indigo-600">Panel ejecutivo</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
            Buenos días, {dashboard.name}
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Este es el estado clínico del centro para hoy.
          </p>
        </div>
        <Link
          href="/agenda"
          className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200"
        >
          <CalendarDays size={16} /> Agendar cita
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className={`grid size-10 place-items-center rounded-xl ${item.tone}`}>
                <Icon size={20} />
              </div>
              <p className="mt-5 text-xs font-medium text-slate-500">{item.label}</p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                {item.value}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">{item.detail}</p>
            </article>
          );
        })}
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Agenda de hoy</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              {dashboard.appointments.length} citas programadas
            </p>
          </div>
          <Link href="/agenda" className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
            Ver agenda <ChevronRight size={14} />
          </Link>
        </div>
        {dashboard.appointments.length === 0 ? (
          <div className="p-10 text-center">
            <Clock3 className="mx-auto text-slate-300" size={24} />
            <p className="mt-3 text-xs font-semibold text-slate-600">
              No hay citas para hoy
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {dashboard.appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="grid grid-cols-[55px_1fr_auto] items-center gap-3 px-4 py-4 sm:grid-cols-[65px_1fr_1fr_auto] sm:px-6"
              >
                <p className="text-xs font-bold text-slate-900">{appointment.time}</p>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                    {appointment.initials}
                  </span>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {appointment.patient}
                  </p>
                </div>
                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  {appointment.service}
                </p>
                <span className="whitespace-nowrap rounded-full bg-indigo-50 px-2.5 py-1.5 text-[9px] font-bold text-indigo-700">
                  {appointment.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-emerald-600" />
        <div>
          <h2 className="text-sm font-bold text-emerald-900">
            Núcleo clínico protegido
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-emerald-800/70">
            Pacientes, citas y evoluciones se limitan por organización y rol
            mediante políticas RLS de Supabase.
          </p>
        </div>
      </section>
    </main>
  );
}
