import { useEffect, useState } from 'react'
import { adminFetchDashboard } from '../../api/client.js'

export default function AdminDashboard({ onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetchDashboard()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-sm text-dark-muted animate-pulse">Loading dashboard…</p>
  }
  if (error) {
    return <p className="text-sm text-red-300">{error}</p>
  }
  if (!data) return null

  const cards = [
    {
      key: 'commands',
      count: data.pending_commands,
      label: 'pending commands',
      tab: 'commands',
    },
    {
      key: 'orders',
      count: data.unpaid_orders,
      label: 'unpaid store orders',
      tab: 'store-orders',
    },
    {
      key: 'stock',
      count: data.low_stock_products,
      label: 'low-stock products',
      tab: 'store',
    },
  ]

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Operations overview</h2>
        <p className="mt-1 text-sm text-dark-muted">
          {data.pending_commands} pending command{data.pending_commands === 1 ? '' : 's'},{' '}
          {data.unpaid_orders} unpaid order{data.unpaid_orders === 1 ? '' : 's'},{' '}
          {data.low_stock_products} low-stock product{data.low_stock_products === 1 ? '' : 's'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map(({ key, count, label, tab }) => (
          <button
            key={key}
            type="button"
            onClick={() => onNavigate?.(tab)}
            className="panel p-4 text-left transition-colors hover:border-lab-cyan/50"
          >
            <p className="text-3xl font-semibold text-lab-cyan">{count}</p>
            <p className="mt-1 text-xs text-dark-muted">{label}</p>
          </button>
        ))}
      </div>

      <div className="panel space-y-2 p-4 text-sm">
        <h3 className="font-medium">Internal SLA</h3>
        <p className="text-dark-muted">
          Reply to new commands within{' '}
          <strong className="text-dark-text">{data.sla_command_reply_hours}h</strong>. Ship store
          orders within{' '}
          <strong className="text-dark-text">{data.sla_ship_days_after_payment} days</strong> after
          payment.
        </p>
      </div>

      <div className="panel space-y-2 p-4 text-sm">
        <h3 className="font-medium">Single inbox</h3>
        <p className="text-dark-muted">
          Command notifications and contact mail go to{' '}
          {data.contact_email ? (
            <a href={`mailto:${data.contact_email}`} className="text-lab-cyan underline">
              {data.contact_email}
            </a>
          ) : (
            'your configured CONTACT_EMAIL'
          )}
          . Check daily.
        </p>
        {data.whatsapp_url ? (
          <p>
            WhatsApp:{' '}
            <a href={data.whatsapp_url} target="_blank" rel="noreferrer" className="text-lab-cyan underline">
              support link
            </a>
          </p>
        ) : null}
      </div>

      <div className="panel space-y-2 p-4 text-sm">
        <h3 className="font-medium">Media storage</h3>
        <p className="text-dark-muted">
          {data.cloudinary_enabled
            ? 'Cloudinary is enabled — product and schematic images survive redeploys.'
            : 'Cloudinary is not configured — uploads use local disk and are lost on Render redeploy. Set CLOUDINARY_URL in production.'}
        </p>
      </div>
    </div>
  )
}
