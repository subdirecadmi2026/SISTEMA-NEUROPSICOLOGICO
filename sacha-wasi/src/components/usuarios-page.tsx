"use client";

import { AppShell } from "@/components/app-shell";
import { ROLE_LABELS } from "@/lib/roles";
import { useDemo } from "@/lib/demo-store";
import { DEMO_PASSWORD } from "@/lib/demo-data";

export function UsuariosPage() {
  const { users, sucursales, audits } = useDemo();

  return (
    <AppShell
      title="Usuarios y roles"
      subtitle="RBAC demo: admin, supervisor, caja, cocina e inventario. Cada acción deja auditoría."
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="overflow-hidden rounded-3xl border border-[var(--sw-line)] bg-white/85">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--sw-forest)] text-white">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Sucursal</th>
                <th className="px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const sucursal = sucursales.find((s) => s.id === user.sucursal_id);
                return (
                  <tr key={user.id} className="border-t border-[var(--sw-line)]">
                    <td className="px-4 py-3 font-medium">{user.full_name}</td>
                    <td className="px-4 py-3">{ROLE_LABELS[user.role]}</td>
                    <td className="px-4 py-3">
                      {sucursal?.name ?? "Todas"}
                    </td>
                    <td className="px-4 py-3 text-[var(--sw-muted)]">{user.email}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="border-t border-[var(--sw-line)] px-4 py-3 text-xs text-[var(--sw-muted)]">
            Contraseña demo compartida: <code>{DEMO_PASSWORD}</code>
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Auditoría reciente
          </h2>
          <ul className="mt-4 max-h-[70vh] space-y-2 overflow-auto text-sm">
            {audits.map((log) => (
              <li
                key={log.id}
                className="rounded-xl border border-[var(--sw-line)] bg-white/70 px-3 py-2"
              >
                <p className="font-medium">
                  {log.user_name} · {log.action}
                </p>
                <p className="text-xs text-[var(--sw-muted)]">
                  {ROLE_LABELS[log.role]} · {log.entity}
                  {log.entity_id ? ` #${log.entity_id}` : ""} ·{" "}
                  {new Date(log.timestamp).toLocaleString("es-PE")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
