import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { BrandMark } from '../brand/BrandMark'

export function LoginPage() {
  const { user, login, loading } = useAuth()
  const [email, setEmail] = useState('admin@sachawasi.ec')
  const [password, setPassword] = useState('password')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    document.documentElement.classList.remove('dark')
  }, [])

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
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-forest-950 px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(196,165,116,0.16), transparent 32%), radial-gradient(circle at 80% 80%, rgba(45,107,82,0.28), transparent 40%)',
        }}
      />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md border border-copper-400/40 bg-cream-50 p-8 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-10"
      >
        <div className="pointer-events-none absolute inset-2 border border-copper-400/25" />
        <div className="relative text-center">
          <BrandMark className="mx-auto h-16 w-16" />
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.32em] text-clay-600">Quito · Ecuador</p>
          <h1 className="font-display mt-2 text-4xl text-forest-800">Sacha Wasi</h1>
          <p className="mt-2 text-sm text-ink-500">Cocina de la sierra · núcleo operativo</p>
          <div className="sw-gold-rule mx-auto mt-6 w-24" />
        </div>
        <label className="relative mt-8 block text-left text-sm text-ink-700">
          Correo
          <input
            className="sw-input mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="relative mt-4 block text-left text-sm text-ink-700">
          Contraseña
          <input
            className="sw-input mt-1.5"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error ? <p className="relative mt-3 text-sm text-clay-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="sw-btn relative mt-6 w-full py-3 text-sm font-medium tracking-wide disabled:opacity-60"
        >
          {pending ? 'Entrando…' : 'Entrar'}
        </button>
        <p className="relative mt-5 text-center text-[11px] leading-relaxed text-ink-500">
          Demo: admin@sachawasi.ec / password
          <br />
          cajero@ · cocina@ · mesero@ · bodega@
        </p>
      </form>
    </div>
  )
}
