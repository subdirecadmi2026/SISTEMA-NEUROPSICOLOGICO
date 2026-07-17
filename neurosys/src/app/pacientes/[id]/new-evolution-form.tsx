"use client";

import { Check, Plus, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClinicalNote } from "./actions";

export function NewEvolutionForm({ patientId }: { patientId: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFeedback("");
    const result = await createClinicalNote(new FormData(event.currentTarget));
    setSubmitting(false);
    setFeedback(result.message);
    if (result.ok) setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-200"
      >
        <Plus size={15} /> Nueva evolución
      </button>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm">
          <button
            aria-label="Cerrar formulario"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <section className="relative my-6 w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Nueva evolución clínica
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  El registro se firmará y quedará inmutable en el expediente.
                </p>
              </div>
              <button
                aria-label="Cerrar"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <form className="grid gap-4 p-6 sm:grid-cols-2" onSubmit={handleSubmit}>
              <input type="hidden" name="patientId" value={patientId} />
              <label className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Tipo de registro
                </span>
                <select
                  name="noteType"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none focus:border-indigo-400"
                >
                  <option value="evolution">Evolución</option>
                  <option value="initial">Valoración inicial</option>
                  <option value="evaluation">Evaluación</option>
                  <option value="discharge">Alta clínica</option>
                  <option value="other">Otro registro</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-600">
                  Título
                </span>
                <input
                  name="title"
                  required
                  maxLength={160}
                  placeholder="Ej. Sesión de neurorehabilitación"
                  className="h-11 w-full rounded-xl border border-slate-200 px-3.5 text-xs outline-none focus:border-indigo-400"
                />
              </label>
              {[
                [
                  "Subjetivo",
                  "subjective",
                  "Lo referido por el paciente o su representante...",
                ],
                [
                  "Objetivo",
                  "objective",
                  "Hallazgos observables, pruebas o desempeño...",
                ],
                [
                  "Valoración clínica *",
                  "assessment",
                  "Interpretación profesional y evolución observada...",
                ],
                ["Plan", "plan", "Objetivos, indicaciones y próximos pasos..."],
              ].map(([label, name, placeholder]) => (
                <label key={name} className="space-y-2">
                  <span className="text-[11px] font-semibold text-slate-600">
                    {label}
                  </span>
                  <textarea
                    name={name}
                    required={name === "assessment"}
                    maxLength={8000}
                    rows={4}
                    placeholder={placeholder}
                    className="w-full resize-none rounded-xl border border-slate-200 p-3.5 text-xs outline-none focus:border-indigo-400"
                  />
                </label>
              ))}
              {feedback && (
                <p
                  role="status"
                  className="rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800 sm:col-span-2"
                >
                  {feedback}
                </p>
              )}
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  <Check size={15} />
                  {submitting ? "Firmando..." : "Firmar evolución"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
