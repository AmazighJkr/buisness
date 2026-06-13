import { Star } from 'lucide-react'

export function StarRatingInput({ value = 0, onChange, readOnly = false, size = 'sm' }) {
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : size === 'xs' ? 'h-3 w-3' : 'h-4 w-4'
  const filled = value || 0
  return (
    <div
      className="review-stars"
      role={readOnly ? 'img' : 'group'}
      aria-label={readOnly ? `${filled} out of 5 stars` : 'Rate 1 to 5 stars'}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n === value ? null : n)}
          className={`review-stars__star ${n <= filled ? 'is-filled' : ''}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star className={iconClass} fill={n <= filled ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

export default function ReviewStars({
  rating = null,
  count = 0,
  size = 'sm',
  showCount = true,
  className = '',
}) {
  const reviewCount = Number(count) || 0
  const avg =
    rating != null && rating !== '' && Number.isFinite(Number(rating))
      ? Number(rating)
      : null

  if (reviewCount <= 0 && avg == null) return null

  const rounded = avg != null ? Math.round(avg * 10) / 10 : null
  const starFill = avg != null ? Math.round(avg) : 0
  const iconClass = size === 'xs' ? 'h-3 w-3' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'

  return (
    <div
      className={`review-stars review-stars--readonly ${className}`.trim()}
      aria-label={
        avg != null ? `${rounded} out of 5 stars from ${reviewCount} reviews` : `${reviewCount} reviews`
      }
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`review-stars__icon ${iconClass} ${n <= starFill ? 'is-filled' : ''}`}
          fill={n <= starFill ? 'currentColor' : 'none'}
          aria-hidden
        />
      ))}
      {showCount && reviewCount > 0 && (
        <span className="review-stars__count">
          {rounded != null ? `${rounded.toFixed(1)} ` : ''}
          ({reviewCount})
        </span>
      )}
    </div>
  )
}
