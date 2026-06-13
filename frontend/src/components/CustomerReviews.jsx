import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import SectionBox from './SectionBox.jsx'

function StarRating({ value = 0, onChange, readOnly = false, size = 'sm' }) {
  const iconClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  return (
    <div className="customer-reviews__stars" role={readOnly ? 'img' : 'group'} aria-label={readOnly ? `${value} stars` : 'Rate 1 to 5 stars'}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n === value ? null : n)}
          className={`customer-reviews__star ${n <= (value || 0) ? 'is-filled' : ''}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star className={iconClass} fill={n <= (value || 0) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

export default function CustomerReviews({
  title = 'Customer reviews',
  emptyText = 'No reviews yet.',
  namePlaceholder = 'Name (optional)',
  textPlaceholder = 'Share your experience…',
  submitLabel = 'Post review',
  reviews: initial = [],
  onSubmit,
}) {
  const [reviews, setReviews] = useState(initial)
  const [authorName, setAuthorName] = useState('')
  const [text, setText] = useState('')
  const [rating, setRating] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setReviews(initial)
  }, [initial])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const created = await onSubmit({
        author_name: authorName,
        text,
        rating: rating || null,
      })
      setReviews((prev) => [...prev, created])
      setText('')
      setRating(null)
    } catch (err) {
      setError(err.message || 'Could not post review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SectionBox title={title}>
      <div className="customer-reviews__list max-h-64 space-y-3 overflow-y-auto">
        {reviews.length === 0 ? (
          <p className="text-xs text-dark-muted">{emptyText}</p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="customer-reviews__item lab-thread-entry">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-dark-text">{r.author_name}</span>
                {r.rating ? <StarRating value={r.rating} readOnly size="sm" /> : null}
              </div>
              <p className="mt-1 text-sm text-dark-muted">{r.text}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="customer-reviews__form mt-4 space-y-3 border-t border-dark-border pt-4">
        <StarRating value={rating} onChange={setRating} />
        <input
          placeholder={namePlaceholder}
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="input-field text-sm"
        />
        <textarea
          required
          rows={3}
          placeholder={textPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field resize-y text-sm min-h-[5rem]"
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button type="submit" disabled={submitting} className="btn-primary text-sm">
          {submitting ? '…' : submitLabel}
        </button>
      </form>
    </SectionBox>
  )
}
