import { useCallback, useEffect, useState } from 'react'
import { adminFetchEconomics } from '../../api/client.js'

function fmtMoney(value, currency) {
  const n = Number(value)
  if (Number.isNaN(n)) return '—'
  return `${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

function IncomeCard({ label, data, currency }) {
  const row = data || {}
  return (
    <article className="border border-lab-border bg-lab-bg p-4 space-y-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-lab-cyan">{label}</h4>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Paid count</span>
          <span className="text-dark-text">{row.count ?? 0}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Gross</span>
          <span className="text-dark-text">{fmtMoney(row.gross, currency)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-gray-500">Fees</span>
          <span className="text-red-300/90">− {fmtMoney(row.fees, currency)}</span>
        </div>
        <div className="flex justify-between gap-3 border-t border-lab-border pt-2">
          <span className="font-medium text-lab-copper">Net</span>
          <span className="font-semibold text-lab-cyan">{fmtMoney(row.net, currency)}</span>
        </div>
      </div>
    </article>
  )
}

function RegionPanel({ title, subtitle, currency, provider, orders, commands, subscriptions, totals }) {
  return (
    <section className="space-y-4 border border-lab-border bg-lab-surface p-4">
      <div>
        <h3 className="text-base font-semibold text-dark-text">{title}</h3>
        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-gray-500">
          {provider} · {currency} · {subtitle}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <IncomeCard label="Orders" data={orders} currency={currency} />
        <IncomeCard label="Commands" data={commands} currency={currency} />
        <IncomeCard label="Subscriptions" data={subscriptions} currency={currency} />
      </div>

      <div className="border-t border-lab-border pt-3 text-xs space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-400">Region gross total</span>
          <span className="font-medium text-dark-text">{fmtMoney(totals?.gross, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Region fees</span>
          <span className="text-red-300/90">− {fmtMoney(totals?.fees, currency)}</span>
        </div>
        <div className="flex justify-between pt-1 border-t border-lab-border">
          <span className="text-lab-copper font-medium">Region net income</span>
          <span className="font-semibold text-lab-cyan">{fmtMoney(totals?.net, currency)}</span>
        </div>
        <p className="text-[10px] text-gray-500 pt-1">
          {totals?.count ?? 0} paid transaction{(totals?.count ?? 0) === 1 ? '' : 's'}
        </p>
      </div>
    </section>
  )
}

export default function AdminEconomics() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const hasRange = Boolean(dateFrom || dateTo)
      setData(
        await adminFetchEconomics({
          period: hasRange ? 'custom' : 'all',
          from: dateFrom,
          to: dateTo,
        }),
      )
    } catch (e) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [dateFrom, dateTo])

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
  const emptyBucket = { count: 0, gross: '0.00', fees: '0.00', net: '0.00' }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Economics</h2>
          <p className="mt-1 text-xs text-gray-500">
            Algeria and international revenue are reported separately — orders, commands, and subscriptions each have their own totals.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 border border-lab-border bg-lab-bg p-3">
          <label className="block text-xs text-gray-500">
            From
            <input
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 block border border-lab-border bg-lab-surface px-3 py-2 text-xs text-dark-text"
            />
          </label>
          <label className="block text-xs text-gray-500">
            Until
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 block border border-lab-border bg-lab-surface px-3 py-2 text-xs text-dark-text"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setDateFrom('')
              setDateTo('')
            }}
            className="border border-lab-border px-3 py-2 text-xs text-gray-400 hover:text-dark-text"
          >
            All time
          </button>
        </div>
        {(dateFrom || dateTo) && (
          <p className="text-[10px] text-gray-500">
            Period: {dateFrom || '…'} → {dateTo || '…'}
          </p>
        )}
      </div>

      <div className="grid gap-2 text-[10px] text-gray-500 sm:grid-cols-3 border border-lab-border bg-lab-bg px-3 py-2">
        <span>Stripe: {cfg.stripe_percent}% + ${cfg.stripe_fixed_usd} / txn</span>
        <span>Chargily: {cfg.chargily_percent}%</span>
        <span className="sm:text-right">DZD & USD not combined</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RegionPanel
          title="Algeria"
          subtitle="Store + commands + subs in DZD"
          currency="DZD"
          provider="Chargily"
          orders={algeria.store}
          commands={algeria.commands}
          subscriptions={algeria.subscriptions}
          totals={algeria.totals}
        />
        <RegionPanel
          title="Non-Algeria"
          subtitle="International USD (no store orders)"
          currency="USD"
          provider="Stripe"
          orders={intl.store || emptyBucket}
          commands={intl.commands}
          subscriptions={intl.subscriptions}
          totals={intl.totals}
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
