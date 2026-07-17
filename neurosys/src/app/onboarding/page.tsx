"use client";

import { BrainCircuit, Building2, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const supabase = createClient();
    if (!supabase) {
      setError("Supabase no está configurado.");
      setLoading(false);
      return;
    }

    const { error: bootstrapError } = await supabase.rpc(
      "bootstrap_organization",
      {
        organization_name: String(formData.get("organizationName")),
        branch_name: String(formData.get("branchName")),
      },
    );

    if (bootstrapError) {
      setError(
        bootstrapError.message.includes("already belongs")
          ? "Esta cuenta ya pertenece a una organización."
          : "No fue posible crear el espacio de trabajo.",
      );
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
        <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
          <BrainCircuit size={25} />
        </div>
        <p className="mt-6 text-xs font-semibold text-indigo-600">
          Configuración inicial
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Crea tu espacio clínico
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Esta información establece la organización y su primera sede. Tu
          cuenta quedará registrada como administradora.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Nombre del centro
            </span>
            <span className="relative block">
              <Building2
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                name="organizationName"
                required
                minLength={2}
                defaultValue="Centro Ñampi Wasi"
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </span>
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Primera sede
            </span>
            <span className="relative block">
              <MapPin
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                name="branchName"
                required
                minLength={2}
                defaultValue="Sede principal"
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </span>
          </label>
          {error && (
            <p role="alert" className="text-[10px] font-medium text-rose-600">
              {error}
            </p>
          )}
          <button
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {loading ? "Configurando..." : "Crear espacio de trabajo"}
          </button>
        </form>
      </section>
    </main>
  );
}
