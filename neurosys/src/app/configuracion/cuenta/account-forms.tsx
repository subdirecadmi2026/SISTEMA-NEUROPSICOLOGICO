"use client";

import { KeyRound, Save, UserRound } from "lucide-react";
import { FormEvent, useState, useTransition } from "react";
import {
  updateAccountPassword,
  updateProfileName,
} from "./actions";

type Notice = { ok: boolean; message: string } | null;

function Feedback({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role={notice.ok ? "status" : "alert"}
      className={`text-[11px] font-medium ${
        notice.ok ? "text-emerald-700" : "text-rose-600"
      }`}
    >
      {notice.message}
    </p>
  );
}

export function AccountForms({
  initialName,
  email,
  demo,
}: {
  initialName: string;
  email: string;
  demo: boolean;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = String(new FormData(event.currentTarget).get("fullName"));
    startTransition(async () => {
      const result = await updateProfileName(fullName);
      setProfileNotice(result);
      if (result.ok) setDisplayName(fullName.trim());
    });
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await updateAccountPassword(
        String(data.get("password")),
        String(data.get("confirmation")),
      );
      setPasswordNotice(result);
      if (result.ok) form.reset();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <UserRound size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Perfil personal</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Así te verá el equipo: {displayName}
            </p>
          </div>
        </div>
        <form onSubmit={submitProfile} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Nombre completo
            </span>
            <input
              name="fullName"
              required
              minLength={2}
              maxLength={160}
              defaultValue={initialName}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Correo electrónico
            </span>
            <input
              value={email}
              disabled
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs text-slate-500"
            />
          </label>
          <Feedback notice={profileNotice} />
          <button
            disabled={isPending}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-100 disabled:opacity-50"
          >
            <Save size={15} />
            Guardar perfil
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Contraseña</h2>
            <p className="mt-1 text-[11px] text-slate-500">
              Protege tu cuenta con una clave robusta.
            </p>
          </div>
        </div>
        <form onSubmit={submitPassword} className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Nueva contraseña
            </span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              Confirmar contraseña
            </span>
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="h-11 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50"
            />
          </label>
          <p className="text-[10px] leading-5 text-slate-400">
            Mínimo 8 caracteres, con letras y números.
          </p>
          <Feedback notice={passwordNotice} />
          <button
            disabled={isPending}
            className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-bold text-indigo-700 disabled:opacity-50"
          >
            Actualizar contraseña
          </button>
        </form>
      </section>

      {demo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[11px] leading-5 text-amber-800 lg:col-span-2">
          Modo demostrativo: puedes interactuar con los formularios y ver sus
          estados; los cambios no se envían a un servidor.
        </div>
      )}
    </div>
  );
}
