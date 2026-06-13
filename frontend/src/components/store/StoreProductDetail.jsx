import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Mail, MessageSquare, ShoppingBag, Truck } from 'lucide-react'
import ProductImageGallery from './ProductImageGallery.jsx'
import StoreProductCard from './StoreProductCard.jsx'
import StoreProductReviews from './StoreProductReviews.jsx'
import { fetchStoreProducts } from '../../api/client.js'
import { useTranslation } from '../../context/LocaleContext.jsx'
import { formatDzd } from '../../utils/formatMoney.js'

export default function StoreProductDetail({
  product,
  onBack,
  onAdd,
  added,
  searchQuery = '',
  categorySlug = '',
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [related, setRelated] = useState([])

  const images = product.gallery_urls?.length
    ? product.gallery_urls
    : product.image_url
      ? [product.image_url]
      : []

  const inStock = product.stock_qty > 0
  const priceMain = formatDzd(Number(product.price_dzd || 0))

  const bullets = (product.short_description || '')
    .split(/\n|•|·/)
    .map((s) => s.trim())
    .filter(Boolean)
  const useBullets = bullets.length > 1 || (product.short_description || '').includes('•')

  useEffect(() => {
    if (!product.category_slug) return
    fetchStoreProducts({ category: product.category_slug })
      .then((list) => setRelated(list.filter((p) => p.id !== product.id).slice(0, 8)))
      .catch(() => setRelated([]))
  }, [product.id, product.category_slug])

  const listQuery = buildQuery(searchQuery, categorySlug)

  return (
    <article className="amazon-product">
      <nav className="amazon-breadcrumb" aria-label="Breadcrumb">
        <Link to="/shop">{t('store.title')}</Link>
        <span aria-hidden>/</span>
        {product.category_slug ? (
          <>
            <Link to={`/shop?category=${encodeURIComponent(product.category_slug)}`}>
              {product.category_name}
            </Link>
            <span aria-hidden>/</span>
          </>
        ) : null}
        <span className="amazon-breadcrumb__current">{product.name}</span>
      </nav>

      <div className="amazon-product__core">
        <div className="amazon-product__gallery-col">
          <ProductImageGallery images={images} alt={product.name} />
        </div>

        <div className="amazon-product__info-col">
          <h1 className="amazon-product__title">{product.name}</h1>
          <p className="amazon-product__brand">
            {t('store.visitCollection')}{' '}
            <Link to={`/shop?category=${encodeURIComponent(product.category_slug || '')}`}>
              {product.category_name}
            </Link>{' '}
            {t('store.collection')}
          </p>

          {product.variants?.length > 0 && (
            <div className="amazon-product__variants">
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted">
                {t('store.models')}
              </p>
              <div className="store-product-variants store-product-variants--detail">
                {product.variants.map((v) => (
                  <div key={v.id} className="store-product-variant store-product-variant--detail">
                    {v.image_url && <img src={v.image_url} alt={v.name} />}
                    <div>
                      <p className="store-product-variant__name">{v.name}</p>
                      {v.description && (
                        <p className="store-product-variant__desc">{v.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.short_description && (
            useBullets ? (
              <ul className="amazon-product__bullets">
                {bullets.map((line) => (
                  <li key={line}>
                    <Check className="h-3.5 w-3.5 shrink-0 text-lab-cyan" aria-hidden />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-dark-muted whitespace-pre-wrap leading-relaxed">
                {product.short_description}
              </p>
            )
          )}

          <div className="amazon-buybox panel">
            <div className="amazon-buybox__price-row">
              <span className="amazon-buybox__label">Price</span>
              <span className="amazon-buybox__price">{priceMain}</span>
            </div>

            <p className="amazon-buybox__stock">
              {inStock ? (
                <>
                  <span className="text-lab-green font-semibold">In stock</span>
                  {product.stock_qty <= 10 ? ` — ${product.stock_qty} left` : ''}
                </>
              ) : (
                <span className="text-red-400 font-semibold">Currently unavailable</span>
              )}
            </p>

            <p className="amazon-buybox__ship">
              <Truck className="h-4 w-4 shrink-0 text-lab-cyan" aria-hidden />
              {t('store.deliveryAlgeria')}
            </p>

            <button
              type="button"
              disabled={!inStock}
              onClick={() => onAdd(product)}
              className={`amazon-buybox__cart-btn ${added ? 'amazon-buybox__cart-btn--added' : ''}`}
            >
              <ShoppingBag className="h-5 w-5" aria-hidden />
              {!inStock ? t('store.unavailable') : added ? t('store.inBag') : t('store.addToBag')}
            </button>

            <button
              type="button"
              disabled={!inStock}
              onClick={() => {
                onAdd(product)
                navigate('/shop/checkout', { state: { freshCheckout: true } })
              }}
              className="amazon-buybox__checkout-btn"
            >
              {t('store.buyNow')}
            </button>
          </div>
        </div>
      </div>

      <div className="amazon-product__below">
        <h2 className="amazon-related-section__title mb-3">About this item</h2>
        <div className="amazon-tab-panel panel">
          {product.description ? (
            <div className="amazon-product__description-body whitespace-pre-wrap">
              {product.description}
            </div>
          ) : (
            <p className="text-sm text-dark-muted">No detailed description yet.</p>
          )}
        </div>

        {related.length > 0 && (
          <section className="amazon-related-section mt-8">
            <h2 className="amazon-related-section__title">{t('store.related')}</h2>
            <div className="amazon-related-scroll">
              {related.map((p) => (
                <div key={p.id} className="amazon-related-scroll__item">
                  <StoreProductCard
                    product={p}
                    added={false}
                    onAdd={onAdd}
                    linkTo={`/shop/${p.slug}${listQuery}`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <section className="amazon-contact panel mt-8">
        <h2 className="text-base font-semibold">Need help with this product?</h2>
        <p className="mt-1 text-sm text-dark-muted">
          Bulk orders, custom firmware, or compatibility questions — our lab team can assist.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/command" className="btn-primary inline-flex items-center gap-2 text-sm">
            <MessageSquare className="h-4 w-4" />
            Contact via command
          </Link>
          <a
            href={`mailto:lab@embeddedgrid.dev?subject=${encodeURIComponent(`Store: ${product.name}`)}`}
            className="inline-flex items-center gap-2 rounded border border-dark-border px-4 py-2 text-sm hover:border-lab-cyan"
          >
            <Mail className="h-4 w-4 text-lab-cyan" />
            Email us
          </a>
        </div>
      </section>

      <StoreProductReviews productId={product.id} />

      <button
        type="button"
        onClick={onBack}
        className="amazon-product__back mt-6 text-sm text-dark-muted hover:text-lab-cyan"
      >
        ← Back to all products
      </button>
    </article>
  )
}

function buildQuery(q, category) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (q) params.set('q', q)
  const s = params.toString()
  return s ? `?${s}` : ''
}
