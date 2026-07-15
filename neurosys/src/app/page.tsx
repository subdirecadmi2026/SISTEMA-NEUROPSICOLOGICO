"use client";

import {
  Activity,
  Bell,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardPlus,
  Clock3,
  FileChartColumn,
  HeartPulse,
  LayoutDashboard,
  Menu,
  MessageCircleMore,
  MoreHorizontal,
  Search,
  Settings,
  Sparkles,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { label: "Inicio", icon: LayoutDashboard, active: true },
  { label: "Pacientes", icon: Users },
  { label: "Agenda", icon: CalendarDays, count: "8" },
  { label: "Historia clínica", icon: ClipboardPlus },
  { label: "Evaluaciones", icon: BrainCircuit },
  { label: "Terapias", icon: HeartPulse },
  { label: "Informes", icon: FileChartColumn },
  { label: "Comunicaciones", icon: MessageCircleMore },
  { label: "Caja y facturación", icon: WalletCards },
];

const appointments = [
  {
    time: "08:30",
    duration: "45 min",
    patient: "Mateo Guerrero",
    initials: "MG",
    professional: "Dra. Ana Pérez",
    service: "Evaluación neuropsicológica",
    status: "Confirmada",
    color: "indigo",
  },
  {
    time: "09:30",
    duration: "60 min",
    patient: "Sofía Andrade",
    initials: "SA",
    professional: "Ps. Carlos Mena",
    service: "Psicoterapia infantil",
    status: "En consulta",
    color: "emerald",
  },
  {
    time: "10:45",
    duration: "45 min",
    patient: "Julián Torres",
    initials: "JT",
    professional: "Lic. María León",
    service: "Terapia de lenguaje",
    status: "Por confirmar",
    color: "amber",
  },
  {
    time: "11:30",
    duration: "60 min",
    patient: "Valentina Ruiz",
    initials: "VR",
    professional: "Dra. Ana Pérez",
    service: "Aplicación WAIS",
    status: "Confirmada",
    color: "violet",
  },
];

const stats = [
  {
    label: "Citas de hoy",
    value: "24",
    detail: "8 pendientes",
    trend: "+12%",
    icon: CalendarDays,
    tone: "indigo",
  },
  {
    label: "Pacientes activos",
    value: "1.248",
    detail: "32 nuevos este mes",
    trend: "+8,4%",
    icon: Users,
    tone: "emerald",
  },
  {
    label: "Sesiones realizadas",
    value: "386",
    detail: "Este mes",
    trend: "+6,2%",
    icon: Activity,
    tone: "violet",
  },
  {
    label: "Ocupación",
    value: "87%",
    detail: "Promedio semanal",
    trend: "+3,1%",
    icon: Clock3,
    tone: "amber",
  },
];

function Brand() {
  return (
    <div className="flex h-20 items-center gap-3 px-5">
      <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
        <BrainCircuit size={23} strokeWidth={2.1} />
      </div>
      <div>
        <p className="text-[17px] font-bold tracking-tight text-slate-950">
          NeuroSys
        </p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
          Clinical ERP
        </p>
      </div>
    </div>
  );
}

function Sidebar({
  mobileOpen,
  close,
}: {
  mobileOpen: boolean;
  close: () => void;
}) {
  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-sm lg:hidden"
          onClick={close}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-slate-200/80 bg-white transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between pr-4">
          <Brand />
          <button
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 lg:hidden"
            onClick={close}
          >
            <X size={19} />
          </button>
        </div>

        <div className="mx-4 mb-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-white text-xs font-bold text-indigo-600 shadow-sm">
              NW
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                Centro Ñampi Wasi
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">Sede principal</p>
            </div>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.17em] text-slate-400">
            Espacio de trabajo
          </p>
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={close}
                  className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                    item.active
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={item.active ? 2.2 : 1.8}
                    className={item.active ? "text-indigo-600" : "text-slate-400"}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.count && (
                    <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="border-t border-slate-100 p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
            <Settings size={18} className="text-slate-400" />
            Configuración
          </button>
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 text-xs font-bold text-indigo-700">
              DR
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                Dr. Diego Romero
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Director clínico
              </p>
            </div>
            <MoreHorizontal size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>
    </>
  );
}

function StatCard({ item }: { item: (typeof stats)[number] }) {
  const Icon = item.icon;
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  };

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between">
        <div className={`grid size-10 place-items-center rounded-xl ${tones[item.tone]}`}>
          <Icon size={20} />
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
          {item.trend}
        </span>
      </div>
      <p className="mt-5 text-[12px] font-medium text-slate-500">{item.label}</p>
      <div className="mt-1 flex items-end justify-between gap-2">
        <p className="text-2xl font-bold tracking-tight text-slate-950">
          {item.value}
        </p>
        <p className="pb-1 text-[10px] text-slate-400">{item.detail}</p>
      </div>
    </article>
  );
}

function Appointments() {
  const statuses: Record<string, string> = {
    Confirmada: "bg-indigo-50 text-indigo-700",
    "En consulta": "bg-emerald-50 text-emerald-700",
    "Por confirmar": "bg-amber-50 text-amber-700",
  };
  const avatars: Record<string, string> = {
    indigo: "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30 xl:col-span-2">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Agenda de hoy</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Miércoles, 15 de julio · 24 citas programadas
          </p>
        </div>
        <button className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
          Ver agenda <ChevronRight size={14} />
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {appointments.map((appointment) => (
          <div
            key={`${appointment.time}-${appointment.patient}`}
            className="group grid grid-cols-[58px_1fr_auto] items-center gap-3 px-4 py-4 transition hover:bg-slate-50/70 sm:grid-cols-[70px_1fr_1fr_auto] sm:gap-4 sm:px-6"
          >
            <div>
              <p className="text-xs font-bold text-slate-900">{appointment.time}</p>
              <p className="mt-1 text-[10px] text-slate-400">{appointment.duration}</p>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`grid size-9 shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                  avatars[appointment.color]
                }`}
              >
                {appointment.initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {appointment.patient}
                </p>
                <p className="mt-1 truncate text-[10px] text-slate-400 sm:hidden">
                  {appointment.service}
                </p>
              </div>
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xs font-medium text-slate-600">
                {appointment.service}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-400">
                {appointment.professional}
              </p>
            </div>
            <span
              className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-bold sm:text-[10px] ${
                statuses[appointment.status]
              }`}
            >
              {appointment.status}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function OccupancyChart() {
  const values = [48, 64, 57, 76, 87, 68, 44];
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Ocupación semanal</h2>
          <p className="mt-1 text-[11px] text-slate-500">Porcentaje de agenda utilizada</p>
        </div>
        <span className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500">
          Esta semana
        </span>
      </div>
      <div className="mt-7 flex h-36 items-end justify-between gap-2">
        {values.map((value, index) => (
          <div key={days[index]} className="flex h-full flex-1 flex-col justify-end">
            <div className="group relative flex flex-1 items-end justify-center">
              <span className="absolute -top-1 hidden -translate-y-full rounded bg-slate-900 px-1.5 py-1 text-[9px] text-white group-hover:block">
                {value}%
              </span>
              <div
                className={`w-full max-w-7 rounded-t-md transition-all ${
                  index === 4
                    ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                    : "bg-indigo-100 hover:bg-indigo-200"
                }`}
                style={{ height: `${value}%` }}
              />
            </div>
            <span
              className={`mt-2 text-center text-[9px] font-medium ${
                index === 4 ? "text-indigo-600" : "text-slate-400"
              }`}
            >
              {days[index]}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <Sidebar mobileOpen={mobileOpen} close={() => setMobileOpen(false)} />

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir menú"
              className="rounded-xl border border-slate-200 p-2.5 text-slate-600 lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <div className="relative hidden sm:block">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                aria-label="Buscar pacientes"
                placeholder="Buscar paciente, historia o documento..."
                className="h-10 w-72 rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-50 md:w-80"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 sm:flex">
              <UserPlus size={16} />
              Nuevo paciente
            </button>
            <button
              aria-label="Notificaciones"
              className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-500 shadow-sm hover:text-indigo-600"
            >
              <Bell size={17} />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-medium text-indigo-600">Panel ejecutivo</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-[28px]">
                Buenos días, Diego
              </h1>
              <p className="mt-2 text-xs text-slate-500">
                Este es el estado del centro para hoy.
              </p>
            </div>
            <button className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
              <CalendarDays size={16} />
              Agendar cita
            </button>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <StatCard key={item.label} item={item} />
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-3">
            <Appointments />
            <OccupancyChart />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-indigo-200/60">
              <div className="flex items-start justify-between">
                <div className="grid size-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <Sparkles size={19} />
                </div>
                <span className="rounded-full bg-white/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider">
                  Asistente clínico
                </span>
              </div>
              <h2 className="mt-5 text-lg font-bold">Cerebro Clínico</h2>
              <p className="mt-2 max-w-sm text-[11px] leading-5 text-indigo-100">
                Consulta información clínica autorizada y prepara borradores bajo
                supervisión profesional.
              </p>
              <button className="mt-5 flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-indigo-700 transition hover:bg-indigo-50">
                Iniciar consulta <ChevronRight size={14} />
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Alertas clínicas</h2>
                  <p className="mt-1 text-[11px] text-slate-500">Requieren seguimiento</p>
                </div>
                <span className="grid size-7 place-items-center rounded-full bg-rose-50 text-[10px] font-bold text-rose-600">
                  6
                </span>
              </div>
              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-rose-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      3 pacientes con riesgo de abandono
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      Más de 30 días sin asistir
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      2 reevaluaciones pendientes
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">Vencen esta semana</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="mt-1 size-2 shrink-0 rounded-full bg-indigo-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      1 plan terapéutico por actualizar
                    </p>
                    <p className="mt-1 text-[10px] text-slate-400">Asignado a Psicología</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 lg:col-span-2 xl:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Flujo del centro</h2>
                  <p className="mt-1 text-[11px] text-slate-500">Actualizado en tiempo real</p>
                </div>
                <Activity size={17} className="text-emerald-500" />
              </div>
              <div className="mt-5 grid grid-cols-3 divide-x divide-slate-100 rounded-xl bg-slate-50 py-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">7</p>
                  <p className="mt-1 text-[9px] font-medium text-slate-400">En espera</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">5</p>
                  <p className="mt-1 text-[9px] font-medium text-slate-400">En consulta</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-slate-900">12m</p>
                  <p className="mt-1 text-[9px] font-medium text-slate-400">Espera media</p>
                </div>
              </div>
              <button className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-200 py-2.5 text-[11px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-600">
                Abrir panel operativo <ChevronRight size={13} />
              </button>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
