import {
  Activity,
  CalendarDays,
  ChevronRight,
  Clock3,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

const stats = [
  {
    label: "Citas de hoy",
    value: "24",
    detail: "8 pendientes",
    trend: "+12%",
    icon: CalendarDays,
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    label: "Pacientes activos",
    value: "1.248",
    detail: "32 nuevos este mes",
    trend: "+8,4%",
    icon: Users,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Sesiones realizadas",
    value: "386",
    detail: "Este mes",
    trend: "+6,2%",
    icon: Activity,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    label: "Ocupación",
    value: "87%",
    detail: "Promedio semanal",
    trend: "+3,1%",
    icon: Clock3,
    tone: "bg-amber-50 text-amber-600",
  },
];

const appointments = [
  ["08:30", "MG", "Mateo Guerrero", "Evaluación neuropsicológica", "Confirmada"],
  ["09:30", "SA", "Sofía Andrade", "Psicoterapia infantil", "En consulta"],
  ["10:45", "JT", "Julián Torres", "Terapia de lenguaje", "Por confirmar"],
  ["11:30", "VR", "Valentina Ruiz", "Aplicación WAIS", "Confirmada"],
];

const statusStyles: Record<string, string> = {
  Confirmada: "bg-indigo-50 text-indigo-700",
  "En consulta": "bg-emerald-50 text-emerald-700",
  "Por confirmar": "bg-amber-50 text-amber-700",
};

export default function Home() {
  const occupancy = [48, 64, 57, 76, 87, 68, 44];

  return (
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
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <article
              key={item.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30"
            >
              <div className="flex items-start justify-between">
                <div className={`grid size-10 place-items-center rounded-xl ${item.tone}`}>
                  <Icon size={20} />
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
                  {item.trend}
                </span>
              </div>
              <p className="mt-5 text-xs font-medium text-slate-500">{item.label}</p>
              <div className="mt-1 flex items-end justify-between gap-2">
                <p className="text-2xl font-bold tracking-tight text-slate-950">
                  {item.value}
                </p>
                <p className="pb-1 text-[10px] text-slate-400">{item.detail}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30 xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Agenda de hoy</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Miércoles, 15 de julio · 24 citas programadas
              </p>
            </div>
            <Link
              href="/agenda"
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600"
            >
              Ver agenda <ChevronRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {appointments.map(([time, initials, patient, service, status]) => (
              <div
                key={`${time}-${patient}`}
                className="grid grid-cols-[55px_1fr_auto] items-center gap-3 px-4 py-4 hover:bg-slate-50/70 sm:grid-cols-[65px_1fr_1fr_auto] sm:px-6"
              >
                <p className="text-xs font-bold text-slate-900">{time}</p>
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">
                    {initials}
                  </span>
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {patient}
                  </p>
                </div>
                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  {service}
                </p>
                <span
                  className={`whitespace-nowrap rounded-full px-2.5 py-1.5 text-[9px] font-bold sm:text-[10px] ${statusStyles[status]}`}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
          <h2 className="text-sm font-bold text-slate-900">Ocupación semanal</h2>
          <p className="mt-1 text-[11px] text-slate-500">
            Porcentaje de agenda utilizada
          </p>
          <div className="mt-7 flex h-36 items-end justify-between gap-2">
            {occupancy.map((value, index) => (
              <div
                key={index}
                className="flex h-full flex-1 flex-col justify-end"
              >
                <div className="flex flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-7 rounded-t-md ${
                      index === 4
                        ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                        : "bg-indigo-100"
                    }`}
                    style={{ height: `${value}%` }}
                  />
                </div>
                <span className="mt-2 text-center text-[9px] text-slate-400">
                  {["L", "M", "M", "J", "V", "S", "D"][index]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-indigo-200/60">
          <div className="grid size-10 place-items-center rounded-xl bg-white/15">
            <Sparkles size={19} />
          </div>
          <h2 className="mt-5 text-lg font-bold">Cerebro Clínico</h2>
          <p className="mt-2 max-w-lg text-[11px] leading-5 text-indigo-100">
            Consulta información clínica autorizada y prepara borradores bajo
            supervisión profesional.
          </p>
          <button className="mt-5 flex items-center gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs font-bold text-indigo-700">
            Iniciar consulta <ChevronRight size={14} />
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
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
            {[
              ["bg-rose-400", "3 pacientes con riesgo de abandono"],
              ["bg-amber-400", "2 reevaluaciones pendientes"],
              ["bg-indigo-400", "1 plan terapéutico por actualizar"],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`size-2 shrink-0 rounded-full ${color}`} />
                <p className="text-xs font-semibold text-slate-700">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
