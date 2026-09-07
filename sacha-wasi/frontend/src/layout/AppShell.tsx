import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShoppingBag,
  CookingPot,
  UtensilsCrossed,
  Boxes,
  BookOpen,
  Warehouse,
  LogOut,
  Moon,
  Sun,
  Leaf,
  Armchair,
  Banknote,
  FileText,
  Users,
  Truck,
  CalendarDays,
  Bike,
  Receipt,
  BarChart3,
  Shield,
  Settings,
  UserCog,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, perm: null },
  { to: '/pos', label: 'POS', icon: ShoppingBag, perm: 'pos.sell' },
  { to: '/cocina', label: 'Cocina', icon: CookingPot, perm: 'kds.view' },
  { to: '/mesas', label: 'Mesas', icon: Armchair, perm: 'tables.view' },
  { to: '/caja', label: 'Caja', icon: Banknote, perm: 'cash.view' },
  { to: '/facturas', label: 'Facturas', icon: FileText, perm: 'fiscal.view' },
  { to: '/categorias', label: 'Categorías', icon: UtensilsCrossed, perm: 'catalog.categories.view' },
  { to: '/productos', label: 'Productos', icon: Boxes, perm: 'catalog.products.view' },
  { to: '/recetas', label: 'Recetas', icon: BookOpen, perm: 'catalog.recipes.view' },
  { to: '/inventario', label: 'Inventario', icon: Warehouse, perm: 'inventory.stock.view' },
  { to: '/compras', label: 'Compras', icon: Truck, perm: 'purchases.view' },
  { to: '/proveedores', label: 'Proveedores', icon: Boxes, perm: 'suppliers.view' },
  { to: '/clientes', label: 'Clientes', icon: Users, perm: 'customers.view' },
  { to: '/reservas', label: 'Reservas', icon: CalendarDays, perm: 'reservations.view' },
  { to: '/delivery', label: 'Delivery', icon: Bike, perm: 'delivery.view' },
  { to: '/gastos', label: 'Gastos', icon: Receipt, perm: 'expenses.view' },
  { to: '/reportes', label: 'Reportes', icon: BarChart3, perm: 'reports.view' },
  { to: '/auditoria', label: 'Auditoría', icon: Shield, perm: 'audit.view' },
  { to: '/usuarios', label: 'Usuarios', icon: UserCog, perm: 'users.manage' },
  { to: '/configuracion', label: 'Configuración', icon: Settings, perm: 'settings.view' },
]

const titles: Record<string, string> = {
  '/': 'Salud del negocio',
  '/pos': 'Punto de venta',
  '/cocina': 'Cocina · KDS',
  '/mesas': 'Plano de sala',
  '/caja': 'Caja y arqueo',
  '/facturas': 'Facturación SRI (simulador)',
  '/categorias': 'Categorías',
  '/productos': 'Catálogo de productos',
  '/recetas': 'Recetas y costeo',
  '/inventario': 'Inventario y kardex',
  '/compras': 'Órdenes de compra',
  '/proveedores': 'Proveedores',
  '/clientes': 'Clientes y fidelización',
  '/reservas': 'Reservas',
  '/delivery': 'Delivery interno',
  '/gastos': 'Gastos operativos',
  '/reportes': 'Reportes y utilidad',
  '/auditoria': 'Bitácora de auditoría',
  '/usuarios': 'Usuarios y roles',
  '/configuracion': 'Configuración',
}

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, setDark] = useState(() => localStorage.getItem('sw_theme') === 'dark')
  const perms = user?.permissions ?? []
  const fullBleed = location.pathname === '/pos' || location.pathname === '/cocina'

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('sw_theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <div className="min-h-svh bg-cream-50 text-ink-900 dark:bg-forest-950 dark:text-cream-50">
      <div className="flex min-h-svh">
        <aside className="hidden w-64 shrink-0 border-r border-cream-100 bg-forest-900 text-cream-50 md:flex md:flex-col">
          <div className="flex items-center gap-3 px-5 py-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-clay-600">
              <Leaf className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg leading-tight">Sacha Wasi</p>
              <p className="text-xs text-forest-100/70">ERP gastronómico</p>
            </div>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
            {nav
              .filter((item) => !item.perm || perms.includes(item.perm) || perms.includes('users.manage'))
              .map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                        isActive ? 'bg-forest-800 text-white' : 'text-forest-100/80 hover:bg-forest-800/60'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                )
              })}
          </nav>
          <div className="border-t border-white/10 p-4 text-xs text-forest-100/70">
            <p className="font-medium text-cream-50">{user?.name}</p>
            <p>{user?.current_branch?.name}</p>
            <p className="capitalize">{user?.roles?.[0]}</p>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-cream-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-forest-900/80">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-clay-600">Sacha Wasi · Ecuador</p>
              <h1 className="font-display text-xl">{titles[location.pathname] ?? 'Operación'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDark((v) => !v)}
                className="rounded-full border border-cream-100 p-2 dark:border-white/10"
                aria-label="Cambiar tema"
              >
                {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  navigate('/login')
                }}
                className="inline-flex items-center gap-1 rounded-full bg-forest-800 px-3 py-2 text-sm text-white"
              >
                <LogOut className="h-4 w-4" />
                Salir
              </button>
            </div>
          </header>
          <main className={fullBleed ? 'flex-1 overflow-auto p-0' : 'flex-1 p-4 md:p-6'}>
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
