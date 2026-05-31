import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Lock, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminFetchCustomers } from '../api/client.js'

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function statusClass(status) {
  if (status === 'active' || status === 'paid') return 'text-lab-green'
  if (status === 'pending' || status === 'Pending') return 'text-lab-copper'
  if (status === 'cancelled' || status === 'expired') return 'text-dark-muted'
  return 'text-dark-text'
}

function CustomerCard({ customer }) {
  const [open, setOpen] = useState(false)

  return (
    <article className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-4 text-left panel-hover"
      >
        {open ? (
          <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-dark-muted" />
        ) : (
          <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-dark-muted" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-medium">{customer.username}</span>
            {customer.first_name && (
              <span className="text-sm text-dark-muted">{customer.first_name}</span>
            )}
            {!customer.is_active && (
              <span className="text-xs text-red-400">inactive</span>
            )}
          </div>
          <p className="mt-1 text-sm text-dark-muted">{customer.email}</p>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-muted">
            <span>Joined {formatDate(customer.date_joined)}</span>
            <span>Last login {formatDate(customer.last_login)}</span>
            <span>{customer.active_subscriptions} active pack{customer.active_subscriptions === 1 ? '' : 's'}</span>
            <span>{customer.commands?.length || 0} command{(customer.commands?.length || 0) === 1 ? '' : 's'}</span>
          </p>
        </div>
      </button>

      {open && (
        <div className="space-y-4 border-t border-dark-border px-4 pb-4 pt-3">
          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-dark-muted">
              Subscriptions
            </h3>
            {customer.subscriptions?.length ? (
              <ul className="mt-2 space-y-2">
                {customer.subscriptions.map((sub) => (
                  <li
                    key={sub.id}
                    className="rounded border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{sub.pack_name}</span>
                      <span className={`text-xs capitalize ${statusClass(sub.status)}`}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-dark-muted">
                      Started {formatDate(sub.started_at)} · Expires {formatDate(sub.expires_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-dark-muted">No subscriptions yet.</p>
            )}
          </section>

          <section>
            <h3 className="text-xs font-medium uppercase tracking-wide text-dark-muted">
              Commands
            </h3>
            {customer.commands?.length ? (
              <ul className="mt-2 space-y-2">
                {customer.commands.map((cmd) => (
                  <li
                    key={cmd.id}
                    className="rounded border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        to={`/track?code=${cmd.tracking_code}`}
                        className="font-mono text-lab-cyan underline"
                      >
                        {cmd.tracking_code}
                      </Link>
                      <span className={`text-xs ${statusClass(cmd.status)}`}>{cmd.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-dark-muted">
                      {cmd.project_title || 'Custom command'}
                      {cmd.quoted_price > 0 && (
                        <> · ${Number(cmd.quoted_price).toFixed(2)} · {cmd.payment_status}</>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-dark-muted">
                      {cmd.client_name || customer.username} · {formatDate(cmd.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-dark-muted">No linked commands.</p>
            )}
          </section>
        </div>
      )}
    </article>
  )
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  useEffect(() => {
    adminFetchCustomers()
      .then(setCustomers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.username?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.first_name?.toLowerCase().includes(q),
    )
  }, [customers, query])

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-start gap-2 rounded border border-dark-border bg-dark-panel p-3 text-xs text-dark-muted">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-lab-copper" />
        <p>
          Client accounts and subscription history are visible to the <strong>superuser</strong>{' '}
          admin only. Staff editors cannot access this tab.
        </p>
      </div>

      <label className="relative block max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-muted" />
        <input
          type="search"
          placeholder="Search username, email, name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border border-dark-border bg-dark-bg py-2 pl-9 pr-3 text-sm"
        />
      </label>

      {loading && <p className="text-sm text-dark-muted animate-pulse">Loading clients…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && (
        <>
          <p className="text-xs text-dark-muted">
            {filtered.length} client account{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="space-y-3">
            {filtered.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
            {!filtered.length && (
              <p className="text-sm text-dark-muted">No client accounts match your search.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
