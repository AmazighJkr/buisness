import { useEffect, useState } from 'react'
import SectionBox from './SectionBox.jsx'
import { StarRatingInput } from './ReviewStars.jsx'

export default function CustomerReviews({
  title = 'Customer reviews',
  emptyText = 'No reviews yet.',
  namePlaceholder = 'Name (optional)',
  textPlaceholder = 'Share your experience (optional)…',
  submitLabel = 'Post review',
  needRatingOrText = 'Add a star rating and/or written review.',
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
    const trimmed = text.trim()
    if (!trimmed && !rating) {
      setError(needRatingOrText)
      return
    }
    setSubmitting(true)
    try {
      const created = await onSubmit({
        author_name: authorName,
        text: trimmed,
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
                {r.rating ? <StarRatingInput value={r.rating} readOnly size="sm" /> : null}
              </div>
              {r.text ? <p className="mt-1 text-sm text-dark-muted">{r.text}</p> : null}
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="customer-reviews__form mt-4 space-y-3 border-t border-dark-border pt-4">
        <StarRatingInput value={rating} onChange={setRating} />
        <input
          placeholder={namePlaceholder}
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          className="input-field text-sm"
        />
        <textarea
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
