import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { useTranslation } from '../../context/LocaleContext.jsx'
import { formatDzd } from '../../utils/formatMoney.js'

import ReviewStars from '../ReviewStars.jsx'

export default function StoreProductCard({
  product,
  added,
  onAdd,
  linkTo,
  showAdd = true,
}) {
  const { t } = useTranslation()
  const inStock = product.stock_qty > 0
  const priceMain = formatDzd(Number(product.price_dzd || 0))
  const href = linkTo || `/shop/${product.slug}`
  const categoryLabel = product.parent_category_name
    ? `${product.parent_category_name} · ${product.category_name}`
    : product.category_name

  return (
    <article className="store-product-card">
      <Link to={href} className="store-product-card__media">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="store-product-card__media-empty" aria-hidden />
        )}
        <div className="store-product-card__badges">
          {product.is_featured && (
            <span className="store-badge store-badge--featured">{t('store.featured')}</span>
          )}
          {!inStock && <span className="store-badge store-badge--sold">{t('store.soldOut')}</span>}
        </div>
      </Link>

      <div className="store-product-card__body">
        <Link to={href} className="block hover:text-lab-cyan">
          {categoryLabel && <p className="store-product-card__collection">{categoryLabel}</p>}
          <h2 className="store-product-card__title">{product.name}</h2>
        </Link>
        <ReviewStars rating={product.review_avg} count={product.review_count} size="xs" className="mt-1" />
        {(product.short_description || product.description) && (
          <p className="store-product-card__desc">
            {product.short_description || product.description}
          </p>
        )}

        <div className="store-product-card__footer">
          <div className="store-product-card__price">
            <span className="store-product-card__price-main">{priceMain}</span>
          </div>
          {showAdd && onAdd && (
            <button
              type="button"
              disabled={!inStock}
              onClick={(e) => {
                e.preventDefault()
                onAdd(product)
              }}
              className={`store-product-card__cta ${added ? 'store-product-card__cta--added' : ''}`}
            >
              <ShoppingBag className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                {!inStock ? t('store.unavailable') : added ? t('store.inBag') : t('store.add')}
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
