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
  Menu,
  X,
} from 'lucide-react'
import { useEffect, useState, type ComponentType } from 'react'
import { useAuth } from '../auth/AuthContext'
import { BrandWordmark } from '../brand/BrandMark'

type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; perm: string | null }
type NavGroup = { label: string; items: NavItem[] }

const groups: NavGroup[] = [
  {
    label: 'Sala',
    items: [
      { to: '/', label: 'Inicio', icon: LayoutDashboard, perm: null },
      { to: '/pos', label: 'Punto de venta', icon: ShoppingBag, perm: 'pos.sell' },
      { to: '/cocina', label: 'Cocina', icon: CookingPot, perm: 'kds.view' },
      { to: '/mesas', label: 'Mesas', icon: Armchair, perm: 'tables.view' },
      { to: '/caja', label: 'Caja', icon: Banknote, perm: 'cash.view' },
      { to: '/reservas', label: 'Reservas', icon: CalendarDays, perm: 'reservations.view' },
      { to: '/delivery', label: 'Delivery', icon: Bike, perm: 'delivery.view' },
    ],
  },
  {
    label: 'Carta',
    items: [
      { to: '/categorias', label: 'Categorías', icon: UtensilsCrossed, perm: 'catalog.categories.view' },
      { to: '/productos', label: 'Productos', icon: Boxes, perm: 'catalog.products.view' },
      { to: '/recetas', label: 'Recetas', icon: BookOpen, perm: 'catalog.recipes.view' },
    ],
  },
  {
    label: 'Bodega',
    items: [
      { to: '/inventario', label: 'Inventario', icon: Warehouse, perm: 'inventory.stock.view' },
      { to: '/compras', label: 'Compras', icon: Truck, perm: 'purchases.view' },
      { to: '/proveedores', label: 'Proveedores', icon: Boxes, perm: 'suppliers.view' },
    ],
  },
  {
    label: 'Oficina',
    items: [
      { to: '/facturas', label: 'Facturas SRI', icon: FileText, perm: 'fiscal.view' },
      { to: '/clientes', label: 'Clientes', icon: Users, perm: 'customers.view' },
      { to: '/gastos', label: 'Gastos', icon: Receipt, perm: 'expenses.view' },
      { to: '/reportes', label: 'Reportes', icon: BarChart3, perm: 'reports.view' },
      { to: '/auditoria', label: 'Auditoría', icon: Shield, perm: 'audit.view' },
      { to: '/usuarios', label: 'Usuarios', icon: UserCog, perm: 'users.manage' },
      { to: '/configuracion', label: 'Configuración', icon: Settings, perm: 'settings.view' },
    ],
  },
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

function canSee(perms: string[], perm: string | null): boolean {
  if (!perm) return true
  return perms.includes(perm) || perms.includes('users.manage')
}

function SidebarNav({
  perms,
  onNavigate,
}: {
  perms: string[]
  onNavigate?: () => void
}) {
  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
      {groups.map((group) => {
        const items = group.items.filter((item) => canSee(perms, item.perm))
        if (items.length === 0) return null
        return (
          <div key={group.label}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-copper-400/80">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-2 border-l-2 px-3 py-2 text-sm transition ${
                        isActive
                          ? 'border-copper-400 bg-white/5 text-cream-50'
                          : 'border-transparent text-cream-100/70 hover:bg-white/5 hover:text-cream-50'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

export function AppShell() {
  const { user, logout, switchBranch } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const perms = user?.permissions ?? []
  const fullBleed = location.pathname === '/pos' || location.pathname === '/cocina'
  const branches = user?.branches ?? []

  useEffect(() => {
    document.documentElement.classList.add('dark')
  }, [])

  const brand = (
    <div className="px-5 py-6">
      <BrandWordmark subtitle="Floresta · ERP" />
    </div>
  )

  const footer = (
    <div className="space-y-3 border-t border-white/10 p-4 text-xs text-cream-100/70">
      <p className="font-medium text-cream-50">{user?.name}</p>
      <p className="capitalize">{user?.roles?.[0]}</p>
      {branches.length > 1 ? (
        <label className="block">
          Sucursal
          <select
            className="mt-1 w-full rounded-lg border border-white/15 bg-forest-900 px-2 py-1.5 text-cream-50"
            value={user?.current_branch?.id ?? ''}
            onChange={async (e) => {
              await switchBranch(e.target.value)
              window.location.reload()
            }}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p>{user?.current_branch?.name}</p>
      )}
    </div>
  )

  return (
    <div className="min-h-svh bg-forest-950 text-cream-50">
      <div className="flex min-h-svh">
        <aside className="hidden w-[17.5rem] shrink-0 flex-col border-r border-copper-400/20 bg-forest-950 text-cream-50 md:flex">
          {brand}
          <SidebarNav perms={perms} />
          {footer}
        </aside>

        {open ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button type="button" className="absolute inset-0 bg-forest-950/55" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
            <aside className="relative flex h-full w-72 max-w-[86vw] flex-col border-r border-copper-400/20 bg-forest-950 text-cream-50 shadow-2xl">
              <button type="button" className="absolute right-3 top-4 rounded-lg p-1 text-cream-100/70" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
              {brand}
              <SidebarNav perms={perms} onNavigate={() => setOpen(false)} />
              {footer}
            </aside>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-copper-400/20 bg-forest-900 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-copper-400/30 bg-forest-800 p-2 text-cream-50 md:hidden"
                onClick={() => setOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-copper-400">
                  {user?.company?.trade_name ?? 'Sacha Wasi'} · {user?.current_branch?.city ?? 'Ecuador'}
                </p>
                <h1 className="font-display text-xl">
                  {titles[location.pathname]
                    ?? (location.pathname.includes('/imprimir') ? 'Imprimir factura' : 'Operación')}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  navigate('/login')
                }}
                className="inline-flex items-center gap-1 rounded-full border border-copper-400/30 bg-forest-800 px-3 py-2 text-sm text-cream-50"
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
