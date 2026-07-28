export type Role =
  | "admin"
  | "supervisor"
  | "caja"
  | "cocina"
  | "inventario";

export type OrderStatus =
  | "recibido"
  | "en_preparacion"
  | "listo"
  | "entregado"
  | "cancelado";

export type OrderChannel = "mostrador" | "mesa" | "takeaway" | "delivery";

export type PaymentMethod = "efectivo" | "tarjeta" | "wallet";

export type MovementType = "entrada" | "salida" | "ajuste" | "merma" | "venta";

export interface Sucursal {
  id: string;
  name: string;
  address: string;
  timezone: string;
  active: boolean;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  sucursal_id: string | null;
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category_id: string;
  sucursal_id: string | null;
  active: boolean;
  prep_minutes: number;
}

export interface Insumo {
  id: string;
  name: string;
  sku: string;
  unit: string;
  cost_unit: number;
  stock: number;
  min_stock: number;
  sucursal_id: string;
  lot: string | null;
  expiry_date: string | null;
}

export interface Receta {
  id: string;
  producto_id: string;
  name: string;
  version: number;
  yield_portions: number;
  active: boolean;
  notes: string | null;
}

export interface RecetaIngrediente {
  id: string;
  receta_id: string;
  insumo_id: string;
  cantidad: number;
  unidad: string;
}

export interface OrderItem {
  id: string;
  producto_id: string;
  producto_name: string;
  qty: number;
  unit_price: number;
  notes: string | null;
  modifiers: string[];
}

export interface Order {
  id: string;
  numero: string;
  sucursal_id: string;
  channel: OrderChannel;
  status: OrderStatus;
  payment_method: PaymentMethod;
  total: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
  created_by: string;
  station_priority: number;
  estimated_ready_at: string | null;
}

export interface InventoryMovement {
  id: string;
  insumo_id: string;
  tipo: MovementType;
  cantidad: number;
  motivo: string;
  referencia_id: string | null;
  created_by: string;
  created_at: string;
}

export interface CashSession {
  id: string;
  sucursal_id: string;
  opened_by: string;
  opened_at: string;
  closed_at: string | null;
  opening_float: number;
  closing_amount: number | null;
  expected_cash: number;
  notes: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  role: Role;
  action: string;
  entity: string;
  entity_id: string | null;
  timestamp: string;
}

export type PurchaseStatus = "borrador" | "enviada" | "recibida" | "cancelada";

export interface Proveedor {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
}

export interface PurchaseLine {
  insumo_id: string;
  cantidad: number;
  costo_unit: number;
}

export interface PurchaseOrder {
  id: string;
  numero: string;
  proveedor_id: string;
  sucursal_id: string;
  status: PurchaseStatus;
  lines: PurchaseLine[];
  total: number;
  created_at: string;
  created_by: string;
  notes: string | null;
}

export type AlertLevel = "info" | "warn" | "critical";

export interface AppAlert {
  id: string;
  level: AlertLevel;
  title: string;
  body: string;
  href?: string;
  created_at: string;
  read: boolean;
}

export interface Mesa {
  id: string;
  label: string;
  seats: number;
  status: "libre" | "ocupada";
}
