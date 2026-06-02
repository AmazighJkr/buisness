import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { fetchPaymentConfig, payStoreOrder, trackStoreOrder } from '../api/client.js'
import { formatDzd, formatStoreTotal, formatUsd, useDzdPricing } from '../utils/formatMoney.js'

const STATUS_LABEL = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export default function StoreOrderPage() {
  const [searchParams] = useSearchParams()
  const numberParam = searchParams.get('number') || ''
  const paidBanner = searchParams.get('paid') === '1'
  const manualBanner = searchParams.get('manual') === '1'

  const [trackNumber, setTrackNumber] = useState(numberParam)
  const [trackEmail, setTrackEmail] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentProvider, setPaymentProvider] = useState('stripe')
  const [paying, setPaying] = useState(false)

  const useDzd = useDzdPricing(paymentProvider)

  useEffect(() => {
    fetchPaymentConfig().then((cfg) => setPaymentProvider(cfg.provider || 'stripe')).catch(() => {})
  }, [])

  useEffect(() => {
    if (!numberParam) return
    setTrackNumber(numberParam)
  }, [numberParam])

  const loadOrder = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const data = await trackStoreOrder(trackNumber, trackEmail)
      setOrder(data)
    } catch (err) {
      setError(err.message || 'Order not found.')
    } finally {
      setLoading(false)
    }
  }

  const retryPay = async () => {
    if (!order?.id) return
    setPaying(true)
    setError('')
    try {
      const result = await payStoreOrder(order.id, {}, paymentProvider)
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      setError(result.instructions || 'Use manual payment instructions.')
    } catch (err) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/shop" />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Order status</h1>

        {paidBanner && (
          <p className="mt-4 border border-lab-green/40 bg-lab-green/10 px-3 py-2 text-sm text-lab-green">
            Thank you — payment received. We will process your order shortly.
          </p>
        )}
        {manualBanner && (
          <p className="mt-4 border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            Order placed. Complete payment using the instructions we sent or contact support with your order number.
          </p>
        )}

        <form onSubmit={loadOrder} className="panel mt-6 space-y-3 p-4">
          <label className="block text-xs text-dark-muted">
            Order number
            <input
              required
              value={trackNumber}
              onChange={(e) => setTrackNumber(e.target.value)}
              placeholder="EG-SHOP-XXXXXX"
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm uppercase"
            />
          </label>
          <label className="block text-xs text-dark-muted">
            Email used at checkout
            <input
              type="email"
              required
              value={trackEmail}
              onChange={(e) => setTrackEmail(e.target.value)}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Looking up…' : 'Track order'}
          </button>
        </form>

        {error && (
          <p className="mt-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {order && (
          <section className="panel mt-6 p-4">
            <p className="text-xs text-dark-muted">Order</p>
            <h2 className="text-lg font-semibold">{order.order_number}</h2>
            <p className="mt-2 text-sm">
              Status: <span className="text-lab-cyan">{STATUS_LABEL[order.status] || order.status}</span>
              {' · '}
              Payment: <span className={order.payment_status === 'paid' ? 'text-lab-green' : ''}>{order.payment_status}</span>
            </p>
            <p className="mt-2 text-sm font-semibold">
              {formatStoreTotal(Number(order.total_usd), Number(order.total_dzd), useDzd)}
            </p>
            <p className="mt-1 text-xs text-dark-muted">
              Also shown as {formatUsd(order.total_usd)} / {formatDzd(order.total_dzd)}
            </p>

            <ul className="mt-4 space-y-2 border-t border-dark-border pt-4 text-sm">
              {order.items?.map((line) => (
                <li key={line.id} className="flex justify-between gap-2">
                  <span>
                    {line.product_name} × {line.quantity}
                  </span>
                  <span>
                    {useDzd
                      ? formatDzd(Number(line.unit_price_dzd) * line.quantity)
                      : formatUsd(Number(line.unit_price_usd) * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>

            {order.payment_status === 'pending' && order.status !== 'cancelled' && (
              <button type="button" onClick={retryPay} disabled={paying} className="btn-primary mt-4 w-full">
                {paying ? 'Starting payment…' : 'Pay now'}
              </button>
            )}
          </section>
        )}

        <Link to="/shop" className="mt-6 inline-block text-sm text-dark-muted hover:underline">
          Continue shopping
        </Link>
      </main>
    </div>
  )
}
