import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ClipboardList,
  FileText,
  HeartPulse,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { featuredPatient } from "@/lib/demo-data";

const timeline = [
  {
    date: "14 JUL",
    title: "Sesión de neurorehabilitación",
    detail:
      "Mejor desempeño en tareas de memoria de trabajo. Persisten dificultades en control inhibitorio.",
    author: "Dra. Ana Pérez",
    icon: HeartPulse,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    date: "08 JUL",
    title: "Aplicación de escala Conners",
    detail:
      "Protocolo completado por representante. Resultados pendientes de interpretación profesional.",
    author: "Dra. Ana Pérez",
    icon: ClipboardList,
    tone: "bg-violet-50 text-violet-600",
  },
  {
    date: "02 JUL",
    title: "Informe neuropsicológico emitido",
    detail:
      "Documento revisado, firmado electrónicamente y compartido con el representante autorizado.",
    author: "Sistema · validado por Dra. Ana Pérez",
    icon: FileText,
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    date: "24 JUN",
    title: "Actualización del plan terapéutico",
    detail:
      "Se incorporan objetivos para atención sostenida, memoria de trabajo y regulación emocional.",
    author: "Equipo clínico",
    icon: Target,
    tone: "bg-amber-50 text-amber-600",
  },
];

const goals = [
  { name: "Atención sostenida", progress: 78, color: "bg-indigo-500" },
  { name: "Memoria de trabajo", progress: 64, color: "bg-violet-500" },
  { name: "Control inhibitorio", progress: 48, color: "bg-amber-500" },
  { name: "Regulación emocional", progress: 71, color: "bg-emerald-500" },
];

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = { ...featuredPatient, id };

  return (
    <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 lg:px-9">
      <Link
        href="/pacientes"
        className="mb-5 flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600"
      >
        <ChevronLeft size={15} /> Volver a pacientes
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 sm:h-28" />
        <div className="px-5 pb-5 sm:px-7">
          <div className="-mt-10 flex flex-col justify-between gap-4 sm:-mt-9 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              <div className="grid size-20 shrink-0 place-items-center rounded-2xl border-4 border-white bg-indigo-100 text-xl font-bold text-indigo-700 shadow-md">
                {patient.initials}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-950">
                    {patient.name}
                  </h1>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                    Paciente activo
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {patient.id} · {patient.age} años · {patient.document}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-600">
                <MessageCircle size={15} /> Contactar
              </button>
              <button className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200">
                <Plus size={15} /> Nueva evolución
              </button>
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-4 sm:px-6">
          {[
            "Resumen",
            "Línea de tiempo",
            "Historia clínica",
            "Evaluaciones",
            "Tratamiento",
            "Documentos",
          ].map((tab, index) => (
            <button
              key={tab}
              className={`whitespace-nowrap border-b-2 px-3 py-3.5 text-[11px] font-semibold ${
                index === 0
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [Activity, "IPN actual", "72 / 100", "Favorable", "text-indigo-600"],
              [CalendarDays, "Asistencia", "94%", "23 de 25 sesiones", "text-emerald-600"],
              [Target, "Objetivos", "4 activos", "1 cumplido", "text-violet-600"],
              [Stethoscope, "Última atención", "14 jul", "Neurorehabilitación", "text-amber-600"],
            ].map(([Icon, label, value, detail, color]) => {
              const MetricIcon = Icon as typeof Activity;
              return (
                <article
                  key={label as string}
                  className="rounded-2xl border border-slate-200/80 bg-white p-4"
                >
                  <MetricIcon size={17} className={color as string} />
                  <p className="mt-4 text-[10px] font-medium text-slate-400">
                    {label as string}
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {value as string}
                  </p>
                  <p className="mt-1 text-[9px] text-slate-400">
                    {detail as string}
                  </p>
                </article>
              );
            })}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Resumen clínico
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Información esencial del expediente
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-bold text-indigo-600">
                <ShieldCheck size={11} /> Acceso clínico
              </span>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Diagnóstico principal
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {patient.diagnosis}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Profesional responsable
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {patient.professional}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Medicación registrada
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {patient.medications}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Alergias
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-700">
                  {patient.allergies}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Evolución de objetivos
                </h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Progreso registrado por el equipo tratante
                </p>
              </div>
              <button className="text-[10px] font-bold text-indigo-600">
                Ver plan
              </button>
            </div>
            <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {goals.map((goal) => (
                <div key={goal.name}>
                  <div className="flex justify-between text-[10px]">
                    <span className="font-semibold text-slate-600">{goal.name}</span>
                    <span className="font-bold text-slate-800">{goal.progress}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${goal.color}`}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Línea de tiempo</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Actividad clínica reciente
              </p>
            </div>
            <div className="mt-6 space-y-6">
              {timeline.map((event, index) => {
                const Icon = event.icon;
                return (
                  <div key={event.title} className="flex gap-4">
                    <div className="w-11 shrink-0 pt-1 text-center text-[9px] font-bold text-slate-400">
                      {event.date}
                    </div>
                    <div className="relative">
                      {index < timeline.length - 1 && (
                        <span className="absolute left-4 top-8 h-[calc(100%+24px)] w-px bg-slate-200" />
                      )}
                      <span
                        className={`relative grid size-8 place-items-center rounded-full ${event.tone}`}
                      >
                        <Icon size={14} />
                      </span>
                    </div>
                    <div className="pb-1">
                      <p className="text-xs font-bold text-slate-800">
                        {event.title}
                      </p>
                      <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-500">
                        {event.detail}
                      </p>
                      <p className="mt-2 text-[9px] font-medium text-slate-400">
                        {event.author}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 text-white shadow-lg shadow-indigo-200">
            <div className="flex items-center gap-2">
              <Sparkles size={17} />
              <h2 className="text-sm font-bold">Memoria Clínica</h2>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-indigo-100">
              Prepara una síntesis autorizada de este expediente para revisión
              profesional.
            </p>
            <button className="mt-4 w-full rounded-xl bg-white py-2.5 text-[10px] font-bold text-indigo-700">
              Consultar expediente
            </button>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle size={16} />
              <h2 className="text-xs font-bold">Alerta de seguimiento</h2>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-amber-800/70">
              La reevaluación de funciones ejecutivas debe programarse durante
              las próximas dos semanas.
            </p>
            <button className="mt-3 text-[10px] font-bold text-amber-800">
              Programar ahora
            </button>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">
              Datos del paciente
            </h2>
            <div className="mt-5 space-y-4">
              {[
                [UserRound, "Representante", patient.guardian],
                [Phone, "Teléfono", patient.phone],
                [Mail, "Correo", patient.email],
                [ShieldCheck, "Cobertura", patient.insurance],
              ].map(([Icon, label, value]) => {
                const DetailIcon = Icon as typeof UserRound;
                return (
                  <div key={label as string} className="flex gap-3">
                    <DetailIcon size={15} className="mt-0.5 shrink-0 text-slate-400" />
                    <div>
                      <p className="text-[9px] font-medium text-slate-400">
                        {label as string}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold text-slate-700">
                        {value as string}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Próxima cita</h2>
              <CheckCircle2 size={16} className="text-emerald-500" />
            </div>
            <p className="mt-4 text-xs font-bold text-slate-800">
              Viernes, 17 de julio
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              09:00 · Neurorehabilitación
            </p>
            <button className="mt-4 w-full rounded-xl border border-slate-200 py-2.5 text-[10px] font-bold text-slate-600">
              Ver en agenda
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}
