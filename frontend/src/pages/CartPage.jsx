import { Link } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import StoreAlgeriaGate, { StoreNotAvailableInRegion } from '../components/store/StoreAlgeriaGate.jsx'
import { useCart } from '../hooks/useCart.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { formatDzd } from '../utils/formatMoney.js'

export default function CartPage() {
  const { t } = useTranslation()
  const { loading: regionLoading, isAlgeria } = useStoreRegion()
  const { items, itemCount, subtotalDzd, setQuantity, removeItem } = useCart()

  if (!regionLoading && !isAlgeria) {
    return <StoreNotAvailableInRegion />
  }

  return (
    <StoreAlgeriaGate loading={regionLoading}>
      <div className="page-shell">
        <StoreHeader highlight="/shop/cart" />
        <main className="mx-auto max-w-3xl p-4 sm:p-6">
          <h1 className="font-display text-2xl font-semibold">{t('cart.title')}</h1>
          <p className="mt-2 text-sm text-dark-muted">
            {itemCount} · {t('cart.pricesDzd')}
          </p>

          {items.length === 0 ? (
            <div className="panel mt-6 p-6 text-center">
            <p className="text-sm text-dark-muted">{t('cart.empty')}</p>
            <Link to="/shop" className="btn-primary mt-4 inline-block">
              {t('cart.browse')}
            </Link>
            </div>
          ) : (
            <>
              <ul className="mt-6 space-y-4">
                {items.map((row) => (
                  <li key={row.productId} className="panel flex gap-4 p-4">
                    {row.image_url ? (
                      <img src={row.image_url} alt="" className="h-20 w-20 shrink-0 object-cover" />
                    ) : (
                      <div className="h-20 w-20 shrink-0 border border-dark-border bg-dark-bg" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold">{row.name}</h2>
                      <p className="text-xs text-dark-muted">{formatDzd(row.price_dzd)} each</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <label className="text-xs text-dark-muted">
                          Qty
                          <input
                            type="number"
                            min={1}
                            max={row.stock_qty}
                            value={row.quantity}
                            onChange={(e) => setQuantity(row.productId, e.target.value)}
                            className="ml-2 w-16 border border-dark-border bg-dark-bg px-2 py-1 text-sm"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeItem(row.productId)}
                          className="text-xs text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      {formatDzd(row.price_dzd * row.quantity)}
                    </div>
                  </li>
                ))}
              </ul>

              <div className="panel mt-6 p-4">
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-dark-muted">Subtotal</span>
                  <span>{formatDzd(subtotalDzd)}</span>
                </div>
                <Link
                  to="/shop/checkout"
                  state={{ freshCheckout: true }}
                  className="btn-primary mt-4 block w-full text-center"
                >
                  {t('cart.checkout')}
                </Link>
              </div>
            </>
          )}
        </main>
      </div>
    </StoreAlgeriaGate>
  )
}
