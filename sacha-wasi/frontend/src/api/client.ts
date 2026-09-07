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

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, device_name: 'web' }),
    }),
  me: () => request<User>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
  dashboard: () => request<Record<string, unknown>>('/dashboard'),
  lookups: () => request<{ units: LookupLike[]; warehouses: LookupLike[]; tax_rates: LookupLike[]; categories: LookupLike[] }>('/lookups'),
  categories: () => request<import('./types').Category[]>('/categories'),
  createCategory: (body: object) => request('/categories', { method: 'POST', body: JSON.stringify(body) }),
  products: (params = '') => request<{ data: import('./types').Product[] }>(`/products${params}`),
  createProduct: (body: object) => request('/products', { method: 'POST', body: JSON.stringify(body) }),
  recipes: () => request<import('./types').Recipe[]>('/recipes'),
  createRecipe: (body: object) => request('/recipes', { method: 'POST', body: JSON.stringify(body) }),
  productCost: (id: string) => request<Record<string, unknown>>(`/products/${id}/cost`),
  explode: (id: string, quantity: string) =>
    request<Record<string, unknown>>(`/products/${id}/explode?quantity=${quantity}`),
  stock: (low = false) => request<import('./types').StockItem[]>(`/inventory/stock${low ? '?low_stock=1' : ''}`),
  kardex: () => request<{ data: import('./types').StockMovement[] }>('/inventory/kardex'),
  receive: (body: object) => request('/inventory/receive', { method: 'POST', body: JSON.stringify(body) }),
  adjust: (body: object) => request('/inventory/adjust', { method: 'POST', body: JSON.stringify(body) }),
}

type LookupLike = { id: string; name: string; symbol?: string; code?: string }
