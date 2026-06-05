import { useCallback, useEffect, useState } from 'react'
import { adminFetchEconomics } from '../../api/client.js'

const PERIODS = [
  { value: 'all', label: 'All time' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'year', label: 'Last 12 months' },
]

function fmtMoney(value, currency) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function RevenueBlock({ title, rows, totals, currency, provider, feeLabel }) {
  return (
    <section className="border border-lab-border bg-lab-surface p-4 space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-lab-cyan">{title}</h3>
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">
          {provider} · {currency}
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] text-gray-600 uppercase tracking-wide">
        <span>Source</span>
        <span className="text-right">#</span>
        <span className="text-right">Gross</span>
        <span className="text-right">Net</span>
      </div>

      <div className="space-y-2 text-xs">
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center border-b border-lab-border/50 pb-2">
            <span className="text-gray-400 capitalize">{row.label}</span>
            <span className="text-right text-gray-500" title="Paid count">{row.data.count}</span>
            <span className="text-right text-dark-text">{fmtMoney(row.data.gross, currency)}</span>
            <span className="text-right text-gray-500">{fmtMoney(row.data.net, currency)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-lab-border pt-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Gross total</span>
          <span className="font-medium text-dark-text">{fmtMoney(totals.gross, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">{feeLabel}</span>
          <span className="text-red-300/90">− {fmtMoney(totals.fees, currency)}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-lab-border">
          <span className="text-lab-copper font-medium">Net income</span>
          <span className="font-semibold text-lab-cyan">{fmtMoney(totals.net, currency)}</span>
        </div>
        <p className="text-[10px] text-gray-500 pt-1">{totals.count} paid transaction{totals.count === 1 ? '' : 's'}</p>
      </div>
    </section>
  )
}

export default function AdminEconomics() {
  const [period, setPeriod] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setData(await adminFetchEconomics({ period }))
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return <p className="text-xs text-gray-500 animate-pulse">Loading economics…</p>
  }
  if (error) {
    return <p className="text-xs text-red-400">{error}</p>
  }
  if (!data) return null

  const cfg = data.fee_config || {}
  const algeria = data.algeria || {}
  const intl = data.international || {}

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Economics</h2>
          <p className="mt-1 text-xs text-gray-500">
            Paid revenue only — net after estimated Stripe / Chargily fees.
          </p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="border border-lab-border bg-lab-bg px-3 py-2 text-xs"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 text-[10px] text-gray-500 sm:grid-cols-3 border border-lab-border bg-lab-bg px-3 py-2">
        <span>Stripe: {cfg.stripe_percent}% + ${cfg.stripe_fixed_usd} / txn</span>
        <span>Chargily: {cfg.chargily_percent}%</span>
        <span className="sm:text-right">DZD & USD not combined</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueBlock
          title="Algeria (DZD)"
          currency="DZD"
          provider="Chargily"
          feeLabel={`Est. Chargily fees (${cfg.chargily_percent}%)`}
          rows={[
            { key: 'store', label: 'Store sales', data: algeria.store || {} },
            { key: 'commands', label: 'Commands', data: algeria.commands || {} },
            { key: 'subs', label: 'Subscriptions', data: algeria.subscriptions || {} },
          ]}
          totals={algeria.totals || {}}
        />
        <RevenueBlock
          title="International (USD)"
          currency="USD"
          provider="Stripe"
          feeLabel={`Est. Stripe fees (${cfg.stripe_percent}% + $${cfg.stripe_fixed_usd})`}
          rows={[
            { key: 'commands', label: 'Commands', data: intl.commands || {} },
            { key: 'subs', label: 'Subscriptions', data: intl.subscriptions || {} },
          ]}
          totals={intl.totals || {}}
        />
      </div>

      {(data.pending?.store_orders > 0 || data.pending?.accepted_unpaid_commands > 0) && (
        <div className="border border-lab-border bg-lab-surface p-4 text-xs space-y-1">
          <h3 className="text-sm font-medium text-gray-400">Outstanding (not in totals)</h3>
          {data.pending.store_orders > 0 && (
            <p>{data.pending.store_orders} store order{data.pending.store_orders === 1 ? '' : 's'} awaiting payment</p>
          )}
          {data.pending.accepted_unpaid_commands > 0 && (
            <p>{data.pending.accepted_unpaid_commands} accepted command{data.pending.accepted_unpaid_commands === 1 ? '' : 's'} awaiting payment</p>
          )}
        </div>
      )}

      {(data.notes?.ambiguous_commands > 0 || data.notes?.ambiguous_subscriptions > 0) && (
        <p className="text-[10px] text-amber-400/90">
          {data.notes.ambiguous_commands > 0 && `${data.notes.ambiguous_commands} paid command(s) have both USD and DZD quotes — set paid currency on next payment or review manually. `}
          {data.notes.ambiguous_subscriptions > 0 && `${data.notes.ambiguous_subscriptions} active subscription(s) have both currency list prices — amount not estimated.`}
        </p>
      )}

      <p className="text-[10px] text-gray-600">{data.notes?.fees_estimated}</p>
    </div>
  )
}
