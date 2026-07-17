import { ChevronRight, ClipboardList, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { patients as demoPatients } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listPatients } from "../pacientes/actions";

export default async function ClinicalHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const storedPatients = await listPatients();
  const patients = storedPatients ?? demoPatients;
  const normalizedQuery = q.trim().toLocaleLowerCase("es");
  const filteredPatients = normalizedQuery
    ? patients.filter((patient) =>
        `${patient.name} ${patient.recordNumber} ${patient.document} ${patient.diagnosis}`
          .toLocaleLowerCase("es")
          .includes(normalizedQuery),
      )
    : patients;

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-7 lg:px-9">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium text-indigo-600">Núcleo clínico</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Historia clínica
          </h1>
          <p className="mt-2 text-xs text-slate-500">
            Consulta expedientes y registra evoluciones clínicas firmadas.
          </p>
        </div>
        <span className="flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
          <ShieldCheck size={13} />
          {isSupabaseConfigured ? "Acceso protegido por rol" : "Modo demostrativo"}
        </span>
      </div>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <form className="relative max-w-md">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              name="q"
              defaultValue={q}
              aria-label="Buscar expedientes"
              placeholder="Buscar por paciente, expediente o diagnóstico..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none"
            />
          </form>
        </div>
        <div className="divide-y divide-slate-100">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              href={`/pacientes/${patient.id}`}
              className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
            >
              <span className={`grid size-10 place-items-center rounded-full text-[11px] font-bold ${patient.color}`}>
                {patient.initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-slate-800">
                  {patient.name}
                </p>
                <p className="mt-1 truncate text-[10px] text-slate-400">
                  {patient.recordNumber} · {patient.diagnosis}
                </p>
              </div>
              <span className="hidden rounded-full bg-indigo-50 px-2.5 py-1 text-[9px] font-bold text-indigo-600 sm:inline">
                {patient.status}
              </span>
              <ChevronRight size={16} className="text-slate-400" />
            </Link>
          ))}
          {filteredPatients.length === 0 && (
            <div className="p-12 text-center">
              <ClipboardList className="mx-auto text-slate-300" size={26} />
              <p className="mt-3 text-sm font-semibold text-slate-700">
                No encontramos expedientes
              </p>
              <Link
                href="/pacientes?nuevo=1"
                className="mt-3 inline-flex text-xs font-bold text-indigo-600"
              >
                Crear el primer paciente
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
