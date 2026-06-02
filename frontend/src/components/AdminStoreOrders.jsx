import { useEffect, useState } from 'react'
import { adminFetchStoreOrders, adminUpdateStoreOrder } from '../api/client.js'
import { formatDzd, formatUsd } from '../utils/formatMoney.js'

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT_STATUSES = ['none', 'pending', 'paid', 'failed', 'waived']

export default function AdminStoreOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [draft, setDraft] = useState({ status: '', payment_status: '', admin_notes: '' })

  const load = async () => {
    setLoading(true)
    try {
      const data = await adminFetchStoreOrders()
      setOrders(data)
    } catch (e) {
      setMsg(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const selectOrder = (order) => {
    setSelectedId(order.id)
    setDraft({
      status: order.status,
      payment_status: order.payment_status,
      admin_notes: order.admin_notes || '',
    })
    setMsg('')
  }

  const save = async () => {
    if (!selectedId) return
    setMsg('')
    try {
      const updated = await adminUpdateStoreOrder(selectedId, draft)
      setOrders((list) => list.map((o) => (o.id === updated.id ? updated : o)))
      setMsg('Order updated.')
    } catch (e) {
      setMsg(e.message)
    }
  }

  const selected = orders.find((o) => o.id === selectedId)

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Store orders</h2>
      {msg && <p className="text-sm text-dark-muted">{msg}</p>}
      {loading ? (
        <p className="text-sm text-dark-muted animate-pulse">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-dark-muted">No orders yet.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="max-h-[32rem] overflow-y-auto border border-dark-border">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-dark-panel">
                <tr>
                  <th className="p-2">Order</th>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Pay</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => selectOrder(o)}
                    className={`cursor-pointer border-t border-dark-border hover:bg-dark-bg ${
                      selectedId === o.id ? 'bg-dark-bg' : ''
                    }`}
                  >
                    <td className="p-2 font-mono">{o.order_number}</td>
                    <td className="p-2">
                      <div>{o.customer_name}</div>
                      <div className="text-dark-muted">{o.customer_email}</div>
                    </td>
                    <td className="p-2">{o.payment_status}</td>
                    <td className="p-2">{o.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected ? (
            <div className="panel space-y-3 p-4 text-sm">
              <h3 className="font-semibold">{selected.order_number}</h3>
              <p>
                {selected.customer_name} · {selected.customer_email}
                {selected.customer_phone ? ` · ${selected.customer_phone}` : ''}
              </p>
              <p className="text-dark-muted whitespace-pre-wrap">{selected.shipping_address}</p>
              {selected.notes && (
                <p>
                  <span className="text-dark-muted">Customer notes:</span> {selected.notes}
                </p>
              )}
              <p>
                Total: {formatUsd(selected.total_usd)} · {formatDzd(selected.total_dzd)}
              </p>
              <ul className="border-t border-dark-border pt-2">
                {selected.items?.map((line) => (
                  <li key={line.id}>
                    {line.product_name} × {line.quantity} — {formatUsd(line.unit_price_usd)} /{' '}
                    {formatDzd(line.unit_price_dzd)}
                  </li>
                ))}
              </ul>

              <label className="block text-xs text-dark-muted">
                Fulfillment status
                <select
                  value={draft.status}
                  onChange={(e) => setDraft({ ...draft, status: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-dark-muted">
                Payment status
                <select
                  value={draft.payment_status}
                  onChange={(e) => setDraft({ ...draft, payment_status: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1"
                >
                  {PAYMENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-dark-muted">
                Admin notes
                <textarea
                  rows={3}
                  value={draft.admin_notes}
                  onChange={(e) => setDraft({ ...draft, admin_notes: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1"
                />
              </label>
              <button type="button" onClick={save} className="btn-primary">
                Save changes
              </button>
            </div>
          ) : (
            <p className="text-sm text-dark-muted">Select an order to view details.</p>
          )}
        </div>
      )}
    </div>
  )
}
