import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandWordmark } from '../brand/BrandMark'

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
    <div className="grid min-h-svh bg-forest-950 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img
          src="https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1600&q=80"
          alt="Cocina andina"
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-900/50 to-forest-800/20" />
        <div className="absolute bottom-10 left-10 right-10 text-cream-50">
          <p className="text-sm uppercase tracking-[0.3em] text-copper-400">Quito · Ecuador</p>
          <h1 className="font-display mt-3 text-5xl">Casa de selva</h1>
          <p className="mt-3 max-w-md text-cream-100/90">
            Del insumo al plato, de la receta a la utilidad real. Un ERP gastronómico rústico,
            pensado para la sierra y listo para crecer.
          </p>
        </div>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col justify-center bg-cream-50 px-8 py-12 dark:bg-forest-950">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8">
            <BrandWordmark tone="onLight" subtitle="Núcleo operativo" />
          </div>
          <label className="block text-sm text-ink-700">
            Correo
            <input
              className="sw-input mt-1"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="mt-4 block text-sm text-ink-700">
            Contraseña
            <input
              className="sw-input mt-1"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error ? <p className="mt-3 text-sm text-clay-600">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className="sw-btn mt-6 w-full rounded-xl py-3 font-medium disabled:opacity-60"
          >
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
          <p className="mt-4 text-xs text-ink-500">
            Demo: admin@sachawasi.ec / password · cajero@, cocina@, mesero@, bodega@
          </p>
        </div>
      </form>
    </div>
  )
}
