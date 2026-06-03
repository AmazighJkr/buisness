import { useEffect, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { adminSearchAmazon } from '../../api/client.js'

const MARKETPLACES = [{ id: 'amazon.com', label: 'Amazon' }]

export default function AmazonProductPickerModal({ open, initialQuery = '', onClose, onSelect }) {
  const [marketplace, setMarketplace] = useState('amazon.com')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setQuery(initialQuery.trim())
    setResults([])
    setError('')
  }, [open, initialQuery])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const runSearch = async (searchTerm) => {
    const q = (searchTerm ?? query).trim()
    if (q.length < 2) {
      setError('Enter at least 2 characters.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await adminSearchAmazon(q, marketplace)
      setResults(data.results || [])
      if (!data.results?.length) setError('No products found. Try different keywords.')
    } catch (err) {
      setResults([])
      setError(err.message || 'Search failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!open || initialQuery.trim().length < 2) return
    runSearch(initialQuery.trim())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="amazon-picker-title"
      onClick={onClose}
    >
      <div
        className="panel flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-dark-border px-4 py-3">
          <h2 id="amazon-picker-title" className="text-sm font-medium">
            Find product link
          </h2>
          <button type="button" onClick={onClose} className="text-dark-muted hover:text-dark-text" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 border-b border-dark-border px-4 py-3">
          <p className="text-[10px] text-dark-muted">Marketplace</p>
          <div className="flex flex-wrap gap-2">
            {MARKETPLACES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMarketplace(m.id)}
                className={`border px-3 py-1 text-xs ${
                  marketplace === m.id
                    ? 'border-lab-cyan text-lab-cyan'
                    : 'border-dark-border text-dark-muted'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              runSearch()
            }}
          >
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Amazon…"
              className="input-field flex-1 text-sm"
              autoFocus
            />
            <button type="submit" disabled={loading} className="btn-primary shrink-0 px-3 py-2 text-xs">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </form>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {loading && results.length === 0 && (
            <li className="px-2 py-6 text-center text-xs text-dark-muted animate-pulse">Searching…</li>
          )}
          {!loading &&
            results.map((item) => (
              <li key={item.asin || item.url}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(item)
                    onClose()
                  }}
                  className="flex w-full gap-3 border border-transparent px-2 py-2 text-left text-xs panel-hover hover:border-dark-border"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="h-14 w-14 shrink-0 object-contain bg-dark-bg"
                    />
                  ) : (
                    <div className="h-14 w-14 shrink-0 bg-dark-bg" aria-hidden />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 font-medium text-dark-text">{item.title}</span>
                    {item.price && <span className="mt-1 block text-dark-muted">{item.price}</span>}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
