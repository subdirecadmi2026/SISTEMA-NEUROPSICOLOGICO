"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatDateTime } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";
import type { IncidentSeverity, IncidentStatus } from "@/types";

const SEVERITIES: IncidentSeverity[] = ["baja", "media", "alta", "critica"];
const STATUSES: IncidentStatus[] = [
  "abierta",
  "en_curso",
  "resuelta",
  "cerrada",
];

const severityClass: Record<IncidentSeverity, string> = {
  baja: "bg-[var(--sw-leaf)]/30 text-[var(--sw-ink)]",
  media: "bg-amber-100 text-amber-900",
  alta: "bg-[var(--sw-chili)]/15 text-[var(--sw-chili)]",
  critica: "bg-[var(--sw-chili)] text-white",
};

export function IncidenciasPage() {
  const {
    incidents,
    createIncident,
    updateIncidentStatus,
    sucursalId,
    cloudMode,
    syncStatus,
  } = useDemo();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("media");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(
    () => incidents.filter((i) => i.sucursal_id === sucursalId),
    [incidents, sucursalId],
  );

  return (
    <AppShell
      title="Incidencias"
      subtitle="Reporta fallas operativas, demoras o problemas de equipo por sucursal."
    >
      {cloudMode ? (
        <p className="mb-4 text-xs text-[var(--sw-muted)]">
          Modo cloud · {syncStatus ?? "listo"} · requiere SETUP_PART3.sql
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.2fr]">
        <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Nueva incidencia
          </h2>
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              const result = await createIncident({
                title,
                description,
                severity,
              });
              setBusy(false);
              setMessage(result.message);
              if (result.ok) {
                setTitle("");
                setDescription("");
                setSeverity("media");
              }
            }}
          >
            <label className="block text-xs text-[var(--sw-muted)]">
              Título
              <input
                required
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="block text-xs text-[var(--sw-muted)]">
              Descripción
              <textarea
                rows={4}
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="block text-xs text-[var(--sw-muted)]">
              Severidad
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={severity}
                onChange={(e) =>
                  setSeverity(e.target.value as IncidentSeverity)
                }
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy ? "Guardando…" : "Registrar"}
            </button>
            {message ? (
              <p className="text-center text-sm text-[var(--sw-forest)]">
                {message}
              </p>
            ) : null}
          </form>
        </section>

        <section className="space-y-3">
          {visible.length === 0 ? (
            <p className="rounded-3xl border border-dashed border-[var(--sw-line)] bg-white/60 px-6 py-12 text-center text-sm text-[var(--sw-muted)]">
              Sin incidencias en esta sucursal.
            </p>
          ) : (
            visible.map((inc) => (
              <article
                key={inc.id}
                className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-[family-name:var(--font-display)] text-xl">
                      {inc.title}
                    </h3>
                    <p className="mt-1 text-xs text-[var(--sw-muted)]">
                      {formatDateTime(inc.created_at)} · {inc.status}
                    </p>
                  </div>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${severityClass[inc.severity]}`}
                  >
                    {inc.severity}
                  </span>
                </div>
                {inc.description ? (
                  <p className="mt-3 text-sm text-[var(--sw-muted)]">
                    {inc.description}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {STATUSES.map((st) => (
                    <button
                      key={st}
                      type="button"
                      disabled={inc.status === st}
                      onClick={() => void updateIncidentStatus(inc.id, st)}
                      className={`rounded-xl px-3 py-1.5 text-xs ${
                        inc.status === st
                          ? "bg-[var(--sw-forest)] text-white"
                          : "bg-[var(--sw-panel)] text-[var(--sw-ink)]"
                      } disabled:opacity-60`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
