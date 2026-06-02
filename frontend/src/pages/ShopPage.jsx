import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { fetchStoreCategories, fetchStoreProducts } from '../api/client.js'
import { useCart } from '../hooks/useCart.js'
import { formatDzd, formatUsd } from '../utils/formatMoney.js'

export default function ShopPage() {
  const { addItem, itemCount } = useCart()
  const [addedId, setAddedId] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStoreCategories().then(setCategories).catch(() => [])
  }, [])

  useEffect(() => {
    setLoading(true)
    setError('')
    fetchStoreProducts({ category: selectedCategory, q: query.trim() })
      .then(setProducts)
      .catch((err) => {
        setProducts([])
        setError(err.message || 'Could not load store products.')
      })
      .finally(() => setLoading(false))
  }, [selectedCategory, query])

  const categoryLabel = useMemo(() => {
    if (!selectedCategory) return 'All categories'
    return categories.find((c) => c.slug === selectedCategory)?.name || 'Category'
  }, [categories, selectedCategory])

  return (
    <div className="page-shell">
      <PageHeader highlight="/shop" />
      <main className="mx-auto max-w-6xl p-4 sm:p-6">
        <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Shop</h1>
            <p className="mt-2 text-sm text-dark-muted">
              Browse ready-to-order electronics and embedded products.
            </p>
          </div>
          {itemCount > 0 && (
            <Link to="/shop/cart" className="btn-primary text-sm">
              View cart ({itemCount})
            </Link>
          )}
        </section>

        <section className="mb-5 grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-dark-muted">
            Category
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="sm:col-span-2 text-xs text-dark-muted">
            Search
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
            />
          </label>
        </section>

        <p className="mb-3 text-xs text-dark-muted">
          {categoryLabel} · {products.length} product{products.length === 1 ? '' : 's'}
        </p>

        {error && <p className="mb-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        {loading ? (
          <p className="text-sm text-dark-muted animate-pulse">Loading products...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-dark-muted">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((p) => (
              <article key={p.id} className="panel overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-44 w-full object-cover" />
                ) : (
                  <div className="h-44 w-full border-b border-dark-border bg-dark-bg" />
                )}
                <div className="p-4">
                  <p className="text-xs text-dark-muted">{p.category_name}</p>
                  <h2 className="mt-1 text-lg font-semibold">{p.name}</h2>
                  <p className="mt-2 text-sm text-dark-muted">{p.short_description || p.description || 'No description yet.'}</p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{formatUsd(Number(p.price_usd || 0))}</p>
                      <p className="text-xs text-dark-muted">{formatDzd(Number(p.price_dzd || 0))}</p>
                    </div>
                    <p className="text-xs text-dark-muted">
                      Stock: <span className={p.stock_qty > 0 ? 'text-lab-green' : 'text-red-400'}>{p.stock_qty}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={p.stock_qty < 1}
                    onClick={() => {
                      addItem(p, 1)
                      setAddedId(p.id)
                      setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 2000)
                    }}
                    className="btn-primary mt-4 w-full text-sm disabled:opacity-40"
                  >
                    {p.stock_qty < 1 ? 'Out of stock' : addedId === p.id ? 'Added!' : 'Add to cart'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
