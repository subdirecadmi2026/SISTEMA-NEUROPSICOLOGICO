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
  createInitialAttendance,
  createInitialAuditLogs,
  createInitialCashSession,
  createInitialMovements,
  createInitialOrders,
  createInitialPurchases,
  createInitialShifts,
  DEMO_CATEGORIES,
  DEMO_COUPONS,
  DEMO_CUSTOMERS,
  DEMO_INSUMOS,
  DEMO_MESAS,
  DEMO_PRODUCTS,
  DEMO_PROVEEDORES,
  DEMO_RECETA_INGREDIENTES,
  DEMO_RECETAS,
  DEMO_SUCURSALES,
  DEMO_USERS,
} from "@/lib/demo-data";
import { buildAlerts, calcPurchaseTotal } from "@/lib/ops-helpers";
import { homeForRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/client";
import {
  bumpCloudCashExpected,
  closeCloudCash,
  createCloudIncident,
  createCloudOrder,
  fetchCloudSnapshot,
  openCloudCash,
  subscribeKitchenOrders,
  updateCloudIncidentStatus,
  updateCloudOrderStatus,
} from "@/lib/supabase/cloud";
import type {
  AppAlert,
  AttendancePunch,
  AuditLog,
  CashSession,
  Category,
  Coupon,
  Customer,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Insumo,
  InventoryMovement,
  Mesa,
  Order,
  OrderChannel,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  Profile,
  Proveedor,
  PurchaseOrder,
  PurchaseStatus,
  Receta,
  RecetaIngrediente,
  Role,
  Shift,
  ShiftType,
  Sucursal,
} from "@/types";

const SESSION_KEY = "sacha-wasi-session";
const CLOUD_KEY = "sacha-wasi-cloud";
const STORE_KEY = "sacha-wasi-store-v4";

type CartLine = {
  productId: string;
  qty: number;
  notes: string;
  modifiers: string[];
};

type CheckoutOptions = {
  mesaId?: string | null;
  couponCode?: string | null;
  customerId?: string | null;
};

type DemoStoreState = {
  products: Product[];
  insumos: Insumo[];
  orders: Order[];
  movements: InventoryMovement[];
  cash: CashSession;
  audits: AuditLog[];
  purchases: PurchaseOrder[];
  mesas: Mesa[];
  shifts: Shift[];
  attendance: AttendancePunch[];
  customers: Customer[];
  coupons: Coupon[];
  orderSeq: number;
  purchaseSeq: number;
  lastTicket: Order | null;
};

type DemoContextValue = {
  ready: boolean;
  user: Profile | null;
  cloudMode: boolean;
  syncStatus: string | null;
  sucursalId: string;
  cart: CartLine[];
  products: Product[];
  insumos: Insumo[];
  orders: Order[];
  movements: InventoryMovement[];
  cash: CashSession;
  audits: AuditLog[];
  purchases: PurchaseOrder[];
  mesas: Mesa[];
  shifts: Shift[];
  attendance: AttendancePunch[];
  customers: Customer[];
  coupons: Coupon[];
  incidents: Incident[];
  proveedores: Proveedor[];
  alerts: AppAlert[];
  lastTicket: Order | null;
  categories: Category[];
  recetas: Receta[];
  recetaIngredientes: RecetaIngrediente[];
  sucursales: Sucursal[];
  users: typeof DEMO_USERS;
  login: (email: string, password: string) => { ok: boolean; message: string; redirect?: string };
  loginAsProfile: (profile: Profile) => { ok: boolean; message: string; redirect?: string };
  logout: () => void;
  syncFromCloud: (overrideSucursal?: string) => Promise<{ ok: boolean; message: string }>;
  setSucursalId: (id: string) => void;
  addToCart: (productId: string) => void;
  updateCartLine: (productId: string, patch: Partial<CartLine>) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  clearLastTicket: () => void;
  checkout: (
    payment: PaymentMethod,
    channel: OrderChannel,
    options?: CheckoutOptions,
  ) => Promise<{ ok: boolean; message: string; order?: Order }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  adjustInventory: (
    insumoId: string,
    tipo: InventoryMovement["tipo"],
    cantidad: number,
    motivo: string,
  ) => { ok: boolean; message: string };
  closeCash: (
    closingAmount: number,
    notes: string,
  ) => Promise<{ ok: boolean; message: string }>;
  openCash: (openingFloat: number) => Promise<{ ok: boolean; message: string }>;
  createPurchase: (input: {
    proveedor_id: string;
    lines: PurchaseOrder["lines"];
    notes?: string;
  }) => { ok: boolean; message: string };
  updatePurchaseStatus: (
    purchaseId: string,
    status: PurchaseStatus,
  ) => { ok: boolean; message: string };
  upsertProduct: (product: Product) => { ok: boolean; message: string };
  toggleProductActive: (productId: string) => void;
  clockIn: (employeeId?: string) => { ok: boolean; message: string };
  clockOut: (employeeId?: string) => { ok: boolean; message: string };
  addShift: (input: {
    employee_id: string;
    date: string;
    start: string;
    end: string;
    tipo: ShiftType;
    role: Role;
  }) => { ok: boolean; message: string };
  upsertCustomer: (input: {
    id?: string;
    name: string;
    phone: string;
    email: string;
  }) => { ok: boolean; message: string };
  upsertCoupon: (coupon: Omit<Coupon, "id" | "uses"> & { id?: string }) => {
    ok: boolean;
    message: string;
  };
  createIncident: (input: {
    title: string;
    description: string;
    severity: IncidentSeverity;
  }) => Promise<{ ok: boolean; message: string }>;
  updateIncidentStatus: (
    incidentId: string,
    status: IncidentStatus,
  ) => Promise<{ ok: boolean; message: string }>;
  previewDiscount: (code: string, subtotal: number) => {
    ok: boolean;
    message: string;
    discount: number;
  };
  recipeCost: (recetaId: string) => number;
};

const DemoContext = createContext<DemoContextValue | null>(null);

function initialStore(): DemoStoreState {
  return {
    products: structuredClone(DEMO_PRODUCTS),
    insumos: structuredClone(DEMO_INSUMOS),
    orders: createInitialOrders(),
    movements: createInitialMovements(),
    cash: createInitialCashSession(),
    audits: createInitialAuditLogs(),
    purchases: createInitialPurchases(),
    mesas: structuredClone(DEMO_MESAS),
    shifts: createInitialShifts(),
    attendance: createInitialAttendance(),
    customers: structuredClone(DEMO_CUSTOMERS),
    coupons: structuredClone(DEMO_COUPONS),
    orderSeq: 1004,
    purchaseSeq: 2403,
    lastTicket: null,
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

function calcDiscount(coupon: Coupon, subtotal: number) {
  if (!coupon.active) return 0;
  if (subtotal < coupon.min_ticket) return 0;
  if (coupon.max_uses != null && coupon.uses >= coupon.max_uses) return 0;
  if (coupon.type === "percent") {
    return Number(((subtotal * coupon.value) / 100).toFixed(2));
  }
  return Math.min(coupon.value, subtotal);
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [user, setUser] = useState<Profile | null>(() =>
    readJson<Profile | null>(SESSION_KEY, null),
  );
  const [cloudMode, setCloudMode] = useState(
    () => readJson<boolean>(CLOUD_KEY, false),
  );
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState(() => {
    const saved = readJson<Profile | null>(SESSION_KEY, null);
    return saved?.sucursal_id ?? "suc-centro";
  });
  const [cart, setCart] = useState<CartLine[]>([]);
  const [store, setStore] = useState<DemoStoreState>(() => {
    const saved = readJson<Partial<DemoStoreState> | null>(STORE_KEY, null);
    return { ...initialStore(), ...(saved ?? {}) };
  });
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [sucursales, setSucursales] = useState<Sucursal[]>(DEMO_SUCURSALES);
  const [recetas, setRecetas] = useState<Receta[]>(DEMO_RECETAS);
  const [recetaIngredientes, setRecetaIngredientes] = useState<
    RecetaIngrediente[]
  >(DEMO_RECETA_INGREDIENTES);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  }, [ready, store]);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(CLOUD_KEY, JSON.stringify(cloudMode));
  }, [ready, cloudMode]);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const applyCloudSnapshot = useCallback(
    (
      snapshot: NonNullable<Awaited<ReturnType<typeof fetchCloudSnapshot>>>,
      preferredSucursal?: string | null,
    ) => {
      setCategories(
        snapshot.categories.length ? snapshot.categories : DEMO_CATEGORIES,
      );
      setSucursales(
        snapshot.sucursales.length ? snapshot.sucursales : DEMO_SUCURSALES,
      );
      setRecetas(snapshot.recetas.length ? snapshot.recetas : DEMO_RECETAS);
      setRecetaIngredientes(
        snapshot.recetaIngredientes.length
          ? snapshot.recetaIngredientes
          : DEMO_RECETA_INGREDIENTES,
      );
      setIncidents(snapshot.incidents);

      const nextSucursal =
        preferredSucursal &&
        snapshot.sucursales.some((s) => s.id === preferredSucursal)
          ? preferredSucursal
          : snapshot.sucursales[0]?.id ?? preferredSucursal ?? sucursalId;

      if (nextSucursal) setSucursalId(nextSucursal);

      setStore((prev) => ({
        ...prev,
        products: snapshot.products.length ? snapshot.products : prev.products,
        insumos: snapshot.insumos.length ? snapshot.insumos : prev.insumos,
        orders: snapshot.orders.length ? snapshot.orders : prev.orders,
        cash: snapshot.cash
          ? snapshot.cash
          : {
              ...prev.cash,
              sucursal_id: nextSucursal ?? prev.cash.sucursal_id,
            },
      }));
    },
    [sucursalId],
  );

  const syncFromCloud = useCallback(
    async (overrideSucursal?: string) => {
      const target = overrideSucursal ?? sucursalId;
      setSyncStatus("Sincronizando…");
      const snapshot = await fetchCloudSnapshot(target);
      if (!snapshot) {
        setSyncStatus("Sin datos cloud (¿SETUP_PART2.sql?)");
        return {
          ok: false,
          message: "No se pudo leer catálogo. Revisa SETUP.sql / PART2.",
        };
      }
      if (!snapshot.products.length && !snapshot.sucursales.length) {
        setSyncStatus("Cloud vacío — ejecuta SETUP_PART2.sql");
        return {
          ok: false,
          message: "Tablas vacías. Ejecuta SETUP_PART2.sql en Supabase.",
        };
      }
      applyCloudSnapshot(snapshot, user?.sucursal_id ?? target);
      setSyncStatus(
        `Cloud OK · ${snapshot.products.length} productos · ${snapshot.insumos.length} insumos`,
      );
      return { ok: true, message: "Catálogo sincronizado" };
    },
    [applyCloudSnapshot, sucursalId, user?.sucursal_id],
  );

  useEffect(() => {
    if (!ready || !cloudMode || !user) return;
    const timer = window.setTimeout(() => {
      void syncFromCloud();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [ready, cloudMode, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!cloudMode || !sucursalId) return;
    const unsubscribe = subscribeKitchenOrders(sucursalId, () => {
      window.setTimeout(() => {
        void syncFromCloud();
      }, 0);
    });
    const poll = window.setInterval(() => {
      void syncFromCloud();
    }, 20_000);
    return () => {
      unsubscribe();
      window.clearInterval(poll);
    };
  }, [cloudMode, sucursalId, syncFromCloud]);

  const login = useCallback((email: string, password: string) => {
    const found = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.trim().toLowerCase() &&
        u.password === password,
    );
    if (!found) return { ok: false, message: "Credenciales inválidas" };
    const profile: Profile = {
      id: found.id,
      email: found.email,
      full_name: found.full_name,
      role: found.role,
      sucursal_id: found.sucursal_id,
      active: found.active,
    };
    setCloudMode(false);
    setCategories(DEMO_CATEGORIES);
    setSucursales(DEMO_SUCURSALES);
    setRecetas(DEMO_RECETAS);
    setRecetaIngredientes(DEMO_RECETA_INGREDIENTES);
    setIncidents([]);
    setSyncStatus("Modo demo local");
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

  const loginAsProfile = useCallback((profile: Profile) => {
    setCloudMode(true);
    setSyncStatus("Sesión cloud — sincronizando…");
    setUser(profile);
    if (profile.sucursal_id) setSucursalId(profile.sucursal_id);
    localStorage.setItem(SESSION_KEY, JSON.stringify(profile));
    setStore((prev) => ({
      ...prev,
      audits: pushAudit(prev.audits, profile, "login_supabase", "session", null),
    }));
    return {
      ok: true,
      message: "Sesión cloud iniciada",
      redirect: homeForRole(profile.role),
    };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setCart([]);
    setCloudMode(false);
    setSyncStatus(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(CLOUD_KEY, "false");
    const supabase = createClient();
    if (supabase) void supabase.auth.signOut();
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

  const updateCartLine = useCallback(
    (productId: string, patch: Partial<CartLine>) => {
      setCart((prev) =>
        prev.map((l) => (l.productId === productId ? { ...l, ...patch } : l)),
      );
    },
    [],
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);
  const clearLastTicket = useCallback(() => {
    setStore((prev) => ({ ...prev, lastTicket: null }));
  }, []);

  const previewDiscount = useCallback(
    (code: string, subtotal: number) => {
      const coupon = store.coupons.find(
        (c) => c.code.toUpperCase() === code.trim().toUpperCase(),
      );
      if (!coupon) return { ok: false, message: "Cupón no encontrado", discount: 0 };
      const discount = calcDiscount(coupon, subtotal);
      if (discount <= 0) {
        return {
          ok: false,
          message: "Cupón no aplicable (mínimo, usos o inactivo)",
          discount: 0,
        };
      }
      return {
        ok: true,
        message: `Descuento ${coupon.code}: -${discount.toFixed(2)}`,
        discount,
      };
    },
    [store.coupons],
  );

  const checkout = useCallback(
    async (
      payment: PaymentMethod,
      channel: OrderChannel,
      options: CheckoutOptions = {},
    ) => {
      if (!user) return { ok: false, message: "Debes iniciar sesión" };
      if (cart.length === 0) return { ok: false, message: "Carrito vacío" };
      if (store.cash.closed_at) {
        return {
          ok: false,
          message: "La caja está cerrada. Ábrela antes de vender.",
        };
      }

      const products = store.products;

      if (cloudMode) {
        const cloud = await createCloudOrder({
          sucursalId,
          channel,
          payment,
          items: cart.map((line) => ({
            producto_id: line.productId,
            qty: line.qty,
            notes: line.notes || null,
            modifiers: line.modifiers,
          })),
        });
        if (!cloud.ok) return { ok: false, message: cloud.message };

        let order = cloud.order;
        if (options.couponCode || options.customerId) {
          const subtotal = order.items.reduce(
            (s, i) => s + i.qty * i.unit_price,
            0,
          );
          let discount = 0;
          let couponCode: string | null = null;
          if (options.couponCode) {
            const preview = previewDiscount(options.couponCode, subtotal);
            if (preview.ok) {
              discount = preview.discount;
              couponCode = options.couponCode.trim().toUpperCase();
            }
          }
          order = {
            ...order,
            subtotal,
            discount,
            coupon_code: couponCode,
            customer_id: options.customerId || null,
            total: Number((subtotal - discount).toFixed(2)),
          };
        }

        const pointsEarned = Math.floor(order.total);
        setStore((prev) => {
          const nextExpected =
            prev.cash.expected_cash +
            (payment === "efectivo" ? order.total : 0);
          if (cloudMode && prev.cash.id && !prev.cash.id.startsWith("cash-")) {
            void bumpCloudCashExpected(prev.cash.id, nextExpected);
          }
          return {
            ...prev,
            orders: [order, ...prev.orders.filter((o) => o.id !== order.id)],
            lastTicket: order,
            mesas:
              channel === "mesa" && options.mesaId
                ? prev.mesas.map((m) =>
                    m.id === options.mesaId ? { ...m, status: "ocupada" } : m,
                  )
                : prev.mesas,
            coupons: order.coupon_code
              ? prev.coupons.map((c) =>
                  c.code === order.coupon_code ? { ...c, uses: c.uses + 1 } : c,
                )
              : prev.coupons,
            customers: options.customerId
              ? prev.customers.map((c) =>
                  c.id === options.customerId
                    ? {
                        ...c,
                        points: c.points + pointsEarned,
                        visits: c.visits + 1,
                      }
                    : c,
                )
              : prev.customers,
            cash: {
              ...prev.cash,
              expected_cash: nextExpected,
            },
            audits: pushAudit(
              prev.audits,
              user,
              "create_order_cloud",
              "ordenes",
              order.id,
            ),
          };
        });
        setCart([]);
        void syncFromCloud();
        return {
          ok: true,
          message: `Orden cloud ${order.numero} creada`,
          order,
        };
      }

      const requirements = new Map<string, number>();
      for (const line of cart) {
        const receta = recetas.find(
          (r) => r.producto_id === line.productId && r.active,
        );
        if (!receta) continue;
        const ingredients = recetaIngredientes.filter(
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
        const product = products.find((p) => p.id === line.productId)!;
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

      const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
      let discount = 0;
      let couponCode: string | null = null;
      if (options.couponCode) {
        const preview = previewDiscount(options.couponCode, subtotal);
        if (!preview.ok) return { ok: false, message: preview.message };
        discount = preview.discount;
        couponCode = options.couponCode.trim().toUpperCase();
      }
      const total = Number((subtotal - discount).toFixed(2));

      const maxPrep = Math.max(
        ...items.map((i) => {
          const p = products.find((x) => x.id === i.producto_id);
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
        subtotal,
        discount,
        coupon_code: couponCode,
        customer_id: options.customerId || null,
        items,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: user.id,
        station_priority:
          store.orders.filter((o) =>
            ["recibido", "en_preparacion"].includes(o.status),
          ).length + 1,
        estimated_ready_at: new Date(
          Date.now() + maxPrep * 60_000,
        ).toISOString(),
      };

      const pointsEarned = Math.floor(total);

      setStore((prev) => {
        const nextInsumos = prev.insumos.map((insumo) => {
          const needed = requirements.get(insumo.id);
          if (!needed) return insumo;
          return {
            ...insumo,
            stock: Number((insumo.stock - needed).toFixed(3)),
          };
        });
        const saleMovements: InventoryMovement[] = [
          ...requirements.entries(),
        ].map(([insumoId, cantidad], idx) => ({
          id: `mov-${Date.now()}-${idx}`,
          insumo_id: insumoId,
          tipo: "venta" as const,
          cantidad,
          motivo: `Venta ${order.numero}`,
          referencia_id: order.id,
          created_by: user.id,
          created_at: new Date().toISOString(),
        }));

        return {
          ...prev,
          orderSeq: prev.orderSeq + 1,
          orders: [order, ...prev.orders],
          insumos: nextInsumos,
          movements: [...saleMovements, ...prev.movements],
          lastTicket: order,
          mesas:
            channel === "mesa" && options.mesaId
              ? prev.mesas.map((m) =>
                  m.id === options.mesaId ? { ...m, status: "ocupada" } : m,
                )
              : prev.mesas,
          coupons: couponCode
            ? prev.coupons.map((c) =>
                c.code === couponCode ? { ...c, uses: c.uses + 1 } : c,
              )
            : prev.coupons,
          customers: options.customerId
            ? prev.customers.map((c) =>
                c.id === options.customerId
                  ? {
                      ...c,
                      points: c.points + pointsEarned,
                      visits: c.visits + 1,
                    }
                  : c,
              )
            : prev.customers,
          cash: {
            ...prev.cash,
            expected_cash:
              prev.cash.expected_cash + (payment === "efectivo" ? total : 0),
          },
          audits: pushAudit(
            prev.audits,
            user,
            "create_order",
            "ordenes",
            order.id,
          ),
        };
      });
      setCart([]);
      return { ok: true, message: `Orden ${order.numero} creada`, order };
    },
    [
      cart,
      cloudMode,
      previewDiscount,
      recetaIngredientes,
      recetas,
      store.cash.closed_at,
      store.insumos,
      store.orderSeq,
      store.orders,
      store.products,
      sucursalId,
      syncFromCloud,
      user,
    ],
  );

  const updateOrderStatus = useCallback(
    async (orderId: string, status: OrderStatus) => {
      if (!user) return;
      if (cloudMode) {
        const remote = await updateCloudOrderStatus(orderId, status);
        if (!remote.ok) {
          setSyncStatus(remote.message);
          return;
        }
      }
      setStore((prev) => ({
        ...prev,
        orders: prev.orders.map((o) =>
          o.id === orderId
            ? { ...o, status, updated_at: new Date().toISOString() }
            : o,
        ),
        audits: pushAudit(
          prev.audits,
          user,
          `status_${status}`,
          "ordenes",
          orderId,
        ),
      }));
    },
    [cloudMode, user],
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
          audits: pushAudit(
            prev.audits,
            user,
            `inventory_${tipo}`,
            "insumos",
            insumoId,
          ),
        };
      });
      return { ok: true, message: "Movimiento registrado" };
    },
    [user],
  );

  const closeCash = useCallback(
    async (closingAmount: number, notes: string) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      if (store.cash.closed_at) {
        return { ok: false, message: "La caja ya está cerrada" };
      }
      if (cloudMode && !store.cash.id.startsWith("cash-")) {
        const remote = await closeCloudCash({
          cashId: store.cash.id,
          closingAmount,
          notes,
          expectedCash: store.cash.expected_cash,
        });
        if (!remote.ok) return remote;
      }
      setStore((prev) => ({
        ...prev,
        cash: {
          ...prev.cash,
          closed_at: new Date().toISOString(),
          closing_amount: closingAmount,
          notes: notes || null,
        },
        audits: pushAudit(
          prev.audits,
          user,
          "close_cash",
          "cash_session",
          prev.cash.id,
        ),
      }));
      return { ok: true, message: "Caja cerrada" };
    },
    [cloudMode, store.cash.closed_at, store.cash.expected_cash, store.cash.id, user],
  );

  const openCash = useCallback(
    async (openingFloat: number) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      if (cloudMode) {
        const remote = await openCloudCash({
          sucursalId,
          openingFloat,
          openedBy: user.id,
        });
        if (!remote.ok) return remote;
        setStore((prev) => ({
          ...prev,
          cash: remote.cash,
          audits: pushAudit(
            prev.audits,
            user,
            "open_cash_cloud",
            "cash_session",
            remote.cash.id,
          ),
        }));
        return { ok: true, message: "Caja cloud abierta" };
      }
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
      return { ok: true, message: "Caja abierta" };
    },
    [cloudMode, sucursalId, user],
  );

  const createPurchase = useCallback(
    (input: {
      proveedor_id: string;
      lines: PurchaseOrder["lines"];
      notes?: string;
    }) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      if (input.lines.length === 0) {
        return { ok: false, message: "Agrega al menos un insumo" };
      }
      const purchase: PurchaseOrder = {
        id: `po-${Date.now()}`,
        numero: `OC-${store.purchaseSeq}`,
        proveedor_id: input.proveedor_id,
        sucursal_id: sucursalId,
        status: "enviada",
        lines: input.lines,
        total: calcPurchaseTotal(input.lines),
        created_at: new Date().toISOString(),
        created_by: user.id,
        notes: input.notes || null,
      };
      setStore((prev) => ({
        ...prev,
        purchaseSeq: prev.purchaseSeq + 1,
        purchases: [purchase, ...prev.purchases],
        audits: pushAudit(
          prev.audits,
          user,
          "create_purchase",
          "compras",
          purchase.id,
        ),
      }));
      return { ok: true, message: `Orden ${purchase.numero} creada` };
    },
    [store.purchaseSeq, sucursalId, user],
  );

  const updatePurchaseStatus = useCallback(
    (purchaseId: string, status: PurchaseStatus) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      setStore((prev) => {
        const purchase = prev.purchases.find((p) => p.id === purchaseId);
        if (!purchase) return prev;
        let insumos = prev.insumos;
        let movements = prev.movements;
        if (status === "recibida" && purchase.status !== "recibida") {
          const now = new Date().toISOString();
          insumos = prev.insumos.map((insumo) => {
            const line = purchase.lines.find((l) => l.insumo_id === insumo.id);
            if (!line) return insumo;
            return {
              ...insumo,
              stock: Number((insumo.stock + line.cantidad).toFixed(3)),
              cost_unit: line.costo_unit,
            };
          });
          movements = [
            ...purchase.lines.map((line, idx) => ({
              id: `mov-po-${Date.now()}-${idx}`,
              insumo_id: line.insumo_id,
              tipo: "entrada" as const,
              cantidad: line.cantidad,
              motivo: `Recepción ${purchase.numero}`,
              referencia_id: purchase.id,
              created_by: user.id,
              created_at: now,
            })),
            ...prev.movements,
          ];
        }
        return {
          ...prev,
          insumos,
          movements,
          purchases: prev.purchases.map((p) =>
            p.id === purchaseId ? { ...p, status } : p,
          ),
          audits: pushAudit(
            prev.audits,
            user,
            `purchase_${status}`,
            "compras",
            purchaseId,
          ),
        };
      });
      return { ok: true, message: `Compra marcada como ${status}` };
    },
    [user],
  );

  const upsertProduct = useCallback(
    (product: Product) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      setStore((prev) => {
        const exists = prev.products.some((p) => p.id === product.id);
        return {
          ...prev,
          products: exists
            ? prev.products.map((p) => (p.id === product.id ? product : p))
            : [product, ...prev.products],
          audits: pushAudit(
            prev.audits,
            user,
            exists ? "update_product" : "create_product",
            "productos",
            product.id,
          ),
        };
      });
      return { ok: true, message: "Producto guardado" };
    },
    [user],
  );

  const toggleProductActive = useCallback(
    (productId: string) => {
      if (!user) return;
      setStore((prev) => ({
        ...prev,
        products: prev.products.map((p) =>
          p.id === productId ? { ...p, active: !p.active } : p,
        ),
        audits: pushAudit(
          prev.audits,
          user,
          "toggle_product",
          "productos",
          productId,
        ),
      }));
    },
    [user],
  );

  const clockIn = useCallback(
    (employeeId?: string) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      const target = employeeId ?? user.id;
      const open = store.attendance.find(
        (a) => a.employee_id === target && !a.clock_out,
      );
      if (open) return { ok: false, message: "Ya tiene un fichaje abierto" };
      const punch: AttendancePunch = {
        id: `att-${Date.now()}`,
        employee_id: target,
        sucursal_id: sucursalId,
        clock_in: new Date().toISOString(),
        clock_out: null,
      };
      setStore((prev) => ({
        ...prev,
        attendance: [punch, ...prev.attendance],
        audits: pushAudit(prev.audits, user, "clock_in", "asistencia", punch.id),
      }));
      return { ok: true, message: "Entrada registrada" };
    },
    [store.attendance, sucursalId, user],
  );

  const clockOut = useCallback(
    (employeeId?: string) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      const target = employeeId ?? user.id;
      const open = store.attendance.find(
        (a) => a.employee_id === target && !a.clock_out,
      );
      if (!open) return { ok: false, message: "No hay fichaje abierto" };
      setStore((prev) => ({
        ...prev,
        attendance: prev.attendance.map((a) =>
          a.id === open.id
            ? { ...a, clock_out: new Date().toISOString() }
            : a,
        ),
        audits: pushAudit(prev.audits, user, "clock_out", "asistencia", open.id),
      }));
      return { ok: true, message: "Salida registrada" };
    },
    [store.attendance, user],
  );

  const addShift = useCallback(
    (input: {
      employee_id: string;
      date: string;
      start: string;
      end: string;
      tipo: ShiftType;
      role: Role;
    }) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      const shift: Shift = {
        id: `sh-${Date.now()}`,
        employee_id: input.employee_id,
        sucursal_id: sucursalId,
        date: input.date,
        start: input.start,
        end: input.end,
        tipo: input.tipo,
        role: input.role,
      };
      setStore((prev) => ({
        ...prev,
        shifts: [shift, ...prev.shifts],
        audits: pushAudit(prev.audits, user, "add_shift", "turnos", shift.id),
      }));
      return { ok: true, message: "Turno programado" };
    },
    [sucursalId, user],
  );

  const upsertCustomer = useCallback(
    (input: { id?: string; name: string; phone: string; email: string }) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      const id = input.id ?? `cus-${Date.now()}`;
      setStore((prev) => {
        const exists = prev.customers.some((c) => c.id === id);
        const customer: Customer = exists
          ? {
              ...prev.customers.find((c) => c.id === id)!,
              name: input.name,
              phone: input.phone,
              email: input.email,
            }
          : {
              id,
              name: input.name,
              phone: input.phone,
              email: input.email,
              points: 0,
              visits: 0,
              created_at: new Date().toISOString(),
            };
        return {
          ...prev,
          customers: exists
            ? prev.customers.map((c) => (c.id === id ? customer : c))
            : [customer, ...prev.customers],
          audits: pushAudit(
            prev.audits,
            user,
            exists ? "update_customer" : "create_customer",
            "clientes",
            id,
          ),
        };
      });
      return { ok: true, message: "Cliente guardado" };
    },
    [user],
  );

  const upsertCoupon = useCallback(
    (coupon: Omit<Coupon, "id" | "uses"> & { id?: string }) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      const id = coupon.id ?? `cp-${Date.now()}`;
      setStore((prev) => {
        const exists = prev.coupons.some((c) => c.id === id);
        const next: Coupon = {
          id,
          code: coupon.code.toUpperCase(),
          type: coupon.type,
          value: coupon.value,
          active: coupon.active,
          min_ticket: coupon.min_ticket,
          uses: exists ? prev.coupons.find((c) => c.id === id)!.uses : 0,
          max_uses: coupon.max_uses,
        };
        return {
          ...prev,
          coupons: exists
            ? prev.coupons.map((c) => (c.id === id ? next : c))
            : [next, ...prev.coupons],
          audits: pushAudit(
            prev.audits,
            user,
            exists ? "update_coupon" : "create_coupon",
            "cupones",
            id,
          ),
        };
      });
      return { ok: true, message: "Cupón guardado" };
    },
    [user],
  );

  const createIncident = useCallback(
    async (input: {
      title: string;
      description: string;
      severity: IncidentSeverity;
    }) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      if (!input.title.trim()) {
        return { ok: false, message: "Título requerido" };
      }

      if (cloudMode) {
        const remote = await createCloudIncident({
          sucursalId,
          title: input.title.trim(),
          description: input.description.trim(),
          severity: input.severity,
          reportedBy: user.id,
        });
        if (!remote.ok) {
          // fallback local if PART3 not applied yet
          if (!remote.message.toLowerCase().includes("incidencias")) {
            return remote;
          }
        } else {
          setIncidents((prev) => [remote.incident, ...prev]);
          setStore((prev) => ({
            ...prev,
            audits: pushAudit(
              prev.audits,
              user,
              "create_incident",
              "incidencias",
              remote.incident.id,
            ),
          }));
          return { ok: true, message: "Incidencia registrada en la nube" };
        }
      }

      const incident: Incident = {
        id: `inc-${Date.now()}`,
        sucursal_id: sucursalId,
        title: input.title.trim(),
        description: input.description.trim(),
        severity: input.severity,
        status: "abierta",
        reported_by: user.id,
        assigned_to: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setIncidents((prev) => [incident, ...prev]);
      setStore((prev) => ({
        ...prev,
        audits: pushAudit(
          prev.audits,
          user,
          "create_incident",
          "incidencias",
          incident.id,
        ),
      }));
      return { ok: true, message: "Incidencia registrada" };
    },
    [cloudMode, sucursalId, user],
  );

  const updateIncidentStatus = useCallback(
    async (incidentId: string, status: IncidentStatus) => {
      if (!user) return { ok: false, message: "Sin sesión" };
      if (cloudMode && !incidentId.startsWith("inc-")) {
        const remote = await updateCloudIncidentStatus(incidentId, status);
        if (!remote.ok && !remote.message.toLowerCase().includes("incidencias")) {
          return remote;
        }
      }
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === incidentId
            ? { ...i, status, updated_at: new Date().toISOString() }
            : i,
        ),
      );
      setStore((prev) => ({
        ...prev,
        audits: pushAudit(
          prev.audits,
          user,
          `incident_${status}`,
          "incidencias",
          incidentId,
        ),
      }));
      return { ok: true, message: "Incidencia actualizada" };
    },
    [cloudMode, user],
  );

  const computeRecipeCost = useCallback(
    (recetaId: string) => {
      const lines = recetaIngredientes.filter((r) => r.receta_id === recetaId);
      return lines.reduce((sum, line) => {
        const insumo = store.insumos.find((i) => i.id === line.insumo_id);
        return sum + (insumo?.cost_unit ?? 0) * line.cantidad;
      }, 0);
    },
    [recetaIngredientes, store.insumos],
  );

  const alerts = useMemo(() => {
    const critical = store.insumos
      .filter((i) => i.sucursal_id === sucursalId && i.stock <= i.min_stock)
      .map((i) => i.name);
    const lateKitchenCount = store.orders.filter((o) => {
      if (o.sucursal_id !== sucursalId) return false;
      if (!["recibido", "en_preparacion"].includes(o.status)) return false;
      return nowMs - new Date(o.created_at).getTime() > 12 * 60_000;
    }).length;
    const openCriticalIncidents = incidents.filter(
      (i) =>
        i.sucursal_id === sucursalId &&
        ["abierta", "en_curso"].includes(i.status) &&
        ["alta", "critica"].includes(i.severity),
    ).length;
    const base = buildAlerts({
      cashClosed: Boolean(store.cash.closed_at),
      criticalStockNames: critical,
      lateKitchenCount,
    });
    if (openCriticalIncidents > 0) {
      base.unshift({
        id: "alert-incidents",
        level: "warn",
        title: "Incidencias abiertas",
        body: `${openCriticalIncidents} incidencia(s) alta/crítica sin cerrar`,
        href: "/incidencias",
        created_at: new Date().toISOString(),
        read: false,
      });
    }
    return base;
  }, [
    incidents,
    nowMs,
    store.cash.closed_at,
    store.insumos,
    store.orders,
    sucursalId,
  ]);

  const value = useMemo<DemoContextValue>(
    () => ({
      ready,
      user,
      cloudMode,
      syncStatus,
      sucursalId,
      cart,
      products: store.products ?? DEMO_PRODUCTS,
      insumos: store.insumos,
      orders: store.orders,
      movements: store.movements,
      cash: store.cash,
      audits: store.audits,
      purchases: store.purchases ?? [],
      mesas: store.mesas ?? DEMO_MESAS,
      shifts: store.shifts ?? [],
      attendance: store.attendance ?? [],
      customers: store.customers ?? DEMO_CUSTOMERS,
      coupons: store.coupons ?? DEMO_COUPONS,
      incidents,
      proveedores: DEMO_PROVEEDORES,
      alerts,
      lastTicket: store.lastTicket ?? null,
      categories,
      recetas,
      recetaIngredientes,
      sucursales,
      users: DEMO_USERS,
      login,
      loginAsProfile,
      logout,
      syncFromCloud,
      setSucursalId,
      addToCart,
      updateCartLine,
      removeFromCart,
      clearCart,
      clearLastTicket,
      checkout,
      updateOrderStatus,
      adjustInventory,
      closeCash,
      openCash,
      createPurchase,
      updatePurchaseStatus,
      upsertProduct,
      toggleProductActive,
      clockIn,
      clockOut,
      addShift,
      upsertCustomer,
      upsertCoupon,
      createIncident,
      updateIncidentStatus,
      previewDiscount,
      recipeCost: computeRecipeCost,
    }),
    [
      ready,
      user,
      cloudMode,
      syncStatus,
      sucursalId,
      cart,
      store,
      incidents,
      alerts,
      categories,
      recetas,
      recetaIngredientes,
      sucursales,
      login,
      loginAsProfile,
      logout,
      syncFromCloud,
      addToCart,
      updateCartLine,
      removeFromCart,
      clearCart,
      clearLastTicket,
      checkout,
      updateOrderStatus,
      adjustInventory,
      closeCash,
      openCash,
      createPurchase,
      updatePurchaseStatus,
      upsertProduct,
      toggleProductActive,
      clockIn,
      clockOut,
      addShift,
      upsertCustomer,
      upsertCoupon,
      createIncident,
      updateIncidentStatus,
      previewDiscount,
      computeRecipeCost,
    ],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo debe usarse dentro de DemoProvider");
  return ctx;
}
