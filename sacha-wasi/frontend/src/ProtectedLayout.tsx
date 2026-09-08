import { Navigate } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppShell } from './layout/AppShell'

export function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center bg-cream-50 text-forest-800 dark:bg-forest-950 dark:text-cream-50">
        Cargando Sacha Wasi…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}
