import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import StoreHeader from '../components/StoreHeader.jsx'
import SidebarRail from '../components/SidebarRail.jsx'
import StoreSearchBar from '../components/store/StoreSearchBar.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
import StoreCategorySidebar from '../components/store/StoreCategorySidebar.jsx'
import StoreProductCard from '../components/store/StoreProductCard.jsx'
import StoreProductDetail from '../components/store/StoreProductDetail.jsx'
import { fetchStoreCategories, fetchStoreProduct, fetchStoreProducts } from '../api/client.js'
import StoreAlgeriaGate, { StoreNotAvailableInRegion } from '../components/store/StoreAlgeriaGate.jsx'
import { useCart } from '../hooks/useCart.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'
import { useStoreSidebar } from '../hooks/useStoreSidebar.js'

export default function ShopPage() {
  const { t } = useTranslation()
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
  const [expandedCats, setExpandedCats] = useState({})
  const { loading: regionLoading, isAlgeria } = useStoreRegion()
  const activeCategory =
    categories.find((c) => c.slug === categoryParam)
    || categories.flatMap((c) => c.children || []).find((c) => c.slug === categoryParam)
  const refreshStoreData = () => {
    if (!isAlgeria) return
    fetchStoreCategories().then(setCategories).catch(() => {})
    if (productSlug) {
      fetchStoreProduct(productSlug).then(setProduct).catch(() => setProduct(null))
    } else {
      fetchStoreProducts({ category: categoryParam, q: queryParam.trim() })
        .then(setProducts)
        .catch(() => setProducts([]))
    }
  }

  useEffect(() => {
    if (!isAlgeria) return
    fetchStoreCategories().then(setCategories).catch(() => [])
  }, [isAlgeria])

  useEffect(() => {
    if (!isAlgeria) return undefined
    const onFocus = () => refreshStoreData()
    window.addEventListener('focus', onFocus)
    const id = window.setInterval(refreshStoreData, 45000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(id)
    }
  }, [isAlgeria, productSlug, categoryParam, queryParam])

  useEffect(() => {
    if (!isAlgeria || productSlug) return
    setLoadingList(true)
    setError('')
    fetchStoreProducts({ category: categoryParam, q: queryParam.trim() })
      .then(setProducts)
      .catch((err) => {
        setProducts([])
        setError(err.message || t('store.loadError'))
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
        setError(t('store.notFound'))
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
        subheader={<StoreSearchBar value={queryParam} onChange={setQuery} />}
      />

      <div className="flex min-h-0 flex-1">
        {!sidebarOpen && (
          <SidebarRail onOpen={() => setSidebarOpen(true)} controlsId="store-category-sidebar" />
        )}

        <StoreCategorySidebar
          id="store-category-sidebar"
          categories={categories}
          expanded={expandedCats}
          onToggleExpand={(id) =>
            setExpandedCats((prev) => ({ ...prev, [id]: !prev[id] }))
          }
          selectedSlug={categoryParam}
          onSelectCategory={selectCategory}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="store-main-column min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          <div className="px-3 py-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
            {productSlug ? (
              loadingProduct ? (
                <p className="text-sm text-dark-muted animate-pulse">{t('store.loadingProduct')}</p>
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
                  <p className="text-sm text-dark-muted">{error || t('store.notFound')}</p>
                  <button type="button" onClick={backToList} className="btn-primary mt-4">
                    {t('store.backToStore')}
                  </button>
                </div>
              )
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h1 className="font-display text-xl font-semibold sm:text-2xl">{t('store.title')}</h1>
                    <p className="mt-1 text-sm text-dark-muted">
                      {activeCategory
                        ? activeCategory.name
                        : queryParam
                          ? t('store.resultsFor', { q: queryParam })
                          : t('store.defaultSubtitle')}
                    </p>
                  </div>
                  <Link to="/store" className="text-sm text-lab-cyan hover:underline">
                    {t('nav.storeHome')}
                  </Link>
                </div>

                {error && <p className="store-alert store-alert--error mb-4">{error}</p>}

                {loadingList ? (
                  <div className="store-grid store-grid--catalog">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="store-skeleton store-skeleton--tall" />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <div className="panel p-8 text-center">
                    <p className="text-sm text-dark-muted">{t('store.noProducts')}</p>
                  </div>
                ) : (
                  <div className="store-grid store-grid--catalog">
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
