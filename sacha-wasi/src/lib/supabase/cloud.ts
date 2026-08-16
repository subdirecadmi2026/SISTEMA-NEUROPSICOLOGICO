import { createClient } from "@/lib/supabase/client";
import type {
  CashSession,
  Category,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Insumo,
  Order,
  OrderChannel,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Product,
  Receta,
  RecetaIngrediente,
  Sucursal,
} from "@/types";

export type CloudSnapshot = {
  sucursales: Sucursal[];
  categories: Category[];
  products: Product[];
  insumos: Insumo[];
  recetas: Receta[];
  recetaIngredientes: RecetaIngrediente[];
  orders: Order[];
  cash: CashSession | null;
  incidents: Incident[];
};

function mapSucursal(row: Record<string, unknown>): Sucursal {
  return {
    id: String(row.id),
    name: String(row.name),
    address: String(row.address ?? ""),
    timezone: String(row.timezone ?? "America/Lima"),
    active: Boolean(row.active ?? true),
  };
}

function mapCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    sort_order: Number(row.sort_order ?? 0),
  };
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    price: Number(row.price),
    category_id: String(row.category_id ?? ""),
    sucursal_id: row.sucursal_id ? String(row.sucursal_id) : null,
    active: Boolean(row.active ?? true),
    prep_minutes: Number(row.prep_minutes ?? 10),
  };
}

function mapInsumo(row: Record<string, unknown>): Insumo {
  return {
    id: String(row.id),
    name: String(row.name),
    sku: String(row.sku),
    unit: String(row.unit),
    cost_unit: Number(row.cost_unit ?? 0),
    stock: Number(row.stock ?? 0),
    min_stock: Number(row.min_stock ?? 0),
    sucursal_id: String(row.sucursal_id),
    lot: row.lot ? String(row.lot) : null,
    expiry_date: row.expiry_date ? String(row.expiry_date) : null,
  };
}

function mapReceta(row: Record<string, unknown>): Receta {
  return {
    id: String(row.id),
    producto_id: String(row.producto_id),
    name: String(row.name),
    version: Number(row.version ?? 1),
    yield_portions: Number(row.yield_portions ?? 1),
    active: Boolean(row.active ?? true),
    notes: row.notes ? String(row.notes) : null,
  };
}

function mapIngrediente(row: Record<string, unknown>): RecetaIngrediente {
  return {
    id: String(row.id),
    receta_id: String(row.receta_id),
    insumo_id: String(row.insumo_id),
    cantidad: Number(row.cantidad),
    unidad: String(row.unidad),
  };
}

function mapOrderItem(row: Record<string, unknown>): OrderItem {
  const modifiers = Array.isArray(row.modifiers)
    ? (row.modifiers as unknown[]).map(String)
    : [];
  return {
    id: String(row.id),
    producto_id: String(row.producto_id),
    producto_name: String(row.producto_name),
    qty: Number(row.qty),
    unit_price: Number(row.unit_price),
    notes: row.notes ? String(row.notes) : null,
    modifiers,
  };
}

function mapOrder(
  row: Record<string, unknown>,
  items: OrderItem[] = [],
): Order {
  const total = Number(row.total ?? 0);
  return {
    id: String(row.id),
    numero: String(row.numero),
    sucursal_id: String(row.sucursal_id),
    channel: row.channel as OrderChannel,
    status: row.status as OrderStatus,
    payment_method: row.payment_method as PaymentMethod,
    total,
    subtotal: Number(row.subtotal ?? total),
    discount: Number(row.discount ?? 0),
    coupon_code: row.coupon_code ? String(row.coupon_code) : null,
    customer_id: row.customer_id ? String(row.customer_id) : null,
    items,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    created_by: String(row.created_by ?? ""),
    station_priority: Number(row.station_priority ?? 0),
    estimated_ready_at: row.estimated_ready_at
      ? String(row.estimated_ready_at)
      : null,
  };
}

function mapCash(row: Record<string, unknown>): CashSession {
  return {
    id: String(row.id),
    sucursal_id: String(row.sucursal_id),
    opened_by: String(row.opened_by ?? ""),
    opened_at: String(row.opened_at),
    closed_at: row.closed_at ? String(row.closed_at) : null,
    opening_float: Number(row.opening_float ?? 0),
    closing_amount:
      row.closing_amount == null ? null : Number(row.closing_amount),
    expected_cash: Number(row.expected_cash ?? 0),
    notes: row.notes ? String(row.notes) : null,
  };
}

function mapIncident(row: Record<string, unknown>): Incident {
  return {
    id: String(row.id),
    sucursal_id: String(row.sucursal_id),
    title: String(row.title),
    description: String(row.description ?? ""),
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    reported_by: String(row.reported_by ?? ""),
    assigned_to: row.assigned_to ? String(row.assigned_to) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  };
}

export async function fetchCloudSnapshot(
  sucursalId?: string | null,
): Promise<CloudSnapshot | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const [
    sucursalesRes,
    categoriesRes,
    productosRes,
    insumosRes,
    recetasRes,
    ingredientesRes,
    incidentsRes,
  ] = await Promise.all([
    supabase.from("sucursales").select("*").order("name"),
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("productos").select("*").eq("active", true).order("name"),
    supabase.from("insumos").select("*").order("name"),
    supabase.from("recetas").select("*").eq("active", true),
    supabase.from("receta_ingredientes").select("*"),
    supabase
      .from("incidencias")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (
    sucursalesRes.error ||
    categoriesRes.error ||
    productosRes.error ||
    insumosRes.error
  ) {
    return null;
  }

  const targetSucursal =
    sucursalId ||
    (sucursalesRes.data?.[0] ? String(sucursalesRes.data[0].id) : null);

  let orders: Order[] = [];
  let cash: CashSession | null = null;

  if (targetSucursal) {
    const [ordersRes, itemsRes, cashRes] = await Promise.all([
      supabase
        .from("ordenes")
        .select("*")
        .eq("sucursal_id", targetSucursal)
        .in("status", ["recibido", "en_preparacion", "listo", "entregado"])
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("orden_items")
        .select("*")
        .limit(500),
      supabase
        .from("cash_sessions")
        .select("*")
        .eq("sucursal_id", targetSucursal)
        .is("closed_at", null)
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const itemsByOrder = new Map<string, OrderItem[]>();
    for (const row of itemsRes.data ?? []) {
      const mapped = mapOrderItem(row as Record<string, unknown>);
      const ordenId = String((row as { orden_id: string }).orden_id);
      const list = itemsByOrder.get(ordenId) ?? [];
      list.push(mapped);
      itemsByOrder.set(ordenId, list);
    }

    orders = (ordersRes.data ?? []).map((row) => {
      const id = String((row as { id: string }).id);
      return mapOrder(row as Record<string, unknown>, itemsByOrder.get(id) ?? []);
    });

    if (cashRes.data) {
      cash = mapCash(cashRes.data as Record<string, unknown>);
    }
  }

  return {
    sucursales: (sucursalesRes.data ?? []).map((r) =>
      mapSucursal(r as Record<string, unknown>),
    ),
    categories: (categoriesRes.data ?? []).map((r) =>
      mapCategory(r as Record<string, unknown>),
    ),
    products: (productosRes.data ?? []).map((r) =>
      mapProduct(r as Record<string, unknown>),
    ),
    insumos: (insumosRes.data ?? []).map((r) =>
      mapInsumo(r as Record<string, unknown>),
    ),
    recetas: (recetasRes.data ?? []).map((r) =>
      mapReceta(r as Record<string, unknown>),
    ),
    recetaIngredientes: (ingredientesRes.data ?? []).map((r) =>
      mapIngrediente(r as Record<string, unknown>),
    ),
    orders,
    cash,
    incidents: incidentsRes.error
      ? []
      : (incidentsRes.data ?? []).map((r) =>
          mapIncident(r as Record<string, unknown>),
        ),
  };
}

export async function createCloudOrder(input: {
  sucursalId: string;
  channel: OrderChannel;
  payment: PaymentMethod;
  items: Array<{
    producto_id: string;
    qty: number;
    notes?: string | null;
    modifiers?: string[];
  }>;
}): Promise<{ ok: true; order: Order } | { ok: false; message: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, message: "Supabase no configurado" };

  const payload = input.items.map((item) => ({
    producto_id: item.producto_id,
    qty: item.qty,
    notes: item.notes ?? "",
    modifiers: item.modifiers ?? [],
  }));

  const { data, error } = await supabase.rpc("create_order_with_inventory", {
    p_sucursal_id: input.sucursalId,
    p_channel: input.channel,
    p_payment: input.payment,
    p_items: payload,
  });

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "No se pudo crear la orden en la nube",
    };
  }

  const orderRow = data as Record<string, unknown>;
  const { data: itemsData } = await supabase
    .from("orden_items")
    .select("*")
    .eq("orden_id", orderRow.id);

  const items = (itemsData ?? []).map((r) =>
    mapOrderItem(r as Record<string, unknown>),
  );

  return { ok: true, order: mapOrder(orderRow, items) };
}

export async function updateCloudOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, message: "Supabase no configurado" };

  const { error } = await supabase
    .from("ordenes")
    .update({ status })
    .eq("id", orderId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: `Estado → ${status}` };
}

export async function openCloudCash(input: {
  sucursalId: string;
  openingFloat: number;
  openedBy: string;
}): Promise<{ ok: true; cash: CashSession } | { ok: false; message: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, message: "Supabase no configurado" };

  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      sucursal_id: input.sucursalId,
      opened_by: input.openedBy,
      opening_float: input.openingFloat,
      expected_cash: input.openingFloat,
    })
    .select("*")
    .single();

  if (error || !data) {
    return { ok: false, message: error?.message ?? "No se pudo abrir caja" };
  }

  return { ok: true, cash: mapCash(data as Record<string, unknown>) };
}

export async function closeCloudCash(input: {
  cashId: string;
  closingAmount: number;
  notes: string;
  expectedCash: number;
}): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, message: "Supabase no configurado" };

  const { error } = await supabase
    .from("cash_sessions")
    .update({
      closed_at: new Date().toISOString(),
      closing_amount: input.closingAmount,
      expected_cash: input.expectedCash,
      notes: input.notes || null,
    })
    .eq("id", input.cashId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Caja cerrada en la nube" };
}

export async function bumpCloudCashExpected(
  cashId: string,
  expectedCash: number,
): Promise<void> {
  const supabase = createClient();
  if (!supabase) return;
  await supabase
    .from("cash_sessions")
    .update({ expected_cash: expectedCash })
    .eq("id", cashId);
}

export async function createCloudIncident(input: {
  sucursalId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  reportedBy: string;
}): Promise<{ ok: true; incident: Incident } | { ok: false; message: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, message: "Supabase no configurado" };

  const { data, error } = await supabase
    .from("incidencias")
    .insert({
      sucursal_id: input.sucursalId,
      title: input.title,
      description: input.description,
      severity: input.severity,
      status: "abierta",
      reported_by: input.reportedBy,
    })
    .select("*")
    .single();

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? "No se pudo registrar la incidencia",
    };
  }

  return { ok: true, incident: mapIncident(data as Record<string, unknown>) };
}

export async function updateCloudIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
): Promise<{ ok: boolean; message: string }> {
  const supabase = createClient();
  if (!supabase) return { ok: false, message: "Supabase no configurado" };

  const { error } = await supabase
    .from("incidencias")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", incidentId);

  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Incidencia actualizada" };
}

export function subscribeKitchenOrders(
  sucursalId: string,
  onChange: () => void,
): () => void {
  const supabase = createClient();
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`kds-${sucursalId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "ordenes",
        filter: `sucursal_id=eq.${sucursalId}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
