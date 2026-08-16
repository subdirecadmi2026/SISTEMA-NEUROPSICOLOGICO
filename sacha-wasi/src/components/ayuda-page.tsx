"use client";

import { AppShell } from "@/components/app-shell";
import { DEMO_PASSWORD, DEMO_USERS } from "@/lib/demo-data";
import { ROLE_LABELS } from "@/lib/roles";

const MODULES = [
  {
    title: "POS",
    body: "Toma pedidos, elige canal (mostrador/mesa/takeaway/delivery), cobra y envía a cocina. El stock baja según la receta. En cloud usa create_order_with_inventory.",
  },
  {
    title: "KDS",
    body: "Pantalla de cocina con estados, alerta >12 min, beep en pedidos nuevos y realtime Supabase.",
  },
  {
    title: "Recetas",
    body: "Escandallo por plato: ingredientes, costo y margen.",
  },
  {
    title: "Inventario",
    body: "Entradas, salidas, mermas y alertas de mínimo.",
  },
  {
    title: "Compras",
    body: "Órdenes a proveedores. Al recibir, el stock se actualiza solo.",
  },
  {
    title: "RRHH",
    body: "Turnos programados y fichaje de entrada/salida.",
  },
  {
    title: "Fidelización",
    body: "Clientes, puntos por compra y cupones aplicables en el POS.",
  },
  {
    title: "Caja",
    body: "Apertura, ventas en efectivo esperadas, cierre y discrepancia (también en cloud).",
  },
  {
    title: "Incidencias",
    body: "Reportes operativos por sucursal (equipo, demoras, fallas). Requiere SETUP_PART3.sql en cloud.",
  },
  {
    title: "Reportes",
    body: "KPIs y exportación CSV de ventas.",
  },
];

export function AyudaPage() {
  return (
    <AppShell
      title="Manual rápido"
      subtitle="Guía integrada para capacitar al personal de Sacha Wasi en modo demo."
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Usuarios demo
          </h2>
          <p className="mt-2 text-sm text-[var(--sw-muted)]">
            Contraseña compartida: <code>{DEMO_PASSWORD}</code>
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {DEMO_USERS.map((u) => (
              <li
                key={u.id}
                className="rounded-xl border border-[var(--sw-line)] px-3 py-2"
              >
                <span className="font-medium">{ROLE_LABELS[u.role]}</span>
                <span className="text-[var(--sw-muted)]"> · {u.email}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">
            Flujo recomendado
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm">
            <li>Entra como <strong>caja</strong> y verifica que la caja esté abierta.</li>
            <li>Crea un pedido en POS (ej. Combo Selva) y cobra.</li>
            <li>Cambia a <strong>cocina</strong> y avanza el pedido en KDS.</li>
            <li>Revisa en Inventario cómo bajó el stock por receta.</li>
            <li>Como inventario, crea una compra y márcala como recibida.</li>
            <li>Como admin, mira reportes y auditoría de usuarios.</li>
          </ol>
        </section>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((mod) => (
          <article
            key={mod.title}
            className="rounded-3xl border border-[var(--sw-line)] bg-white/85 p-5"
          >
            <h3 className="font-[family-name:var(--font-display)] text-xl">
              {mod.title}
            </h3>
            <p className="mt-2 text-sm text-[var(--sw-muted)]">{mod.body}</p>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
