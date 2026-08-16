"use client";

import {
  Building2,
  CheckCircle2,
  MapPin,
  Palette,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  type CustomizationSettings,
  type EditableCustomization,
  useCustomization,
} from "@/components/customization-provider";

function Field({
  label,
  name,
  value,
  onChange,
  disabled = false,
  maxLength = 80,
  helper,
}: {
  label: string;
  name: keyof EditableCustomization;
  value: string;
  onChange: (name: keyof EditableCustomization, value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  helper?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold text-slate-700">{label}</span>
      <input
        name={name}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        disabled={disabled}
        required
        minLength={2}
        maxLength={maxLength}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
      {helper && <span className="block text-[10px] text-slate-400">{helper}</span>}
    </label>
  );
}

function SettingsForm({
  initialSettings,
}: {
  initialSettings: CustomizationSettings;
}) {
  const { save, connected, canEditOrganization } = useCustomization();
  const [values, setValues] = useState<EditableCustomization>({
    brandName: initialSettings.brandName,
    brandTagline: initialSettings.brandTagline,
    organizationName: initialSettings.organizationName,
    branchName: initialSettings.branchName,
    fullName: initialSettings.fullName,
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function change(name: keyof EditableCustomization, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
    setFeedback(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);

    const normalized = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, value.trim()]),
    ) as EditableCustomization;

    try {
      await save(normalized);
      setValues(normalized);
      setFeedback({
        type: "success",
        message: "La personalización se guardó correctamente.",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "No fue posible guardar los cambios. Inténtalo nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <Palette size={19} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Identidad visual</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Personaliza el nombre que aparece en el menú principal.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre de la plataforma"
              name="brandName"
              value={values.brandName}
              onChange={change}
              disabled={!canEditOrganization}
              maxLength={40}
            />
            <Field
              label="Descripción corta"
              name="brandTagline"
              value={values.brandTagline}
              onChange={change}
              disabled={!canEditOrganization}
              maxLength={40}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Building2 size={19} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Centro y sede</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Estos nombres identifican el espacio clínico activo.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field
              label="Nombre del centro"
              name="organizationName"
              value={values.organizationName}
              onChange={change}
              disabled={!canEditOrganization}
            />
            <Field
              label="Nombre de la sede"
              name="branchName"
              value={values.branchName}
              onChange={change}
              disabled={!canEditOrganization}
            />
          </div>
          {!canEditOrganization && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-[10px] text-amber-800">
              <ShieldCheck size={14} />
              Solo dirección o administración puede editar los datos del centro.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <UserRound size={19} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Perfil personal</h2>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                Actualiza el nombre visible de tu cuenta.
              </p>
            </div>
          </div>
          <div className="mt-5 max-w-md">
            <Field
              label="Nombre completo"
              name="fullName"
              value={values.fullName}
              onChange={change}
              maxLength={120}
              helper={`Rol asignado: ${initialSettings.role}`}
            />
          </div>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Vista previa
          </p>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="truncate text-lg font-bold tracking-tight text-slate-950">
              {values.brandName || "Nombre de plataforma"}
            </p>
            <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.16em] text-indigo-500">
              {values.brandTagline || "Descripción"}
            </p>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <p className="truncate text-xs font-semibold text-slate-800">
                {values.organizationName || "Nombre del centro"}
              </p>
              <p className="mt-1 truncate text-[10px] text-slate-500">
                {values.branchName || "Nombre de la sede"}
              </p>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-400">
            <MapPin size={12} />
            Los cambios se reflejan al guardar.
          </p>
        </section>

        {feedback && (
          <p
            role="status"
            className={`flex items-start gap-2 rounded-xl p-3 text-[10px] ${
              feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {feedback.type === "success" && (
              <CheckCircle2 size={14} className="shrink-0" />
            )}
            {feedback.message}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <p className="text-center text-[9px] leading-4 text-slate-400">
          {connected
            ? "Los cambios se guardan de forma segura en tu organización."
            : "Modo demostrativo: los cambios se guardan en este navegador."}
        </p>
      </aside>
    </form>
  );
}

export default function SettingsPage() {
  const { settings, loading } = useCustomization();

  return (
    <main className="mx-auto max-w-6xl px-4 py-7 sm:px-7 lg:px-9">
      <p className="text-xs font-medium text-indigo-600">Preferencias</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
        Personaliza tu espacio
      </h1>
      <p className="mt-2 text-xs text-slate-500">
        Edita la identidad del sistema, los datos del centro y tu nombre visible.
      </p>

      {loading ? (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="h-80 animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
      ) : (
        <SettingsForm initialSettings={settings} />
      )}
    </main>
  );
}
