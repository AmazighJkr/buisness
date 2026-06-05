import { useEffect, useMemo, useState } from 'react'
import {
  adminFetchDashboard,
  staffCanEditStore,
  staffCanManageLayers,
  staffCanManageStoreOrders,
  staffCanPostStore,
} from '../../api/client.js'

function hasPerm(user, perm) {
  return user?.is_superuser || user?.permissions?.includes(perm)
}

function buildQuickLinks(user) {
  const links = []
  if (hasPerm(user, 'post_project') || hasPerm(user, 'edit_project')) {
    links.push({ tab: 'post', label: 'Post / edit projects' })
    links.push({ tab: 'projects', label: 'Project list' })
  }
  if (hasPerm(user, 'view_commands')) links.push({ tab: 'commands', label: 'Commands' })
  if (staffCanManageLayers(user)) links.push({ tab: 'command-layers', label: 'Command layers' })
  if (hasPerm(user, 'moderate_comment')) links.push({ tab: 'comments', label: 'Comments' })
  if (hasPerm(user, 'manage_categories')) links.push({ tab: 'categories', label: 'Categories' })
  if (hasPerm(user, 'edit_project') || user?.is_superuser) {
    links.push({ tab: 'packs', label: 'Subscription packs' })
  }
  if (staffCanPostStore(user) || staffCanEditStore(user)) {
    links.push({ tab: 'store', label: 'Store catalog' })
  }
  if (staffCanManageStoreOrders(user)) links.push({ tab: 'store-orders', label: 'Store orders' })
  if (hasPerm(user, 'manage_store') || user?.is_superuser) {
    links.push({ tab: 'legal', label: 'Legal pages' })
  }
  if (user?.is_superuser) {
    links.push({ tab: 'clients', label: 'Clients' })
    links.push({ tab: 'users', label: 'Staff accounts' })
    links.push({ tab: 'activity', label: 'Staff activity' })
  }
  return links
}

export default function AdminDashboard({ user, onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const quickLinks = useMemo(() => buildQuickLinks(user), [user])

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

  const access = data.access || {}
  const cards = []

  if (access.commands && data.pending_commands != null) {
    cards.push({
      key: 'commands',
      count: data.pending_commands,
      label: 'pending commands',
      tab: 'commands',
    })
  }
  if (access.store_orders && data.unpaid_orders != null) {
    cards.push({
      key: 'orders',
      count: data.unpaid_orders,
      label: 'unpaid store orders',
      tab: 'store-orders',
    })
  }
  if (access.store_catalog && data.low_stock_products != null) {
    cards.push({
      key: 'stock',
      count: data.low_stock_products,
      label: 'low-stock products',
      tab: 'store',
    })
  }

  const summaryParts = []
  if (access.commands && data.pending_commands != null) {
    summaryParts.push(
      `${data.pending_commands} pending command${data.pending_commands === 1 ? '' : 's'}`,
    )
  }
  if (access.store_orders && data.unpaid_orders != null) {
    summaryParts.push(
      `${data.unpaid_orders} unpaid order${data.unpaid_orders === 1 ? '' : 's'}`,
    )
  }
  if (access.store_catalog && data.low_stock_products != null) {
    summaryParts.push(
      `${data.low_stock_products} low-stock product${data.low_stock_products === 1 ? '' : 's'}`,
    )
  }

  const showSla =
    (access.commands && data.sla_command_reply_hours != null)
    || (access.store_orders && data.sla_ship_days_after_payment != null)
  const showInbox = access.operations || access.commands || access.store_orders
  const showCloudinary =
    access.operations || access.store_catalog || access.projects || staffCanEditStore(user)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Welcome, {user?.username}</h2>
        {summaryParts.length > 0 ? (
          <p className="mt-1 text-sm text-dark-muted">{summaryParts.join(', ')}</p>
        ) : (
          <p className="mt-1 text-sm text-dark-muted">
            Use the shortcuts below for the areas you can manage.
          </p>
        )}
      </div>

      {cards.length > 0 && (
        <div className={`grid gap-3 ${cards.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : ''}`}>
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
      )}

      {quickLinks.length > 0 && (
        <div className="panel space-y-2 p-4 text-sm">
          <h3 className="font-medium">Your access</h3>
          <div className="flex flex-wrap gap-2">
            {quickLinks.map(({ tab, label }) => (
              <button
                key={tab}
                type="button"
                onClick={() => onNavigate?.(tab)}
                className="rounded border border-dark-border px-3 py-1.5 text-xs text-dark-muted transition-colors hover:border-lab-cyan hover:text-lab-cyan"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {showSla && (
        <div className="panel space-y-2 p-4 text-sm">
          <h3 className="font-medium">Internal SLA</h3>
          <p className="text-dark-muted">
            {access.commands && data.sla_command_reply_hours != null && (
              <>
                Reply to new commands within{' '}
                <strong className="text-dark-text">{data.sla_command_reply_hours}h</strong>
              </>
            )}
            {access.commands
              && data.sla_command_reply_hours != null
              && access.store_orders
              && data.sla_ship_days_after_payment != null
              && '. '}
            {access.store_orders && data.sla_ship_days_after_payment != null && (
              <>
                Ship store orders within{' '}
                <strong className="text-dark-text">{data.sla_ship_days_after_payment} days</strong>{' '}
                after payment.
              </>
            )}
          </p>
        </div>
      )}

      {showInbox && (data.contact_email || data.whatsapp_url) && (
        <div className="panel space-y-2 p-4 text-sm">
          <h3 className="font-medium">Single inbox</h3>
          <p className="text-dark-muted">
            {access.commands && access.store_orders
              ? 'Command notifications and contact mail go to '
              : access.commands
                ? 'Command notifications go to '
                : 'Contact mail goes to '}
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
              <a
                href={data.whatsapp_url}
                target="_blank"
                rel="noreferrer"
                className="text-lab-cyan underline"
              >
                support link
              </a>
            </p>
          ) : null}
        </div>
      )}

      {showCloudinary && data.cloudinary_enabled != null && (
        <div className="panel space-y-2 p-4 text-sm">
          <h3 className="font-medium">Media storage</h3>
          <p className="text-dark-muted">
            {data.cloudinary_enabled
              ? 'Cloudinary is enabled — product and schematic images survive redeploys.'
              : 'Cloudinary is not configured — uploads use local disk and are lost on Render redeploy. Set CLOUDINARY_URL in production.'}
          </p>
        </div>
      )}
    </div>
  )
}
