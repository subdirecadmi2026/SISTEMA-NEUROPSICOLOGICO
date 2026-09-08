export type User = {
  id: string
  name: string
  email: string
  roles: string[]
  permissions: string[]
  company?: { id: string; name: string; trade_name?: string; city?: string }
  current_branch?: { id: string; name: string; city?: string }
  branches?: { id: string; name: string }[]
}

export type Category = {
  id: string
  name: string
  color?: string | null
  sort_order: number
  is_active: boolean
  show_on_pos: boolean
  products_count?: number
  children?: Category[]
  products?: Product[]
}

export type Product = {
  id: string
  name: string
  sku: string
  type: string
  status: string
  inventory_behavior: string
  default_cost: string
  default_price: string
  is_sellable: boolean
  is_purchasable: boolean
  description?: string | null
  prep_time_minutes?: number | null
  allergens?: string[] | null
  image_path?: string | null
  image_url?: string | null
  category?: { id: string; name: string } | null
  base_unit?: { id: string; symbol: string; name: string } | null
  active_recipe?: { id: string } | null
}

export type Recipe = {
  id: string
  name: string
  version: number
  yield_quantity: string
  process_waste_percent: string
  cached_unit_cost?: string | null
  is_active: boolean
  product?: Product
  yield_unit?: { symbol: string }
  items: {
    id: string
    quantity: string
    waste_percent: string
    component?: Product
    unit?: { symbol: string }
  }[]
}

export type StockItem = {
  id: string
  product_id: string
  qty_on_hand: string
  min_qty: string
  avg_cost: string
  product?: Product
  warehouse?: { id: string; name: string }
}

export type StockMovement = {
  id: string
  type: string
  direction: string
  quantity: string
  unit_cost: string
  balance_after: string
  occurred_at: string
  notes?: string | null
  product?: Product
  warehouse?: { name: string }
  lot?: { lot_code: string; expires_at?: string | null } | null
}

export type LookupUnit = { id: string; name: string; symbol: string; dimension: string }
export type Warehouse = { id: string; name: string; code: string }
