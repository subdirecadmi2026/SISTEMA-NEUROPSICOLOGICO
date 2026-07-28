"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createInitialAuditLogs,
  createInitialCashSession,
  createInitialMovements,
  createInitialOrders,
  DEMO_CATEGORIES,
  DEMO_INSUMOS,
  DEMO_PRODUCTS,
  DEMO_RECETA_INGREDIENTES,
  DEMO_RECETAS,
  DEMO_SUCURSALES,
  DEMO_USERS,
  recipeCost,
} from "@/lib/demo-data";
import { homeForRole } from "@/lib/roles";
import type {
  AuditLog,
  CashSession,
  Insumo,
  InventoryMovement,
  Order,
  OrderChannel,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Profile,
  Role,
} from "@/types";

const SESSION_KEY = "sacha-wasi-session";
const STORE_KEY = "sacha-wasi-store-v1";

type CartLine = {
  productId: string;
  qty: number;
  notes: string;
  modifiers: string[];
};

type DemoStoreState = {
  insumos: Insumo[];
  orders: Order[];
  movements: InventoryMovement[];
  cash: CashSession;
  audits: AuditLog[];
  orderSeq: number;
};

type DemoContextValue = {
  ready: boolean;
  user: Profile | null;
  sucursalId: string;
  cart: CartLine[];
  insumos: Insumo[];
  orders: Order[];
  movements: InventoryMovement[];
  cash: CashSession;
  audits: AuditLog[];
  products: typeof DEMO_PRODUCTS;
  categories: typeof DEMO_CATEGORIES;
  recetas: typeof DEMO_RECETAS;
  recetaIngredientes: typeof DEMO_RECETA_INGREDIENTES;
  sucursales: typeof DEMO_SUCURSALES;
  users: typeof DEMO_USERS;
  login: (email: string, password: string) => { ok: boolean; message: string; redirect?: string };
  logout: () => void;
  setSucursalId: (id: string) => void;
  addToCart: (productId: string) => void;
  updateCartLine: (productId: string, patch: Partial<CartLine>) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  checkout: (payment: PaymentMethod, channel: OrderChannel) => { ok: boolean; message: string; order?: Order };
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  adjustInventory: (
    insumoId: string,
    tipo: InventoryMovement["tipo"],
    cantidad: number,
    motivo: string,
  ) => { ok: boolean; message: string };
  closeCash: (closingAmount: number, notes: string) => { ok: boolean; message: string };
  openCash: (openingFloat: number) => void;
  recipeCost: (recetaId: string) => number;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function initialStore(): DemoStoreState {
  return {
    insumos: structuredClone(DEMO_INSUMOS),
    orders: createInitialOrders(),
    movements: createInitialMovements(),
    cash: createInitialCashSession(),
    audits: createInitialAuditLogs(),
    orderSeq: 1004,
  };
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function subscribeNoop() {
  return () => {};
}

function pushAudit(
  audits: AuditLog[],
  user: Profile,
  action: string,
  entity: string,
  entityId: string | null,
): AuditLog[] {
  return [
    {
      id: `log-${Date.now()}`,
      user_id: user.id,
      user_name: user.full_name,
      role: user.role,
      action,
      entity,
      entity_id: entityId,
      timestamp: new Date().toISOString(),
    },
    ...audits,
  ].slice(0, 200);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [user, setUser] = useState<Profile | null>(() =>
    readJson<Profile | null>(SESSION_KEY, null),
  );
  const [sucursalId, setSucursalId] = useState(() => {
    const saved = readJson<Profile | null>(SESSION_KEY, null);
    return saved?.sucursal_id ?? "suc-centro";
  });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [store, setStore] = useState<DemoStoreState>(() =>
    readJson(STORE_KEY, initialStore()),
  );

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [ready, store]);

  const login = useCallback((email: string, password: string) => {
    const found = DEMO_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!found) {
      return { ok: false, message: "Credenciales inválidas" };
    }
    const profile: Profile = {
      id: found.id,
      email: found.email,
      full_name: found.full_name,
      role: found.role,
      sucursal_id: found.sucursal_id,
      active: found.active,
    };
    setUser(profile);
    if (found.sucursal_id) setSucursalId(found.sucursal_id);
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    setStore((prev) => ({
      ...prev,
      audits: pushAudit(prev.audits, profile, "login", "session", null),
    }));
    return {
      ok: true,
      message: "Bienvenido",
      redirect: homeForRole(found.role as Role),
    };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCart([]);
    localStorage.removeItem(SESSION_KEY);
  }, []);

  const addToCart = useCallback((productId: string) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === productId);
      if (existing) {
        return prev.map((l) =>
          l.productId === productId ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [...prev, { productId, qty: 1, notes: "", modifiers: [] }];
    });
  }, []);

  const updateCartLine = useCallback((productId: string, patch: Partial<CartLine>) => {
    setCart((prev) =>
      prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const checkout = useCallback(
    (payment: PaymentMethod, channel: OrderChannel) => {
      if (!user) return { ok: false, message: "Debes iniciar sesión" };
      if (cart.length === 0) return { ok: false, message: "Carrito vacío" };
      if (store.cash.closed_at) {
        return { ok: false, message: "La caja está cerrada. Ábrela antes de vender." };
      }

      const requirements = new Map<string, number>();
      for (const line of cart) {
        const receta = DEMO_RECETAS.find(
          (r) => r.producto_id === line.productId && r.active,
        );
        if (!receta) continue;
        const ingredients = DEMO_RECETA_INGREDIENTES.filter(
          (i) => i.receta_id === receta.id,
        );
        for (const ing of ingredients) {
          requirements.set(
            ing.insumo_id,
            (requirements.get(ing.insumo_id) ?? 0) + ing.cantidad * line.qty,
          );
        }
      }

      for (const [insumoId, needed] of requirements) {
        const insumo = store.insumos.find((i) => i.id === insumoId);
        if (!insumo || insumo.stock < needed) {
          return {
            ok: false,
            message: `Stock insuficiente: ${insumo?.name ?? insumoId}`,
          };
        }
      }

      const items: OrderItem[] = cart.map((line, idx) => {
        const product = DEMO_PRODUCTS.find((p) => p.id === line.productId)!;
        return {
          id: `oi-${Date.now()}-${idx}`,
          producto_id: product.id,
          producto_name: product.name,
          qty: line.qty,
          unit_price: product.price,
          notes: line.notes || null,
          modifiers: line.modifiers,
        };
      });

      const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
      const maxPrep = Math.max(
        ...items.map((i) => {
          const p = DEMO_PRODUCTS.find((x) => x.id === i.producto_id);
          return p?.prep_minutes ?? 8;
        }),
      );

      const order: Order = {
        id: `ord-${store.orderSeq}`,
        numero: `SW-${store.orderSeq}`,
        sucursal_id: sucursalId,
        channel,
        status: "recibido",
        payment_method: payment,
        total,
        items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
        station_priority: store.orders.filter((o) =>
          ["recibido", "en_preparacion"].includes(o.status),
        ).length + 1,
        estimated_ready_at: new Date(Date.now() + maxPrep * 60_000).toISOString(),
      };

      const nextInsumos = store.insumos.map((insumo) => {
        const needed = requirements.get(insumo.id);
        if (!needed) return insumo;
        return { ...insumo, stock: Number((insumo.stock - needed).toFixed(3)) };
      });

      const saleMovements: InventoryMovement[] = [...requirements.entries()].map(
        ([insumoId, cantidad], idx) => ({
          id: `mov-${Date.now()}-${idx}`,
          insumo_id: insumoId,
          tipo: "venta",
          cantidad,
          motivo: `Venta ${order.numero}`,
          referencia_id: order.id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }),
      );

      const cashIncrement = payment === "efectivo" ? total : 0;

      setStore((prev) => ({
        ...prev,
        orderSeq: prev.orderSeq + 1,
        orders: [order, ...prev.orders],
        insumos: nextInsumos,
        movements: [...saleMovements, ...prev.movements],
        cash: {
          ...prev.cash,
          expected_cash: prev.cash.expected_cash + cashIncrement,
        },
        audits: pushAudit(prev.audits, user, "create_order", "ordenes", order.id),
      }));
      setCart([]);
      return { ok: true, message: `Orden ${order.numero} creada`, order };
    },
    [cart, store.cash.closed_at, store.insumos, store.orderSeq, store.orders, sucursalId, user],
  );

  const updateOrderStatus = useCallback(
    (orderId: string, status: OrderStatus) => {
      if (!user) return;
      setStore((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId
            ? { ...o, status, updated_at: new Date().toISOString() }
            : o,
        ),
        audits: pushAudit(prev.audits, user, `status_${status}`, "ordenes", orderId),
      }));
    },
    [user],
  );

  const adjustInventory = useCallback(
    (
      insumoId: string,
      tipo: InventoryMovement["tipo"],
      cantidad: number,
      motivo: string,
    ) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      if (cantidad <= 0) return { ok: false, message: "Cantidad inválida" };

      const delta =
        tipo === "entrada" ? cantidad : tipo === "ajuste" ? cantidad : -cantidad;

      setStore((prev) => {
        const insumos = prev.insumos.map((i) => {
          if (i.id !== insumoId) return i;
          return {
            ...i,
            stock: Number(Math.max(0, i.stock + delta).toFixed(3)),
          };
        });
        const movement: InventoryMovement = {
          id: `mov-${Date.now()}`,
          insumo_id: insumoId,
          tipo,
          cantidad: Math.abs(cantidad),
          motivo,
          referencia_id: null,
          created_by: user.id,
          created_at: new Date().toISOString(),
        };
        return {
          ...prev,
          insumos,
          movements: [movement, ...prev.movements],
          audits: pushAudit(prev.audits, user, `inventory_${tipo}`, "insumos", insumoId),
        };
      });
      return { ok: true, message: "Movimiento registrado" };
    },
    [user],
  );

  const closeCash = useCallback(
    (closingAmount: number, notes: string) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      if (store.cash.closed_at) return { ok: false, message: "La caja ya está cerrada" };
      setStore((prev) => ({
        ...prev,
        cash: {
          ...prev.cash,
          closed_at: new Date().toISOString(),
          closing_amount: closingAmount,
          notes: notes || null,
        },
        audits: pushAudit(prev.audits, user, "close_cash", "cash_session", prev.cash.id),
      }));
      return { ok: true, message: "Caja cerrada" };
    },
    [store.cash.closed_at, user],
  );

  const openCash = useCallback(
    (openingFloat: number) => {
      if (!user) return;
      const cash: CashSession = {
        id: `cash-${Date.now()}`,
        sucursal_id: sucursalId,
        opened_by: user.id,
        opened_at: new Date().toISOString(),
        closed_at: null,
        opening_float: openingFloat,
        closing_amount: null,
        expected_cash: openingFloat,
        notes: null,
      };
      setStore((prev) => ({
        ...prev,
        cash,
        audits: pushAudit(prev.audits, user, "open_cash", "cash_session", cash.id),
      }));
    },
    [sucursalId, user],
  );

  const value = useMemo<DemoContextValue>(
    () => ({
      ready,
      user,
      sucursalId,
      cart,
      insumos: store.insumos,
      orders: store.orders,
      movements: store.movements,
      cash: store.cash,
      audits: store.audits,
      products: DEMO_PRODUCTS,
      categories: DEMO_CATEGORIES,
      recetas: DEMO_RECETAS,
      recetaIngredientes: DEMO_RECETA_INGREDIENTES,
      sucursales: DEMO_SUCURSALES,
      users: DEMO_USERS,
      login,
      logout,
      setSucursalId,
      addToCart,
      updateCartLine,
      removeFromCart,
      clearCart,
      checkout,
      updateOrderStatus,
      adjustInventory,
      closeCash,
      openCash,
      recipeCost,
    }),
    [
      ready,
      user,
      sucursalId,
      cart,
      store,
      login,
      logout,
      addToCart,
      updateCartLine,
      removeFromCart,
      clearCart,
      checkout,
      updateOrderStatus,
      adjustInventory,
      closeCash,
      openCash,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo debe usarse dentro de DemoProvider");
  return ctx;
}
