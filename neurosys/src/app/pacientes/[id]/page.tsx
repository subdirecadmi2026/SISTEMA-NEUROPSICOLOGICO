import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { featuredPatient } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getPatientById, type PatientDetail } from "../actions";
import { listClinicalNotes, type ClinicalNote } from "./actions";
import { NewEvolutionForm } from "./new-evolution-form";

const demoNotes: ClinicalNote[] = [
  {
    id: "demo-evolution",
    noteType: "evolution",
    title: "Sesión de neurorehabilitación",
    subjective: "La familia refiere mayor autonomía en las tareas escolares.",
    objective: "Mejor desempeño en tareas de memoria de trabajo.",
    assessment:
      "Se observa progreso sostenido. Persisten dificultades leves en control inhibitorio.",
    plan: "Continuar intervención semanal y reevaluar funciones ejecutivas.",
    occurredAt: "2026-07-14T14:00:00-05:00",
    signedAt: "2026-07-14T14:45:00-05:00",
    author: "Dra. Ana Pérez",
  },
];

function demoPatient(id: string): PatientDetail {
  return {
    id,
    recordNumber: featuredPatient.recordNumber,
    initials: featuredPatient.initials,
    name: featuredPatient.name,
    document: featuredPatient.document,
    birthDate: "2017-03-18",
    age: featuredPatient.age,
    diagnosis: featuredPatient.diagnosis,
    referralReason: "Evaluación y acompañamiento de funciones ejecutivas.",
    status: "active",
    phone: featuredPatient.phone,
    email: featuredPatient.email,
    address: "Quito, Ecuador",
    guardian: featuredPatient.guardian,
    guardianPhone: featuredPatient.phone,
    insurance: featuredPatient.insurance,
    allergies: featuredPatient.allergies,
    medications: featuredPatient.medications,
  };
}

const noteTypeLabels: Record<string, string> = {
  initial: "Valoración inicial",
  evolution: "Evolución",
  evaluation: "Evaluación",
  discharge: "Alta clínica",
  other: "Registro clínico",
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [storedPatient, storedNotes] = await Promise.all([
    getPatientById(id),
    listClinicalNotes(id),
  ]);

  if (isSupabaseConfigured && !storedPatient) notFound();
  const patient = storedPatient ?? demoPatient(id);
  const notes = storedNotes ?? demoNotes;

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-7 lg:px-9">
      <Link
        href="/pacientes"
        className="mb-5 flex w-fit items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600"
      >
        <ChevronLeft size={15} /> Volver a pacientes
      </Link>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600" />
        <div className="px-5 pb-5 sm:px-7">
          <div className="-mt-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="flex items-end gap-4">
              <div className="grid size-20 shrink-0 place-items-center rounded-2xl border-4 border-white bg-indigo-100 text-xl font-bold text-indigo-700 shadow-md">
                {patient.initials}
              </div>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-950">{patient.name}</h1>
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                    {patient.status === "active" ? "Paciente activo" : "En seguimiento"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {patient.recordNumber} · {patient.age} años · {patient.document}
                </p>
              </div>
            </div>
            <NewEvolutionForm patientId={patient.id} />
          </div>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-3">
            {[
              [FileText, "Evoluciones firmadas", String(notes.length), "text-indigo-600"],
              [CalendarDays, "Edad", `${patient.age} años`, "text-violet-600"],
              [HeartPulse, "Estado", patient.status === "active" ? "Activo" : "Seguimiento", "text-emerald-600"],
            ].map(([Icon, label, value, color]) => {
              const MetricIcon = Icon as typeof FileText;
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
                </article>
              );
            })}
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Resumen clínico</h2>
                <p className="mt-1 text-[11px] text-slate-500">
                  Información vigente del expediente
                </p>
              </div>
              <span className="flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-bold text-indigo-600">
                <ShieldCheck size={11} /> Acceso clínico
              </span>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              {[
                ["Diagnóstico principal", patient.diagnosis],
                ["Motivo de consulta", patient.referralReason],
                ["Medicación registrada", patient.medications],
                ["Alergias", patient.allergies],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {label}
                  </p>
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-700">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Historia clínica</h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Evoluciones firmadas en orden cronológico
              </p>
            </div>
            {notes.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-8 text-center">
                <ClipboardList className="mx-auto text-slate-300" size={24} />
                <p className="mt-3 text-xs font-semibold text-slate-600">
                  Aún no hay evoluciones
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Registra la primera atención clínica de este paciente.
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {notes.map((note) => (
                  <article
                    key={note.id}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600">
                          {noteTypeLabels[note.noteType] ?? "Registro clínico"}
                        </span>
                        <h3 className="mt-1 text-xs font-bold text-slate-800">
                          {note.title}
                        </h3>
                      </div>
                      <time className="text-[9px] font-medium text-slate-400">
                        {new Intl.DateTimeFormat("es-EC", {
                          dateStyle: "medium",
                          timeStyle: "short",
                          timeZone: "America/Guayaquil",
                        }).format(new Date(note.occurredAt))}
                      </time>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {[
                        ["Subjetivo", note.subjective],
                        ["Objetivo", note.objective],
                        ["Valoración", note.assessment],
                        ["Plan", note.plan],
                      ]
                        .filter(([, value]) => value)
                        .map(([label, value]) => (
                          <div key={label as string}>
                            <p className="text-[9px] font-bold uppercase text-slate-400">
                              {label as string}
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                              {value as string}
                            </p>
                          </div>
                        ))}
                    </div>
                    <p className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[9px] font-medium text-slate-400">
                      <ShieldCheck size={11} className="text-emerald-500" />
                      Firmado por {note.author}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5">
            <h2 className="text-sm font-bold text-slate-900">Datos del paciente</h2>
            <div className="mt-5 space-y-4">
              {[
                [UserRound, "Representante", patient.guardian],
                [Phone, "Teléfono", patient.phone],
                [Mail, "Correo", patient.email],
                [MapPin, "Dirección", patient.address],
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
                      <p className="mt-1 break-all text-[10px] font-semibold text-slate-700">
                        {value as string}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle size={16} />
              <h2 className="text-xs font-bold">Confidencialidad clínica</h2>
            </div>
            <p className="mt-2 text-[10px] leading-5 text-amber-800/70">
              Las evoluciones firmadas son inmutables y cada operación queda
              registrada en la auditoría institucional.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
