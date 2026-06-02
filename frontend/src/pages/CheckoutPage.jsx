import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import StoreAlgeriaGate, { StoreNotAvailableInRegion } from '../components/store/StoreAlgeriaGate.jsx'
import {
  createStoreOrder,
  fetchUserMe,
  payStoreOrder,
} from '../api/client.js'
import { useCart } from '../hooks/useCart.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { formatDzd } from '../utils/formatMoney.js'

export default function CheckoutPage() {
  const [searchParams] = useSearchParams()
  const resumeOrderId = searchParams.get('order')
  const { items, subtotalDzd, clearCart } = useCart()
  const { loading: regionLoading, isAlgeria, chargily } = useStoreRegion()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    shipping_address: '',
    notes: '',
  })

  useEffect(() => {
    if (chargily) setPaymentMethod((m) => (m === 'cod' ? m : 'chargily'))
  }, [chargily])

  useEffect(() => {
    let cancelled = false
    fetchUserMe()
      .then((me) => {
        if (cancelled) return
        setUser(me)
        if (me) {
          setForm((f) => ({
            ...f,
            customer_name: f.customer_name || me.username || '',
            customer_email: f.customer_email || me.email || '',
          }))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const payExisting = async (orderId, method = paymentMethod) => {
    setSubmitting(true)
    setError('')
    try {
      const result = await payStoreOrder(orderId, { payment_method: method })
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'cod') {
        clearCart()
        window.location.href = `/shop/order?number=${result.order?.order_number || ''}&cod=1`
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
    if (!resumeOrderId || loading || regionLoading || !isAlgeria) return
    payExisting(resumeOrderId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeOrderId, loading, regionLoading, isAlgeria])

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
      const result = await payStoreOrder(order.id, { payment_method: paymentMethod })
      if (result.checkout_url) {
        clearCart()
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'cod') {
        clearCart()
        window.location.href = `/shop/order?number=${order.order_number}&cod=1`
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

  if (!regionLoading && !isAlgeria) {
    return <StoreNotAvailableInRegion />
  }

  if (resumeOrderId && !error) {
    return (
      <StoreAlgeriaGate loading={regionLoading}>
        <div className="page-shell">
          <StoreHeader highlight="/shop/checkout" />
          <main className="mx-auto max-w-lg p-6 text-center text-sm text-dark-muted">
            Resuming payment…
          </main>
        </div>
      </StoreAlgeriaGate>
    )
  }

  return (
    <StoreAlgeriaGate loading={regionLoading}>
      <div className="page-shell">
        <StoreHeader highlight="/shop/checkout" />
        <main className="mx-auto max-w-3xl p-4 sm:p-6">
          <h1 className="text-2xl font-semibold">Checkout</h1>
          <p className="mt-1 text-sm text-dark-muted">Algeria · all amounts in DZD</p>

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
                  Phone (recommended for delivery)
                  <input
                    value={form.customer_phone}
                    onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                    className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-dark-muted">
                  Shipping address (Algeria)
                  <textarea
                    required
                    rows={4}
                    value={form.shipping_address}
                    onChange={(e) => setForm({ ...form, shipping_address: e.target.value })}
                    className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                    placeholder="Wilaya, commune, street, phone contact…"
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
                      <span>{formatDzd(row.price_dzd * row.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-between border-t border-dark-border pt-3 text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatDzd(subtotalDzd)}</span>
                </div>

                <fieldset className="mt-4 space-y-2 border-t border-dark-border pt-4">
                  <legend className="text-xs font-semibold text-dark-muted">Payment</legend>
                  <label className="flex cursor-pointer items-start gap-2 rounded border border-dark-border p-3 has-[:checked]:border-lab-cyan">
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1"
                    />
                    <span className="text-sm">
                      <strong>Pay on delivery</strong>
                      <span className="mt-0.5 block text-xs text-dark-muted">
                        Cash when your order arrives
                      </span>
                    </span>
                  </label>
                  {chargily && (
                    <label className="flex cursor-pointer items-start gap-2 rounded border border-dark-border p-3 has-[:checked]:border-lab-cyan">
                      <input
                        type="radio"
                        name="payment"
                        value="chargily"
                        checked={paymentMethod === 'chargily'}
                        onChange={() => setPaymentMethod('chargily')}
                        className="mt-1"
                      />
                      <span className="text-sm">
                        <strong>Pay now with card</strong>
                        <span className="mt-0.5 block text-xs text-dark-muted">
                          Chargily — Edahabia / CIB (DZD)
                        </span>
                      </span>
                    </label>
                  )}
                </fieldset>

                <p className="mt-2 text-xs text-dark-muted">
                  {user
                    ? 'Order linked to your account.'
                    : 'Guest checkout — save your order number to track delivery.'}
                </p>
                {error && (
                  <p className="mt-3 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                    {error}
                  </p>
                )}
                <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full">
                  {submitting
                    ? 'Processing…'
                    : paymentMethod === 'cod'
                      ? 'Place order (pay on delivery)'
                      : 'Place order & pay with card'}
                </button>
                <Link
                  to="/shop/cart"
                  className="mt-3 block text-center text-xs text-dark-muted hover:underline"
                >
                  Back to cart
                </Link>
              </div>
            </form>
          )}
        </main>
      </div>
    </StoreAlgeriaGate>
  )
}
