"use client";

import { BrainCircuit, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signIn } from "./actions";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => {
    const callbackError = searchParams.get("error");
    if (callbackError === "enlace_expirado") {
      return "El enlace expiró o ya fue utilizado. Solicita uno nuevo.";
    }
    if (callbackError === "enlace_invalido") {
      return "El enlace de acceso no es válido.";
    }
    return "";
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    const result = await signIn(formData);
    if (!result.ok) {
      setError(result.message);
      setLoading(false);
      return;
    }

    router.replace(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-28 -top-28 size-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-40 -left-32 size-[500px] rounded-full border border-white/10" />
        <div className="relative flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <BrainCircuit size={25} />
          </div>
          <div>
            <p className="text-lg font-bold">NeuroSys</p>
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-indigo-200">
              Clinical ERP
            </p>
          </div>
        </div>
        <div className="relative max-w-lg">
          <p className="text-4xl font-bold leading-tight">
            La historia clínica que conecta a todo tu equipo.
          </p>
          <p className="mt-5 max-w-md text-sm leading-7 text-indigo-100">
            Gestión clínica, seguimiento terapéutico y operación del centro en
            un entorno seguro y auditable.
          </p>
        </div>
        <p className="relative text-[10px] text-indigo-200">
          Centro Neuroterapéutico Integral Ñampi Wasi
        </p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <BrainCircuit size={22} />
            </div>
            <p className="text-lg font-bold text-slate-900">NeuroSys</p>
          </div>
          <p className="text-xs font-semibold text-indigo-600">Acceso seguro</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Inicia sesión
          </h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Ingresa con la cuenta asignada por el administrador del centro.
          </p>

          {!isSupabaseConfigured && (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
              El sistema está en modo demostrativo. Configura las variables de
              Supabase para activar el acceso real.
            </div>
          )}

          <form method="post" onSubmit={handleSubmit} className="mt-7 space-y-4">
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold text-slate-600">
                Correo electrónico
              </span>
              <span className="relative block">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="profesional@centro.com"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
              </span>
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] font-semibold text-slate-600">
                Contraseña
              </span>
              <span className="relative block">
                <LockKeyhole
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </span>
            </label>
            <div className="text-right">
              <Link
                href="/recuperar-contrasena"
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            {error && (
              <p role="alert" className="text-[10px] font-medium text-rose-600">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Ingresar al sistema"}
            </button>
          </form>
          <p className="mt-6 text-center text-[10px] text-slate-400">
            El acceso y las acciones clínicas quedan registrados.
          </p>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
