import { Link } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { formatDzd } from '../../utils/formatMoney.js'

export default function StoreProductCard({ product, added, onAdd, linkTo }) {
  const inStock = product.stock_qty > 0
  const priceMain = formatDzd(Number(product.price_dzd || 0))
  const href = linkTo || `/shop/${product.slug}`

  return (
    <article className="store-product-card">
      <Link to={href} className="store-product-card__media">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} loading="lazy" />
        ) : (
          <div className="store-product-card__media-empty" aria-hidden />
        )}
        <div className="store-product-card__badges">
          {product.is_featured && <span className="store-badge store-badge--featured">Featured</span>}
          {!inStock && <span className="store-badge store-badge--sold">Sold out</span>}
        </div>
      </Link>

      <div className="store-product-card__body">
        <Link to={href} className="block hover:text-lab-cyan">
          <p className="store-product-card__collection">{product.category_name}</p>
          <h2 className="store-product-card__title">{product.name}</h2>
        </Link>
        {(product.short_description || product.description) && (
          <p className="store-product-card__desc line-clamp-3">
            {product.short_description || product.description}
          </p>
        )}

        <div className="store-product-card__footer">
          <div className="store-product-card__price">
            <span className="store-product-card__price-main">{priceMain}</span>
          </div>
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
            <span>{!inStock ? 'Unavailable' : added ? 'In bag' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
