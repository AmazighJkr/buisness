import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useCart } from '../hooks/useCart.js'
import { formatDzd, formatUsd } from '../utils/formatMoney.js'

export default function CartPage() {
  const { items, itemCount, subtotalUsd, subtotalDzd, setQuantity, removeItem } = useCart()

  return (
    <div className="page-shell">
      <PageHeader highlight="/shop" />
      <main className="mx-auto max-w-3xl p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Cart</h1>
        <p className="mt-2 text-sm text-dark-muted">
          {itemCount} item{itemCount === 1 ? '' : 's'}
        </p>

        {items.length === 0 ? (
          <div className="panel mt-6 p-6 text-center">
            <p className="text-sm text-dark-muted">Your cart is empty.</p>
            <Link to="/shop" className="btn-primary mt-4 inline-block">
              Browse shop
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
                    <p className="text-xs text-dark-muted">
                      {formatUsd(row.price_usd)} · {formatDzd(row.price_dzd)}
                    </p>
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
                  <div className="text-right text-sm">
                    <p className="font-semibold">{formatUsd(row.price_usd * row.quantity)}</p>
                    <p className="text-xs text-dark-muted">{formatDzd(row.price_dzd * row.quantity)}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="panel mt-6 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-dark-muted">Subtotal</span>
                <div className="text-right">
                  <p className="font-semibold">{formatUsd(subtotalUsd)}</p>
                  <p className="text-xs text-dark-muted">{formatDzd(subtotalDzd)}</p>
                </div>
              </div>
              <Link to="/shop/checkout" className="btn-primary mt-4 block w-full text-center">
                Checkout
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
