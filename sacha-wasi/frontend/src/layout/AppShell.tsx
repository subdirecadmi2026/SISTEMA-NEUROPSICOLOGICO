import { NavLink, Outlet, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const nav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { to: '/pos', label: 'POS', icon: ShoppingBag, enabled: false },
  { to: '/cocina', label: 'Cocina', icon: CookingPot, enabled: false },
  { to: '/categorias', label: 'Categorías', icon: UtensilsCrossed, enabled: true },
  { to: '/productos', label: 'Productos', icon: Boxes, enabled: true },
  { to: '/recetas', label: 'Recetas', icon: BookOpen, enabled: true },
  { to: '/inventario', label: 'Inventario', icon: Warehouse, enabled: true },
]

export function AppShell() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useState(() => localStorage.getItem('sw_theme') === 'dark')

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
          <nav className="flex-1 space-y-1 px-3">
            {nav.map((item) => {
              const Icon = item.icon
              if (!item.enabled) {
                return (
                  <span
                    key={item.to}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-forest-100/40"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide">Fase 2+</span>
                  </span>
                )
              }
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
              <p className="text-xs uppercase tracking-[0.2em] text-clay-600">Fase 1 · Catálogo</p>
              <h1 className="font-display text-xl">Productos, recetas e inventario</h1>
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
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
