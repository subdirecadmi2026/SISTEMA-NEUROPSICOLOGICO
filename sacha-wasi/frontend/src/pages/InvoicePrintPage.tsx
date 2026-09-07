import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Invoice = {
  id: string
  sequential: string
  establishment_code: string
  emission_point: string
  access_key?: string
  sri_status: string
  sri_authorization?: string
  customer_name?: string
  customer_document?: string
  subtotal: string
  tax_amount: string
  total: string
  created_at: string
  document_type: string
  is_contingency: boolean
  order?: {
    number: string
    payments?: Array<{ guest_label?: string; method: string; amount: string; tendered_amount?: string; change_amount?: string; reference?: string }>
    items?: Array<{ name: string; quantity: string; unit_price: string; line_total: string }>
  }
}

export function InvoicePrintPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [doc, setDoc] = useState<Invoice | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    api.invoice(id).then((d) => setDoc(d as Invoice)).catch((e: Error) => setError(e.message))
  }, [id])

  if (error) return <p className="p-6 text-clay-600">{error}</p>
  if (!doc) return <p className="p-6">Cargando factura…</p>

  const number = `${doc.establishment_code}-${doc.emission_point}-${doc.sequential}`

  return (
    <div className="mx-auto max-w-xl bg-white p-6 text-ink-900 print:max-w-none print:p-0">
      <div className="mb-4 flex gap-2 print:hidden">
        <button className="rounded-xl bg-forest-800 px-4 py-2 text-white" onClick={() => window.print()}>Imprimir</button>
        <Link className="rounded-xl border px-4 py-2" to="/facturas">Volver</Link>
      </div>
      <header className="border-b pb-3 text-center">
        <p className="font-display text-2xl">{user?.company?.trade_name ?? user?.company?.name ?? 'Sacha Wasi'}</p>
        <p className="text-sm">{user?.current_branch?.name} · {user?.current_branch?.city}</p>
        <p className="mt-2 text-xs uppercase tracking-wide">Factura {number}</p>
        <p className="text-xs">Ambiente de pruebas SRI · no tiene validez tributaria</p>
      </header>
      <p className="mt-3 text-sm">Cliente: {doc.customer_name ?? 'CONSUMIDOR FINAL'}</p>
      <p className="text-sm">Doc: {doc.customer_document}</p>
      <p className="text-sm">Pedido: {doc.order?.number}</p>
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1">Cant.</th>
            <th>Detalle</th>
            <th className="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {(doc.order?.items ?? []).map((item, i) => (
            <tr key={i} className="border-b">
              <td className="py-1">{Number(item.quantity)}</td>
              <td>{item.name}</td>
              <td className="text-right">${Number(item.line_total).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-right text-sm">Subtotal ${Number(doc.subtotal).toFixed(2)}</p>
      <p className="text-right text-sm">IVA ${Number(doc.tax_amount).toFixed(2)}</p>
      <p className="text-right font-display text-2xl">Total ${Number(doc.total).toFixed(2)}</p>
      <h3 className="mt-4 text-sm font-medium">Pagos</h3>
      <ul className="text-sm">
        {(doc.order?.payments ?? []).map((p, i) => (
          <li key={i}>
            {p.guest_label ?? 'Pago'} · {p.method === 'cash' ? 'efectivo' : p.method === 'transfer' ? 'transferencia' : p.method} ${Number(p.amount).toFixed(2)}
            {p.tendered_amount ? ` · recibe $${Number(p.tendered_amount).toFixed(2)}` : ''}
            {p.change_amount && Number(p.change_amount) > 0 ? ` · vuelto $${Number(p.change_amount).toFixed(2)}` : ''}
            {p.reference ? ` · ref ${p.reference}` : ''}
          </li>
        ))}
      </ul>
      <p className="mt-4 break-all font-mono text-[10px]">Clave: {doc.access_key}</p>
      <p className="text-[10px]">Autorización: {doc.sri_authorization ?? doc.sri_status}</p>
    </div>
  )
}
