"use client";

import {
  ChevronRight,
  Filter,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { patients } from "@/lib/demo-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createPatient, listPatients } from "./actions";

const statusStyles = {
  Activo: "bg-emerald-50 text-emerald-700 ring-emerald-600/10",
  Seguimiento: "bg-amber-50 text-amber-700 ring-amber-600/10",
  Evaluación: "bg-violet-50 text-violet-700 ring-violet-600/10",
  Alta: "bg-sky-50 text-sky-700 ring-sky-600/10",
  Inactivo: "bg-slate-100 text-slate-600 ring-slate-500/10",
};

function RegistrationModal({
  open,
  close,
}: {
  open: boolean;
  close: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    const result = await createPatient(new FormData(event.currentTarget));
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
      <section className="relative my-6 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Nuevo paciente</h2>
            <p className="mt-1 text-xs text-slate-500">
              Registra los datos básicos para crear el expediente.
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
          {[
            ["Nombres", "Ej. Mateo Alejandro", "firstNames", "text", true],
            ["Apellidos", "Ej. Guerrero López", "lastNames", "text", true],
            ["Documento de identidad", "Cédula o pasaporte", "documentNumber", "text", false],
            ["Fecha de nacimiento", "", "birthDate", "date", true],
            ["Teléfono", "+593", "phone", "tel", false],
            ["Correo electrónico", "paciente@correo.com", "email", "email", false],
          ].map(([label, placeholder, name, type, required]) => (
            <label key={label as string} className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-600">{label}</span>
              <input
                name={name as string}
                type={type as string}
                required={required as boolean}
                placeholder={placeholder as string}
                className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </label>
          ))}
          <label className="space-y-2 sm:col-span-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Motivo inicial de consulta
            </span>
            <textarea
              name="referralReason"
              rows={3}
              placeholder="Describe brevemente el motivo de atención..."
              className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
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
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Crear expediente"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function PatientsContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(searchParams.get("nuevo") === "1");
  const [patientRecords, setPatientRecords] = useState(patients);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void listPatients().then((records) => {
      if (records) setPatientRecords(records);
    });
  }, [modalOpen]);

  const filteredPatients = useMemo(
    () =>
      patientRecords.filter((patient) =>
        `${patient.name} ${patient.document} ${patient.diagnosis}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [patientRecords, query],
  );

  return (
    <>
      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-9">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium text-indigo-600">Gestión clínica</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
              Pacientes
            </h1>
            <p className="mt-2 text-xs text-slate-500">
              Consulta y administra los expedientes del centro.
            </p>
            <span
              className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold ${
                isSupabaseConfigured
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {isSupabaseConfigured ? "Datos conectados" : "Modo demostrativo"}
            </span>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex w-fit items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200"
          >
            <UserPlus size={16} />
            Nuevo paciente
          </button>
        </div>

        <div className="mt-7 grid gap-4 sm:grid-cols-3">
          {[
            ["Pacientes registrados", isSupabaseConfigured ? String(patientRecords.length) : "1.486", "text-indigo-600"],
            ["En atención activa", "1.248", "text-emerald-600"],
            ["Nuevos este mes", "32", "text-violet-600"],
          ].map(([label, value, color]) => (
            <article
              key={label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5"
            >
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-xl bg-slate-50">
                  <Users size={19} className={color} />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-950">{value}</p>
                  <p className="mt-1 text-[10px] text-slate-500">{label}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-md">
              <Search
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nombre, documento o diagnóstico..."
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-xs outline-none focus:border-indigo-300 focus:bg-white"
              />
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600">
                <Filter size={14} /> Estado
              </button>
              <button
                aria-label="Más filtros"
                className="rounded-xl border border-slate-200 p-2.5 text-slate-500"
              >
                <SlidersHorizontal size={15} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left">
              <thead>
                <tr className="bg-slate-50/70 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Paciente</th>
                  <th className="px-4 py-3">Diagnóstico principal</th>
                  <th className="px-4 py-3">Profesional</th>
                  <th className="px-4 py-3">Próxima cita</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => (
                  <tr key={patient.id} className="group hover:bg-slate-50/70">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`grid size-10 place-items-center rounded-full text-[11px] font-bold ${patient.color}`}
                        >
                          {patient.initials}
                        </span>
                        <div>
                          <Link
                            href={`/pacientes/${patient.id}`}
                            className="text-xs font-bold text-slate-800 hover:text-indigo-600"
                          >
                            {patient.name}
                          </Link>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {patient.recordNumber} · {patient.age} años
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-4 text-xs text-slate-600">
                      <p className="truncate">{patient.diagnosis}</p>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {patient.professional}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-xs font-semibold text-slate-700">
                        {patient.nextVisit}
                      </p>
                      <p className="mt-1 text-[10px] text-slate-400">
                        Última: {patient.lastVisit}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1.5 text-[10px] font-bold ring-1 ring-inset ${
                          statusStyles[patient.status]
                        }`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        aria-label={`Abrir expediente de ${patient.name}`}
                        href={`/pacientes/${patient.id}`}
                        className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredPatients.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm font-semibold text-slate-700">
                No encontramos pacientes
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Prueba con otro nombre o documento.
              </p>
            </div>
          )}
        </section>
      </main>
      <RegistrationModal open={modalOpen} close={() => setModalOpen(false)} />
    </>
  );
}

export default function PatientsPage() {
  return (
    <Suspense>
      <PatientsContent />
    </Suspense>
  );
}
