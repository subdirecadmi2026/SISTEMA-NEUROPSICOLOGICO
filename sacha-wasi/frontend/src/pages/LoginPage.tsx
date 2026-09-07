import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Leaf } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export function LoginPage() {
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState('admin@sachawasi.ec')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  if (!loading && user) return <Navigate to="/" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-svh bg-forest-900 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80"
          alt="Cocina andina"
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/40 to-transparent" />
        <div className="absolute bottom-10 left-10 right-10 text-cream-50">
          <p className="text-sm uppercase tracking-[0.3em] text-clay-500">Quito · Ecuador</p>
          <h1 className="font-display mt-3 text-5xl">Sacha Wasi</h1>
          <p className="mt-3 max-w-md text-forest-100">
            Del insumo al plato, de la receta a la utilidad real. Un ERP gastronómico pensado para
            la sierra y listo para crecer a LatAm.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col justify-center bg-cream-50 px-8 py-12 dark:bg-forest-950">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-800 text-white">
              <Leaf />
            </div>
            <div>
              <p className="font-display text-2xl">Bienvenida</p>
              <p className="text-sm text-ink-500">Ingresa al núcleo operativo</p>
            </div>
          </div>
          <label className="block text-sm">
            Correo
            <input
              className="mt-1 w-full rounded-xl border border-cream-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-forest-900"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm">
            Contraseña
            <input
              className="mt-1 w-full rounded-xl border border-cream-100 bg-white px-3 py-2 dark:border-white/10 dark:bg-forest-900"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-clay-600">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="mt-6 w-full rounded-xl bg-forest-800 py-3 font-medium text-white disabled:opacity-60"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="mt-4 text-xs text-ink-500">
            Demo: admin@sachawasi.ec / password · también bodega@sachawasi.ec y mesero@sachawasi.ec
          </p>
        </div>
      </form>
    </div>
  )
}
