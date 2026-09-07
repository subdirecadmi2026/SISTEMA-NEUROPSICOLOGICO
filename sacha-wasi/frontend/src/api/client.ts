import type { User } from './types'

const TOKEN_KEY = 'sacha_wasi_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`/api/v1${path}`, { ...init, headers })
  if (response.status === 204) return undefined as T
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errors = (data as { errors?: Record<string, string[]> }).errors
    const firstError = errors ? Object.values(errors)[0]?.[0] : undefined
    const message = (data as { message?: string }).message || firstError || 'Error de servidor'
    throw new Error(message)
  }
  return data as T
}

type LookupLike = { id: string; name: string; symbol?: string; code?: string }

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, device_name: 'web' }),
    }),
  me: () => request<User>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  dashboard: () => request<Record<string, unknown>>('/dashboard'),
  lookups: () =>
    request<{
      units: LookupLike[]
      warehouses: LookupLike[]
      tax_rates: LookupLike[]
      categories: LookupLike[]
      cash_registers: Array<{ id: string; name: string; code: string; open_session?: { id: string } | null }>
      tables: Array<{ id: string; name: string; code: string; status: string }>
      customers: Array<{ id: string; name: string; phone?: string; points: number }>
    }>('/lookups'),
  categories: () => request<import('./types').Category[]>('/categories'),
  createCategory: (body: object) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  products: (params = '') => request<{ data: import('./types').Product[] }>(`/products${params}`),
  createProduct: (body: object) => request<import('./types').Product>('/products', { method: 'POST', body: JSON.stringify(body) }),
  uploadProductImage: (id: string, file: File) => {
    const body = new FormData()
    body.append('image', file)
    return request<import('./types').Product>(`/products/${id}/image`, { method: 'POST', body })
  },
  recipes: () => request<import('./types').Recipe[]>('/recipes'),
  createRecipe: (body: object) => request('/recipes', { method: 'POST', body: JSON.stringify(body) }),
  productCost: (id: string) => request<Record<string, unknown>>(`/products/${id}/cost`),
  explode: (id: string, quantity: string) =>
    request<Record<string, unknown>>(`/products/${id}/explode?quantity=${quantity}`),
  stock: (low = false) => request<import('./types').StockItem[]>(`/inventory/stock${low ? '?low_stock=1' : ''}`),
  kardex: () => request<{ data: import('./types').StockMovement[] }>('/inventory/kardex'),
  receive: (body: object) => request('/inventory/receive', { method: 'POST', body: JSON.stringify(body) }),
  adjust: (body: object) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(body) }),
  orders: (params = '') => request<{ data: Record<string, unknown>[] }>(`/orders${params}`),
  createOrder: (body: object) => request<Record<string, unknown>>('/orders', { method: 'POST', body: JSON.stringify(body) }),
  addOrderItem: (orderId: string, body: object) =>
    request<Record<string, unknown>>(`/orders/${orderId}/items`, { method: 'POST', body: JSON.stringify(body) }),
  sendToKitchen: (orderId: string) =>
    request<Record<string, unknown>>(`/orders/${orderId}/send-to-kitchen`, { method: 'POST' }),
  payOrder: (orderId: string, body: object) =>
    request<Record<string, unknown>>(`/orders/${orderId}/pay`, { method: 'POST', body: JSON.stringify(body) }),
  quickSale: (body: object) =>
    request<Record<string, unknown>>('/orders/quick-sale', { method: 'POST', body: JSON.stringify(body) }),
  voidOrder: (orderId: string, reason: string) =>
    request(`/orders/${orderId}/void`, { method: 'POST', body: JSON.stringify({ reason }) }),
  kitchenTickets: () => request<Record<string, unknown>[]>('/kitchen/tickets'),
  advanceKitchen: (itemId: string, status: string) =>
    request(`/kitchen/items/${itemId}/advance`, { method: 'POST', body: JSON.stringify({ status }) }),
  tables: () => request<Record<string, unknown>[]>('/tables'),
  cashRegisters: () => request<Record<string, unknown>[]>('/cash/registers'),
  cashCurrent: () => request<Record<string, unknown> | null>('/cash/current'),
  cashOpen: (body: object) => request('/cash/open', { method: 'POST', body: JSON.stringify(body) }),
  cashMove: (sessionId: string, body: object) =>
    request(`/cash/sessions/${sessionId}/move`, { method: 'POST', body: JSON.stringify(body) }),
  cashClose: (sessionId: string, body: object) =>
    request(`/cash/sessions/${sessionId}/close`, { method: 'POST', body: JSON.stringify(body) }),
  invoices: () => request<{ data: Record<string, unknown>[] }>('/fiscal-documents'),
  invoice: (id: string) => request<Record<string, unknown>>(`/fiscal-documents/${id}`),
  retryInvoice: (id: string) => request(`/fiscal-documents/${id}/retry`, { method: 'POST' }),
  customers: (search = '') =>
    request<{ data: Record<string, unknown>[] }>(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createCustomer: (body: object) => request('/customers', { method: 'POST', body: JSON.stringify(body) }),
  suppliers: () => request<Record<string, unknown>[]>('/suppliers'),
  createSupplier: (body: object) => request('/suppliers', { method: 'POST', body: JSON.stringify(body) }),
  purchases: () => request<{ data: Record<string, unknown>[] }>('/purchases'),
  createPurchase: (body: object) => request('/purchases', { method: 'POST', body: JSON.stringify(body) }),
  approvePurchase: (id: string) => request(`/purchases/${id}/approve`, { method: 'POST' }),
  receivePurchase: (id: string) => request(`/purchases/${id}/receive`, { method: 'POST' }),
  reservations: () => request<Record<string, unknown>[]>('/reservations'),
  createReservation: (body: object) => request('/reservations', { method: 'POST', body: JSON.stringify(body) }),
  updateReservation: (id: string, status: string) =>
    request(`/reservations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  delivery: () => request<Record<string, unknown>>('/delivery'),
  assignDelivery: (orderId: string, body: object) =>
    request(`/delivery/${orderId}/assign`, { method: 'POST', body: JSON.stringify(body) }),
  expenses: () => request<Record<string, unknown>[]>('/expenses'),
  createExpense: (body: object) => request('/expenses', { method: 'POST', body: JSON.stringify(body) }),
  reports: () => request<Record<string, unknown>>('/reports'),
  audit: () => request<{ data: Record<string, unknown>[] }>('/audit'),
  users: () => request<Record<string, unknown>[]>('/users'),
  createUser: (body: object) => request('/users', { method: 'POST', body: JSON.stringify(body) }),
  roles: () => request<Record<string, unknown>[]>('/roles'),
  settings: () => request<Record<string, unknown>>('/settings'),
  updateSettings: (body: object) => request('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  publicMenu: (token: string) => request<Record<string, unknown>>(`/public/menu/${token}`),
  publicOrder: (token: string, body: object) =>
    request(`/public/menu/${token}/orders`, { method: 'POST', body: JSON.stringify(body) }),
}

export const POS_QUEUE_KEY = 'sw_pos_offline_queue'

export function enqueueOfflineSale(payload: object): void {
  const current = JSON.parse(localStorage.getItem(POS_QUEUE_KEY) || '[]') as object[]
  current.push(payload)
  localStorage.setItem(POS_QUEUE_KEY, JSON.stringify(current))
}

export function peekOfflineSales(): object[] {
  return JSON.parse(localStorage.getItem(POS_QUEUE_KEY) || '[]') as object[]
}

export function clearOfflineSales(): void {
  localStorage.removeItem(POS_QUEUE_KEY)
}
