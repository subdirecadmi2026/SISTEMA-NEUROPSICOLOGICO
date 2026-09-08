import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'

type Invoice = {
  id: string
  sequential: string
  establishment_code: string
  emission_point: string
  sri_status: string
  access_key?: string
  total: string
  customer_name?: string
  sri_message?: string
  is_contingency: boolean
  created_at: string
}

export function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([])
  const [error, setError] = useState('')

  async function load() {
    const result = await api.invoices()
    setRows(result.data as Invoice[])
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  return (
    <div className="space-y-4">
      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Simulador SRI · ambiente de pruebas. Estos comprobantes no se envían al SRI real ni tienen validez tributaria.
      </p>
      {error ? <p className="text-clay-600">{error}</p> : null}
      <div className="sw-card overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-sm">
          <thead className="text-ink-500">
            <tr>
              <th className="px-3 py-2">Número</th>
              <th>Cliente</th>
              <th>Total</th>
              <th>SRI</th>
              <th>Clave</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-cream-100 dark:border-white/10">
                <td className="px-3 py-2">{row.establishment_code}-{row.emission_point}-{row.sequential}</td>
                <td>{row.customer_name}</td>
                <td>${Number(row.total).toFixed(2)}</td>
                <td>{row.sri_status}{row.is_contingency ? ' · contingencia' : ''}</td>
                <td className="font-mono text-[11px]">{row.access_key}</td>
                <td>
                  <Link className="mr-2 text-forest-700 underline" to={`/facturas/${row.id}/imprimir`}>Imprimir</Link>
                  {row.sri_status !== 'authorized' && row.sri_status !== 'voided' ? (
                    <button className="text-forest-700 underline" onClick={() => void api.retryInvoice(row.id).then(load)}>Reintentar</button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
