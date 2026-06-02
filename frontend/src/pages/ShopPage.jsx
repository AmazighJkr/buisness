import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import StoreHeader from '../components/StoreHeader.jsx'
import StoreCategorySidebar from '../components/store/StoreCategorySidebar.jsx'
import StoreProductCard from '../components/store/StoreProductCard.jsx'
import StoreProductDetail from '../components/store/StoreProductDetail.jsx'
import { fetchStoreCategories, fetchStoreProduct, fetchStoreProducts } from '../api/client.js'
import StoreAlgeriaGate, { StoreNotAvailableInRegion } from '../components/store/StoreAlgeriaGate.jsx'
import { useCart } from '../hooks/useCart.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { useStoreSidebar } from '../hooks/useStoreSidebar.js'

export default function ShopPage() {
  const { productSlug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const categoryParam = searchParams.get('category') || ''
  const queryParam = searchParams.get('q') || ''

  const [sidebarOpen, setSidebarOpen] = useStoreSidebar()
  const { addItem } = useCart()
  const [addedId, setAddedId] = useState(null)
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [product, setProduct] = useState(null)
  const [loadingList, setLoadingList] = useState(true)
  const [loadingProduct, setLoadingProduct] = useState(false)
  const [error, setError] = useState('')
  const { loading: regionLoading, isAlgeria } = useStoreRegion()
  const activeCategory = categories.find((c) => c.slug === categoryParam)

  useEffect(() => {
    if (!isAlgeria) return
    fetchStoreCategories().then(setCategories).catch(() => [])
  }, [isAlgeria])

  useEffect(() => {
    if (!isAlgeria || productSlug) return
    setLoadingList(true)
    setError('')
    fetchStoreProducts({ category: categoryParam, q: queryParam.trim() })
      .then(setProducts)
      .catch((err) => {
        setProducts([])
        setError(err.message || 'Could not load products.')
      })
      .finally(() => setLoadingList(false))
  }, [isAlgeria, productSlug, categoryParam, queryParam])

  useEffect(() => {
    if (!isAlgeria || !productSlug) {
      setProduct(null)
      return
    }
    setLoadingProduct(true)
    setError('')
    fetchStoreProduct(productSlug)
      .then(setProduct)
      .catch(() => {
        setProduct(null)
        setError('Product not found.')
      })
      .finally(() => setLoadingProduct(false))
  }, [isAlgeria, productSlug])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const lock = () => {
      if (mq.matches && sidebarOpen) document.body.style.overflow = 'hidden'
      else document.body.style.overflow = ''
    }
    lock()
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const updateParams = (next) => {
    const params = new URLSearchParams(searchParams)
    if (next.category !== undefined) {
      if (next.category) params.set('category', next.category)
      else params.delete('category')
    }
    if (next.q !== undefined) {
      if (next.q) params.set('q', next.q)
      else params.delete('q')
    }
    setSearchParams(params, { replace: true })
  }

  const selectCategory = (slug) => {
    updateParams({ category: slug })
    navigate(`/shop${buildShopQuery(slug, queryParam)}`)
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  const setQuery = (q) => {
    updateParams({ q })
    if (productSlug) {
      navigate(`/shop/${productSlug}${buildShopQuery(categoryParam, q)}`)
    }
  }

  const backToList = () => {
    navigate(`/shop${buildShopQuery(categoryParam, queryParam)}`)
  }

  const handleAdd = (p) => {
    addItem(p, 1)
    setAddedId(p.id)
    setTimeout(() => setAddedId((cur) => (cur === p.id ? null : cur)), 2200)
  }

  const listQuery = buildShopQuery(categoryParam, queryParam)

  if (!regionLoading && !isAlgeria) {
    return <StoreNotAvailableInRegion />
  }

  return (
    <StoreAlgeriaGate loading={regionLoading}>
    <div className="page-shell flex min-h-screen min-h-[100dvh] flex-col">
      <StoreHeader
        highlight={productSlug ? `/shop/${productSlug}` : '/shop'}
        searchValue={queryParam}
        onSearchChange={setQuery}
        headerStart={
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="theme-toggle-btn site-header-categories-btn flex shrink-0 items-center gap-1.5 !px-2.5"
            aria-expanded={sidebarOpen}
            aria-controls="store-category-sidebar"
            aria-label={sidebarOpen ? 'Hide categories' : 'Show categories'}
          >
            <PanelLeft className="h-5 w-5 shrink-0" />
            <span className="hidden text-xs lg:inline">{sidebarOpen ? 'Hide' : 'Categories'}</span>
          </button>
        }
      />

      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="flex w-full items-center justify-center gap-2 border-b border-dark-border bg-dark-panel px-3 py-2.5 text-sm text-dark-text lg:hidden"
        >
          <PanelLeft className="h-4 w-4 text-dark-muted" />
          Browse categories
        </button>
      )}

      <div className="flex min-h-0 flex-1">
        <StoreCategorySidebar
          id="store-category-sidebar"
          categories={categories}
          selectedSlug={categoryParam}
          onSelectCategory={selectCategory}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="store-main-column min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="px-3 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
            {productSlug ? (
              loadingProduct ? (
                <p className="text-sm text-dark-muted animate-pulse">Loading product…</p>
              ) : product ? (
                <StoreProductDetail
                  product={product}
                  onBack={backToList}
                  onAdd={handleAdd}
                  added={addedId === product.id}
                  searchQuery={queryParam}
                  categorySlug={categoryParam}
                />
              ) : (
                <div className="panel p-6 text-center">
                  <p className="text-sm text-dark-muted">{error || 'Product not found.'}</p>
                  <button type="button" onClick={backToList} className="btn-primary mt-4">
                    Back to store
                  </button>
                </div>
              )
            ) : (
              <>
                <div className="mb-4">
                  <h1 className="font-display text-xl font-semibold sm:text-2xl">Store</h1>
                  <p className="mt-1 text-sm text-dark-muted">
                    {activeCategory
                      ? activeCategory.name
                      : queryParam
                        ? `Results for “${queryParam}”`
                        : 'Hardware and modules ready to ship'}
                  </p>
                </div>

                {error && <p className="store-alert store-alert--error mb-4">{error}</p>}

                {loadingList ? (
                  <div className="store-grid">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="store-skeleton" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="panel p-8 text-center">
                    <p className="text-sm text-dark-muted">No products match your filters.</p>
                  </div>
                ) : (
                  <div className="store-grid">
                    {products.map((p) => (
                      <StoreProductCard
                        key={p.id}
                        product={p}
                        added={addedId === p.id}
                        onAdd={handleAdd}
                        linkTo={`/shop/${p.slug}${listQuery}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
    </StoreAlgeriaGate>
  )
}

function buildShopQuery(category, q) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (q) params.set('q', q)
  const s = params.toString()
  return s ? `?${s}` : ''
}
