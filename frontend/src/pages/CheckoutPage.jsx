import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import {
  createStoreOrder,
  fetchPaymentConfig,
  fetchUserMe,
  payStoreOrder,
} from '../api/client.js'
import { useCart } from '../hooks/useCart.js'
import { formatDzd, formatStoreTotal, formatUsd, useDzdPricing } from '../utils/formatMoney.js'

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const resumeOrderId = searchParams.get('order')
  const { items, subtotalUsd, subtotalDzd, clearCart } = useCart()
  const [user, setUser] = useState(null)
  const [paymentProvider, setPaymentProvider] = useState('stripe')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    notes: '',
  })

  const useDzd = useDzdPricing(paymentProvider)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [cfg, me] = await Promise.all([
          fetchPaymentConfig({ forceRefresh: true }),
          fetchUserMe(),
        ])
        if (cancelled) return
        setPaymentProvider(cfg.provider || 'stripe')
        setUser(me)
        if (me) {
          setForm((f) => ({
            ...f,
            customer_name: f.customer_name || me.username || '',
            customer_email: f.customer_email || me.email || '',
          }))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const payExisting = async (orderId) => {
    setSubmitting(true)
    setError('')
    try {
      const result = await payStoreOrder(orderId, {}, paymentProvider)
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'manual') {
        setError(result.instructions || 'Complete payment using the instructions provided.')
        return
      }
      clearCart()
      window.location.href = `/shop/order?id=${orderId}&paid=1`
    } catch (err) {
      setError(err.message || 'Payment could not be started.')
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!resumeOrderId || loading) return
    payExisting(resumeOrderId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeOrderId, loading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (items.length === 0 && !resumeOrderId) {
      setError('Your cart is empty.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const order = await createStoreOrder({
        ...form,
        items: items.map((row) => ({ product_id: row.productId, quantity: row.quantity })),
      })
      const result = await payStoreOrder(order.id, {}, paymentProvider)
      if (result.checkout_url) {
        clearCart()
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'manual') {
        clearCart()
        window.location.href = `/shop/order?number=${order.order_number}&manual=1`
        return
      }
      clearCart()
      window.location.href = `/shop/order?number=${order.order_number}&paid=1`
    } catch (err) {
      setError(err.message || 'Checkout failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (resumeOrderId && !error) {
    return (
      <div className="page-shell">
        <PageHeader highlight="/shop" />
        <main className="mx-auto max-w-lg p-6 text-center text-sm text-dark-muted">
          Resuming payment…
        </main>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/shop" />
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Checkout</h1>

        {loading ? (
          <p className="mt-4 text-sm text-dark-muted animate-pulse">Loading…</p>
        ) : items.length === 0 ? (
          <div className="panel mt-6 p-6 text-center">
            <p className="text-sm text-dark-muted">Nothing to checkout.</p>
            <Link to="/shop/cart" className="btn-primary mt-4 inline-block">
              View cart
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-xs text-dark-muted">
                Full name
                <input
                  required
                  value={form.customer_name}
                  onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-dark-muted">
                Email
                <input
                  type="email"
                  required
                  value={form.customer_email}
                  onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-dark-muted">
                Phone (optional)
                <input
                  value={form.customer_phone}
                  onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-dark-muted">
                Shipping address
                <textarea
                  required
                  rows={4}
                  value={form.shipping_address}
                  onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-dark-muted">
                Order notes (optional)
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="panel h-fit p-4">
              <h2 className="font-semibold">Order summary</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {items.map((row) => (
                  <li key={row.productId} className="flex justify-between gap-2">
                    <span>
                      {row.name} × {row.quantity}
                    </span>
                    <span>{formatStoreTotal(row.price_usd * row.quantity, row.price_dzd * row.quantity, useDzd)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex justify-between border-t border-dark-border pt-3 text-sm font-semibold">
                <span>Total</span>
                <span>{formatStoreTotal(subtotalUsd, subtotalDzd, useDzd)}</span>
              </div>
              <p className="mt-2 text-xs text-dark-muted">
                You will pay in {useDzd ? 'DZD (Chargily)' : 'USD (Stripe)'} based on your region.
                {user ? '' : ' Guest checkout — save your order number to track delivery.'}
              </p>
              {error && (
                <p className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full">
                {submitting ? 'Processing…' : 'Place order & pay'}
              </button>
              <Link to="/shop/cart" className="mt-3 block text-center text-xs text-dark-muted hover:underline">
                Back to cart
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
