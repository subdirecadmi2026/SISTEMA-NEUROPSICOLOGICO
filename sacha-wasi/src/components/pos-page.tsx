"use client";

import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { TicketModal } from "@/components/ticket-modal";
import { formatMoney, formatTime } from "@/lib/currency";
import { useDemo } from "@/lib/demo-store";
import type { OrderChannel, PaymentMethod } from "@/types";

export function PosPage() {
  const {
    products,
    categories,
    cart,
    addToCart,
    updateCartLine,
    removeFromCart,
    clearCart,
    checkout,
    cash,
    mesas,
    lastTicket,
    clearLastTicket,
    customers,
    coupons,
    previewDiscount,
  } = useDemo();
  const [categoryId, setCategoryId] = useState<string>("all");
  const [payment, setPayment] = useState<PaymentMethod>("efectivo");
  const [channel, setChannel] = useState<OrderChannel>("mostrador");
  const [mesaId, setMesaId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [couponCode, setCouponCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) => p.active && (categoryId === "all" || p.category_id === categoryId),
      ),
    [products, categoryId],
  );

  const total = cart.reduce((sum, line) => {
    const product = products.find((p) => p.id === line.productId);
    return sum + (product?.price ?? 0) * line.qty;
  }, 0);
  const discountPreview = couponCode
    ? previewDiscount(couponCode, total)
    : { ok: false, message: "", discount: 0 };
  const payable = Math.max(0, total - (discountPreview.ok ? discountPreview.discount : 0));

  return (
    <AppShell
      title="Punto de venta"
      subtitle="Toma pedidos rápida con combos, mesas, notas y cobro. El inventario se descuenta por receta."
    >
      {cash.closed_at ? (
        <div className="mb-4 rounded-2xl border border-[var(--sw-chili)]/40 bg-[var(--sw-chili)]/10 px-4 py-3 text-sm">
          La caja está cerrada. Ábrela en el módulo Caja para vender.
        </div>
      ) : null}

      {lastTicket ? (
        <TicketModal order={lastTicket} onClose={clearLastTicket} />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId("all")}
              className={`rounded-xl px-4 py-2 text-sm ${
                categoryId === "all"
                  ? "bg-[var(--sw-forest)] text-white"
                  : "bg-white/80"
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryId(cat.id)}
                className={`rounded-xl px-4 py-2 text-sm ${
                  categoryId === cat.id
                    ? "bg-[var(--sw-forest)] text-white"
                    : "bg-white/80"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {filtered.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product.id)}
                className="sw-lift min-h-28 rounded-2xl border border-[var(--sw-line)] bg-white/85 p-4 text-left transition hover:border-[var(--sw-forest)]"
              >
                <p className="font-[family-name:var(--font-display)] text-lg leading-tight">
                  {product.name}
                </p>
                <p className="mt-2 text-sm text-[var(--sw-muted)]">{product.sku}</p>
                <p className="mt-3 text-base font-semibold text-[var(--sw-forest)]">
                  {formatMoney(product.price)}
                </p>
              </button>
            ))}
          </div>
        </section>

        <aside className="rounded-3xl border border-[var(--sw-line)] bg-[var(--sw-panel)]/95 p-5 shadow-[0_20px_50px_rgba(27,77,62,0.08)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">Pedido</h2>
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-[var(--sw-muted)] hover:text-[var(--sw-chili)]"
            >
              Vaciar
            </button>
          </div>

          <div className="max-h-[38vh] space-y-3 overflow-auto pr-1">
            {cart.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--sw-muted)]">
                Toca un producto para agregar
              </p>
            ) : (
              cart.map((line) => {
                const product = products.find((p) => p.id === line.productId)!;
                return (
                  <div
                    key={line.productId}
                    className="rounded-2xl border border-[var(--sw-line)] bg-white/70 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-[var(--sw-muted)]">
                          {formatMoney(product.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.productId)}
                        className="text-xs text-[var(--sw-chili)]"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        className="h-10 w-10 rounded-xl bg-[var(--sw-forest)] text-lg text-white"
                        onClick={() =>
                          updateCartLine(line.productId, {
                            qty: Math.max(1, line.qty - 1),
                          })
                        }
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-lg font-semibold">
                        {line.qty}
                      </span>
                      <button
                        type="button"
                        className="h-10 w-10 rounded-xl bg-[var(--sw-forest)] text-lg text-white"
                        onClick={() =>
                          updateCartLine(line.productId, { qty: line.qty + 1 })
                        }
                      >
                        +
                      </button>
                    </div>
                    <input
                      className="mt-3 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2 text-sm"
                      placeholder="Notas / modificadores"
                      value={line.notes}
                      onChange={(e) =>
                        updateCartLine(line.productId, { notes: e.target.value })
                      }
                    />
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-5 space-y-3 border-t border-[var(--sw-line)] pt-4">
            <label className="block text-xs text-[var(--sw-muted)]">
              Canal
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value as OrderChannel)}
              >
                <option value="mostrador">Mostrador</option>
                <option value="mesa">Mesa</option>
                <option value="takeaway">Para llevar</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>

            {channel === "mesa" ? (
              <label className="block text-xs text-[var(--sw-muted)]">
                Mesa
                <select
                  className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                  value={mesaId}
                  onChange={(e) => setMesaId(e.target.value)}
                >
                  <option value="">Seleccionar…</option>
                  {mesas.map((mesa) => (
                    <option key={mesa.id} value={mesa.id}>
                      {mesa.label} · {mesa.seats} pax · {mesa.status}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className="block text-xs text-[var(--sw-muted)]">
              Cliente fidelización
              <select
                className="mt-1 w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">Sin cliente</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.points} pts
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs text-[var(--sw-muted)]">
              Cupón
              <div className="mt-1 flex gap-2">
                <input
                  className="w-full rounded-xl border border-[var(--sw-line)] bg-white px-3 py-2.5 text-sm uppercase"
                  placeholder="SELVA10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  list="coupon-list"
                />
                <datalist id="coupon-list">
                  {coupons
                    .filter((c) => c.active)
                    .map((c) => (
                      <option key={c.id} value={c.code} />
                    ))}
                </datalist>
              </div>
              {couponCode && discountPreview.message ? (
                <span
                  className={`mt-1 block text-[11px] ${
                    discountPreview.ok
                      ? "text-[var(--sw-forest)]"
                      : "text-[var(--sw-chili)]"
                  }`}
                >
                  {discountPreview.message}
                </span>
              ) : null}
            </label>

            <div className="grid grid-cols-3 gap-2">
              {(["efectivo", "tarjeta", "wallet"] as PaymentMethod[]).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPayment(method)}
                  className={`rounded-xl px-2 py-3 text-sm capitalize ${
                    payment === method
                      ? "bg-[var(--sw-chili)] text-white"
                      : "bg-white"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-[var(--sw-muted)]">Total</p>
                <p className="font-[family-name:var(--font-display)] text-3xl">
                  {formatMoney(payable)}
                </p>
                {discountPreview.ok ? (
                  <p className="text-xs text-[var(--sw-chili)]">
                    Desc. {formatMoney(discountPreview.discount)}
                  </p>
                ) : null}
              </div>
              <p className="text-xs text-[var(--sw-muted)]">
                Caja abierta {formatTime(cash.opened_at)}
              </p>
            </div>
            <button
              type="button"
              disabled={
                cart.length === 0 ||
                Boolean(cash.closed_at) ||
                (channel === "mesa" && !mesaId)
              }
              onClick={() => {
                const result = checkout(payment, channel, {
                  mesaId: channel === "mesa" ? mesaId : null,
                  couponCode: couponCode || null,
                  customerId: customerId || null,
                });
                setMessage(result.message);
                if (result.ok) {
                  setCouponCode("");
                  setCustomerId("");
                  setMesaId("");
                }
              }}
              className="w-full rounded-2xl bg-[var(--sw-forest)] px-4 py-4 text-base font-semibold text-white disabled:opacity-40"
            >
              Cobrar, ticket y cocina
            </button>
            {message ? (
              <p className="text-center text-sm text-[var(--sw-forest)]">{message}</p>
            ) : null}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
