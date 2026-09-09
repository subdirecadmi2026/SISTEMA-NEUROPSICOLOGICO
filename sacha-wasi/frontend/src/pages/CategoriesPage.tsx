import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../api/client'
import type { Category } from '../api/types'

export function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([])
  const [name, setName] = useState('')
  const [color, setColor] = useState('#143D30')
  const [error, setError] = useState('')

  async function load() {
    setItems(await api.categories())
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      await api.createCategory({ name, color, sort_order: items.length + 1, show_on_pos: true })
      setName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="grid gap-3 sm:grid-cols-2">
        {items.map((cat) => (
          <article key={cat.id} className="sw-card rounded-2xl p-4">
            <div className="mb-3 h-2 rounded-full" style={{ background: cat.color || '#143D30' }} />
            <h2 className="font-display text-xl">{cat.name}</h2>
            <p className="text-sm text-ink-500">{cat.products_count ?? 0} productos</p>
            {cat.children?.length ? (
              <p className="mt-2 text-xs text-ink-500">
                Subcategorías: {cat.children.map((c) => c.name).join(', ')}
              </p>
            ) : null}
          </article>
        ))}
      </section>
      <form onSubmit={onSubmit} className="sw-card h-fit rounded-2xl p-4">
        <h2 className="font-display text-lg">Nueva categoría</h2>
        <label className="mt-3 block text-sm">
          Nombre
          <input className="mt-1 w-full rounded-xl border px-3 py-2 dark:border-white/10 dark:bg-forest-800" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="mt-3 block text-sm">
          Color
          <input className="mt-1 h-10 w-full" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        {error ? <p className="mt-2 text-sm text-clay-600">{error}</p> : null}
        <button className="mt-4 w-full rounded-xl bg-forest-800 py-2 text-white">Guardar</button>
      </form>
    </div>
  )
}
