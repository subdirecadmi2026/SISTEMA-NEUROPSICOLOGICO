import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Construction,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

const modules: Record<string, { title: string; description: string; next: string[] }> = {
  agenda: {
    title: "Agenda inteligente",
    description:
      "Organización de citas por profesional, consultorio y especialidad.",
    next: ["Calendario semanal", "Confirmaciones", "Lista de espera"],
  },
  "historia-clinica": {
    title: "Historia clínica",
    description:
      "Expedientes estructurados, evoluciones, diagnósticos y auditoría.",
    next: ["Plantillas clínicas", "Evoluciones", "Firmas"],
  },
  evaluaciones: {
    title: "Evaluaciones",
    description:
      "Gestión del proceso neuropsicológico y sus resultados autorizados.",
    next: ["Protocolos", "Puntuaciones", "Interpretación"],
  },
  terapias: {
    title: "Terapias",
    description:
      "Planes terapéuticos, objetivos, actividades y seguimiento del progreso.",
    next: ["Planes activos", "Sesiones", "Objetivos"],
  },
  informes: {
    title: "Informes",
    description:
      "Creación, revisión profesional, firma y entrega de documentos clínicos.",
    next: ["Plantillas", "Borradores", "Documentos emitidos"],
  },
  comunicaciones: {
    title: "Centro de comunicaciones",
    description:
      "Recordatorios y conversaciones autorizadas por WhatsApp y correo.",
    next: ["Bandeja", "Automatizaciones", "Plantillas"],
  },
  facturacion: {
    title: "Caja y facturación",
    description:
      "Control de cobros, comprobantes, cierres y estados de cuenta.",
    next: ["Caja diaria", "Facturas", "Cuentas pendientes"],
  },
};

export default async function ModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module: moduleSlug } = await params;
  const module = modules[moduleSlug];
  if (!module) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-7 lg:px-9">
      <p className="text-xs font-medium text-indigo-600">Módulo NeuroSys</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        {module.title}
      </h1>
      <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
        {module.description}
      </p>

      <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white">
          <Construction size={24} />
          <h2 className="mt-4 text-lg font-bold">Próxima etapa funcional</h2>
          <p className="mt-2 max-w-xl text-xs leading-5 text-indigo-100">
            La navegación ya está preparada. Este módulo se conectará al núcleo
            clínico y a los permisos del sistema en una siguiente iteración.
          </p>
        </div>
        <div className="grid gap-4 p-6 sm:grid-cols-3">
          {module.next.map((item, index) => (
            <article key={item} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                {index === 0 ? (
                  <CalendarDays size={17} className="text-indigo-500" />
                ) : (
                  <Clock3 size={17} className="text-slate-400" />
                )}
                {index === 0 && (
                  <CheckCircle2 size={14} className="text-emerald-500" />
                )}
              </div>
              <p className="mt-4 text-xs font-bold text-slate-700">{item}</p>
              <p className="mt-1 text-[10px] text-slate-400">
                Estructura planificada
              </p>
            </article>
          ))}
        </div>
      </section>
      <Link
        href="/"
        className="mt-5 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600"
      >
        Volver al dashboard
      </Link>
    </main>
  );
}
