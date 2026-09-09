import { useEffect, useState } from 'react'
import { api } from '../api/client'

export function AuditPage() {
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.audit().then((d) => setRows(d.data)).catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="sw-card overflow-x-auto rounded-2xl">
      {error ? <p className="p-3 text-clay-600">{error}</p> : null}
      <table className="w-full text-left text-sm">
        <thead className="text-ink-500"><tr><th className="px-3 py-2">Cuando</th><th>Usuario</th><th>Acción</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r.id)} className="border-t border-cream-100 dark:border-white/10">
              <td className="px-3 py-2">{new Date(String(r.created_at)).toLocaleString('es-EC')}</td>
              <td>{(r.user as { name?: string } | undefined)?.name ?? 'sistema'}</td>
              <td>{String(r.action)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
