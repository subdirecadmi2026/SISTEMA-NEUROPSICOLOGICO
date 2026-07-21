"use client";

import { ArrowLeft, BrainCircuit, Mail } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function isNetworkError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    error instanceof TypeError ||
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("conexión")
  );
}

export default function RecoverPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const supabase = createClient();
    if (!supabase) {
      setError("Supabase aún no está configurado.");
      setLoading(false);
      return;
    }

    const email = String(new FormData(event.currentTarget).get("email"));
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/configuracion/cuenta`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo },
      );
      if (resetError) {
        setError(
          isNetworkError(resetError)
            ? "No pudimos conectarnos. Revisa tu red e inténtalo nuevamente."
            : "No fue posible enviar el enlace. Inténtalo nuevamente en unos minutos.",
        );
      } else {
        setMessage(
          "Si el correo pertenece a una cuenta, recibirás un enlace para crear una nueva contraseña.",
        );
      }
    } catch (requestError) {
      setError(
        isNetworkError(requestError)
          ? "No pudimos conectarnos. Revisa tu red e inténtalo nuevamente."
          : "Ocurrió un error inesperado. Inténtalo nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 p-5">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
        <div className="grid size-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
          <BrainCircuit size={25} />
        </div>
        <p className="mt-6 text-xs font-semibold text-indigo-600">
          Recuperación segura
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Recupera tu contraseña
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Te enviaremos un enlace de un solo uso para verificar tu identidad.
        </p>

        {!isSupabaseConfigured && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] leading-5 text-amber-800">
            El envío está deshabilitado en modo demostrativo.
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
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
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
              />
            </span>
          </label>
          {error && (
            <p role="alert" className="text-[10px] font-medium text-rose-600">
              {error}
            </p>
          )}
          {message && (
            <p
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-[10px] leading-5 text-emerald-800"
            >
              {message}
            </p>
          )}
          <button
            disabled={loading || !isSupabaseConfigured}
            className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Enviando..." : "Enviar enlace de recuperación"}
          </button>
        </form>
        <Link
          href="/login"
          className="mt-6 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-500 hover:text-indigo-600"
        >
          <ArrowLeft size={14} />
          Volver a iniciar sesión
        </Link>
      </section>
    </main>
  );
}
