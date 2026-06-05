import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import { downloadStoreOrderInvoice, payStoreOrder, trackStoreOrder } from '../api/client.js'
import { CONTACT } from '../config/contact.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useCart } from '../hooks/useCart.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { clearPendingStoreOrder } from '../utils/storeCheckout.js'
import { formatDzd } from '../utils/formatMoney.js'

const STATUS_LABEL = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function whatsappOrderUrl(orderNumber) {
  const base = CONTACT.whatsappHref
  if (!base) return ''
  const text = encodeURIComponent(
    `Bonjour / Hello — commande ${orderNumber}. Merci / Thank you.`,
  )
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}text=${text}`
}

export default function StoreOrderPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const numberParam = searchParams.get('number') || ''
  const paidBanner = searchParams.get('paid') === '1'
  const codBanner = searchParams.get('cod') === '1'
  const { chargily } = useStoreRegion()
  const { clearCart } = useCart()

  const [trackNumber, setTrackNumber] = useState(numberParam)
  const [trackEmail, setTrackEmail] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)

  useEffect(() => {
    if (!numberParam) return
    setTrackNumber(numberParam)
  }, [numberParam])

  useEffect(() => {
    if (paidBanner || codBanner) {
      clearPendingStoreOrder()
      clearCart()
    }
  }, [paidBanner, codBanner, clearCart])

  const loadOrder = async (e) => {
    e?.preventDefault()
    setLoading(true)
    setError('')
    setOrder(null)
    try {
      const data = await trackStoreOrder(trackNumber, trackEmail)
      setOrder(data)
      if (data.customer_email && !trackEmail) {
        setTrackEmail(data.customer_email)
      }
    } catch (err) {
      setError(err.message || 'Order not found.')
    } finally {
      setLoading(false)
    }
  }

  const retryPay = async (method) => {
    if (!order?.id) return
    setPaying(true)
    setError('')
    try {
      const result = await payStoreOrder(order.id, { payment_method: method })
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'cod') {
        setError('')
        window.location.reload()
        return
      }
      setError(result.instructions || 'Could not start payment.')
    } catch (err) {
      setError(err.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="page-shell">
      <StoreHeader highlight="/shop/order" />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Order status</h1>

        {paidBanner && (
          <p className="mt-4 border border-lab-green/40 bg-lab-green/10 px-3 py-2 text-sm text-lab-green">
            Thank you — payment received. We will process your order shortly.
          </p>
        )}
        {codBanner && (
          <p className="mt-4 border border-lab-cyan/40 bg-lab-cyan/10 px-3 py-2 text-sm text-lab-cyan">
            Order placed. Pay in cash when your package is delivered. We will contact you to confirm
            shipping.
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
              Payment:{' '}
              <span className={order.payment_status === 'paid' ? 'text-lab-green' : ''}>
                {order.payment_status}
              </span>
            </p>
            <p className="mt-2 text-sm font-semibold">{formatDzd(Number(order.total_dzd))}</p>

            <ul className="mt-4 space-y-2 border-t border-dark-border pt-4 text-sm">
              {order.items?.map((line) => (
                <li key={line.id} className="flex justify-between gap-2">
                  <span>
                    {line.product_name} × {line.quantity}
                  </span>
                  <span>{formatDzd(Number(line.unit_price_dzd) * line.quantity)}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-dark-border pt-4">
              {whatsappOrderUrl(order.order_number) && (
                <a
                  href={whatsappOrderUrl(order.order_number)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded border border-lab-green/50 px-3 py-2 text-sm text-lab-green hover:bg-lab-green/10"
                >
                  {t('storeOrder.whatsapp')}
                </a>
              )}
              <button
                type="button"
                disabled={invoiceLoading || !trackEmail}
                onClick={async () => {
                  setInvoiceLoading(true)
                  setError('')
                  try {
                    await downloadStoreOrderInvoice(order.order_number, trackEmail || order.customer_email)
                  } catch (err) {
                    setError(err.message)
                  } finally {
                    setInvoiceLoading(false)
                  }
                }}
                className="rounded border border-dark-border px-3 py-2 text-sm hover:border-lab-cyan"
              >
                {invoiceLoading ? t('storeOrder.invoiceLoading') : t('storeOrder.downloadInvoice')}
              </button>
            </div>

            {order.payment_status === 'pending' && order.status !== 'cancelled' && (
              <div className="mt-4 flex flex-col gap-2">
                {chargily && (
                  <button
                    type="button"
                    onClick={() => retryPay('chargily')}
                    disabled={paying}
                    className="btn-primary w-full"
                  >
                    {paying ? 'Starting…' : 'Pay now with card (Chargily)'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => retryPay('cod')}
                  disabled={paying}
                  className="w-full rounded border border-dark-border px-4 py-2 text-sm hover:border-lab-cyan"
                >
                  Confirm pay on delivery
                </button>
              </div>
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
