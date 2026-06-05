import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import { downloadStoreOrderInvoice, payStoreOrder, trackStoreOrder } from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useCart } from '../hooks/useCart.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { clearPendingStoreOrder, readCheckoutEmail } from '../utils/storeCheckout.js'
import { formatDzd } from '../utils/formatMoney.js'
import { buildWhatsappOrderUrl } from '../utils/whatsapp.js'

const STATUS_LABEL = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function OrderConfirmationActions({ orderNumber, email, whatsappUrl, t }) {
  const wa = buildWhatsappOrderUrl(orderNumber, whatsappUrl)
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center rounded border border-lab-green/50 px-3 py-2 text-sm text-lab-green hover:bg-lab-green/10"
        >
          {t('storeOrder.whatsapp')}
        </a>
      )}
      {email && orderNumber && (
        <button
          type="button"
          onClick={() =>
            downloadStoreOrderInvoice(orderNumber, email).catch(() => {
              /* shown via parent error state if needed */
            })
          }
          className="rounded border border-dark-border px-3 py-2 text-sm hover:border-lab-cyan"
        >
          {t('storeOrder.downloadInvoice')}
        </button>
      )}
    </div>
  )
}

export default function StoreOrderPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const numberParam = searchParams.get('number') || ''
  const paidBanner = searchParams.get('paid') === '1'
  const codBanner = searchParams.get('cod') === '1'
  const { chargily, whatsappUrl } = useStoreRegion()
  const { clearCart } = useCart()

  const [trackNumber, setTrackNumber] = useState(numberParam)
  const [trackEmail, setTrackEmail] = useState(() => readCheckoutEmail())
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paying, setPaying] = useState(false)
  const [invoiceLoading, setInvoiceLoading] = useState(false)

  const loadOrder = useCallback(async (number, email) => {
    if (!number?.trim() || !email?.trim()) return
    setLoading(true)
    setError('')
    try {
      const data = await trackStoreOrder(number, email)
      setOrder(data)
      if (data.customer_email && !email) {
        setTrackEmail(data.customer_email)
      }
    } catch (err) {
      setError(err.message || 'Order not found.')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }, [])

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

  useEffect(() => {
    const savedEmail = readCheckoutEmail()
    if (savedEmail && !trackEmail) setTrackEmail(savedEmail)
  }, [trackEmail])

  useEffect(() => {
    if (!numberParam) return
    const email = trackEmail || readCheckoutEmail()
    if (email && (paidBanner || codBanner || numberParam)) {
      loadOrder(numberParam, email)
    }
  }, [numberParam, paidBanner, codBanner, trackEmail, loadOrder])

  const handleTrackSubmit = async (e) => {
    e.preventDefault()
    await loadOrder(trackNumber, trackEmail)
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

  const confirmNumber = order?.order_number || numberParam
  const confirmEmail = trackEmail || order?.customer_email || readCheckoutEmail()

  return (
    <div className="page-shell">
      <StoreHeader highlight="/shop/order" />
      <main className="mx-auto max-w-2xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">{t('storeOrder.title')}</h1>

        {paidBanner && (
          <div className="mt-4 border border-lab-green/40 bg-lab-green/10 px-3 py-3 text-sm text-lab-green">
            <p>{t('storeOrder.paidBanner')}</p>
            {confirmNumber && (
              <OrderConfirmationActions
                orderNumber={confirmNumber}
                email={confirmEmail}
                whatsappUrl={whatsappUrl}
                t={t}
              />
            )}
          </div>
        )}
        {codBanner && (
          <div className="mt-4 border border-lab-cyan/40 bg-lab-cyan/10 px-3 py-3 text-sm text-lab-cyan">
            <p>{t('storeOrder.codBanner')}</p>
            {confirmNumber && (
              <OrderConfirmationActions
                orderNumber={confirmNumber}
                email={confirmEmail}
                whatsappUrl={whatsappUrl}
                t={t}
              />
            )}
          </div>
        )}

        <form onSubmit={handleTrackSubmit} className="panel mt-6 space-y-3 p-4">
          <label className="block text-xs text-dark-muted">
            {t('storeOrder.orderNumber')}
            <input
              required
              value={trackNumber}
              onChange={(e) => setTrackNumber(e.target.value)}
              placeholder="EG-SHOP-XXXXXX"
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm uppercase"
            />
          </label>
          <label className="block text-xs text-dark-muted">
            {t('storeOrder.checkoutEmail')}
            <input
              type="email"
              required
              value={trackEmail}
              onChange={(e) => setTrackEmail(e.target.value)}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? t('storeOrder.loading') : t('storeOrder.track')}
          </button>
        </form>

        {error && (
          <p className="mt-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        {order && (
          <section className="panel mt-6 p-4">
            <p className="text-xs text-dark-muted">{t('storeOrder.orderLabel')}</p>
            <h2 className="text-lg font-semibold">{order.order_number}</h2>
            <p className="mt-2 text-sm">
              {t('storeOrder.status')}:{' '}
              <span className="text-lab-cyan">{STATUS_LABEL[order.status] || order.status}</span>
              {' · '}
              {t('storeOrder.payment')}:{' '}
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
              {buildWhatsappOrderUrl(order.order_number, whatsappUrl) && (
                <a
                  href={buildWhatsappOrderUrl(order.order_number, whatsappUrl)}
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
                    await downloadStoreOrderInvoice(
                      order.order_number,
                      trackEmail || order.customer_email,
                    )
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
                    {paying ? t('storeOrder.paying') : t('storeOrder.payCard')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => retryPay('cod')}
                  disabled={paying}
                  className="w-full rounded border border-dark-border px-4 py-2 text-sm hover:border-lab-cyan"
                >
                  {t('storeOrder.payCod')}
                </button>
              </div>
            )}
          </section>
        )}

        <Link to="/shop" className="mt-6 inline-block text-sm text-dark-muted hover:underline">
          {t('storeOrder.continueShopping')}
        </Link>
      </main>
    </div>
  )
}
