"use client";

import { formatDateTime, formatMoney } from "@/lib/currency";
import type { Order } from "@/types";

export function TicketModal({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:static print:bg-transparent">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl print:max-w-none print:rounded-none print:shadow-none">
        <div className="text-center">
          <p className="font-[family-name:var(--font-display)] text-2xl">
            Sacha Wasi
          </p>
          <p className="text-xs text-[var(--sw-muted)]">Ticket de venta</p>
          <p className="mt-2 text-sm font-semibold">{order.numero}</p>
          <p className="text-xs text-[var(--sw-muted)]">
            {formatDateTime(order.created_at)} · {order.channel} ·{" "}
            {order.payment_method}
            {order.coupon_code ? ` · cupón ${order.coupon_code}` : ""}
          </p>
        </div>

        <ul className="mt-5 space-y-2 border-y border-dashed border-[var(--sw-line)] py-4 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span>
                {item.qty}× {item.producto_name}
              </span>
              <span>{formatMoney(item.qty * item.unit_price)}</span>
            </li>
          ))}
        </ul>

        {(order.discount ?? 0) > 0 ? (
          <div className="mt-3 flex justify-between text-sm text-[var(--sw-chili)]">
            <span>Descuento</span>
            <span>-{formatMoney(order.discount)}</span>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-[var(--sw-muted)]">Total</span>
          <span className="font-[family-name:var(--font-display)] text-2xl">
            {formatMoney(order.total)}
          </span>
        </div>

        <div className="mt-6 flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex-1 rounded-2xl bg-[var(--sw-forest)] py-3 text-sm font-semibold text-white"
          >
            Imprimir / PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-[var(--sw-line)] py-3 text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
