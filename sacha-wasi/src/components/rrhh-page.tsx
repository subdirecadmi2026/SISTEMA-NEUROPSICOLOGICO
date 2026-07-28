"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { formatDateTime } from "@/lib/currency";
import { ROLE_LABELS } from "@/lib/roles";
import { useDemo } from "@/lib/demo-store";
import type { Role, ShiftType } from "@/types";

export function RrhhPage() {
  const {
    users,
    shifts,
    attendance,
    sucursalId,
    clockIn,
    clockOut,
    addShift,
    user,
  } = useDemo();
  const [message, setMessage] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState(users[2]?.id ?? "");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("16:00");
  const [tipo, setTipo] = useState<ShiftType>("apertura");
  const [role, setRole] = useState<Role>("caja");

  const staff = useMemo(
    () => users.filter((u) => u.role !== "admin"),
    [users],
  );

  const localShifts = shifts.filter((s) => s.sucursal_id === sucursalId);
  const localAttendance = attendance.filter((a) => a.sucursal_id === sucursalId);

  return (
    <AppShell
      title="RRHH y turnos"
      subtitle="Planificación de turnos y fichaje de entrada/salida por sucursal."
    >
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-[var(--sw-forest)] px-4 py-2 text-sm text-white"
          onClick={() => setMessage(clockIn().message)}
        >
          Fichar mi entrada
        </button>
        <button
          type="button"
          className="rounded-xl border border-[var(--sw-line)] bg-white px-4 py-2 text-sm"
          onClick={() => setMessage(clockOut().message)}
        >
          Fichar mi salida
        </button>
        {message ? (
          <span className="self-center text-sm text-[var(--sw-forest)]">
            {message}
          </span>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {(user?.role === "admin" || user?.role === "supervisor") && (
          <form
            className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5"
            onSubmit={(e) => {
              e.preventDefault();
              const result = addShift({
                employee_id: employeeId,
                date,
                start,
                end,
                tipo,
                role,
              });
              setMessage(result.message);
            }}
          >
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Programar turno
            </h2>
            <label className="mt-4 block text-xs text-[var(--sw-muted)]">
              Empleado
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                {staff.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} · {ROLE_LABELS[u.role]}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-xs text-[var(--sw-muted)]">
                Fecha
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="text-xs text-[var(--sw-muted)]">
                Tipo
                <select
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as ShiftType)}
                >
                  <option value="apertura">Apertura</option>
                  <option value="intermedio">Intermedio</option>
                  <option value="cierre">Cierre</option>
                </select>
              </label>
              <label className="text-xs text-[var(--sw-muted)]">
                Inicio
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="text-xs text-[var(--sw-muted)]">
                Fin
                <input
                  type="time"
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            <label className="mt-3 block text-xs text-[var(--sw-muted)]">
              Rol del turno
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {(["caja", "cocina", "inventario", "supervisor"] as Role[]).map(
                  (r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <button
              type="submit"
              className="mt-4 w-full rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white"
            >
              Guardar turno
            </button>
          </form>
        )}

        <div className="space-y-4">
          <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5">
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Turnos programados
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {localShifts.map((shift) => {
                const emp = users.find((u) => u.id === shift.employee_id);
                return (
                  <li
                    key={shift.id}
                    className="rounded-xl border border-[var(--sw-line)] px-3 py-2"
                  >
                    <p className="font-medium">
                      {emp?.full_name} · {ROLE_LABELS[shift.role]}
                    </p>
                    <p className="text-xs text-[var(--sw-muted)]">
                      {shift.date} · {shift.start}-{shift.end} · {shift.tipo}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5">
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              Fichajes
            </h3>
            <ul className="mt-3 space-y-2 text-sm">
              {localAttendance.map((punch) => {
                const emp = users.find((u) => u.id === punch.employee_id);
                return (
                  <li
                    key={punch.id}
                    className="rounded-xl border border-[var(--sw-line)] px-3 py-2"
                  >
                    <p className="font-medium">{emp?.full_name}</p>
                    <p className="text-xs text-[var(--sw-muted)]">
                      In: {formatDateTime(punch.clock_in)}
                      {punch.clock_out
                        ? ` · Out: ${formatDateTime(punch.clock_out)}`
                        : " · En turno"}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
