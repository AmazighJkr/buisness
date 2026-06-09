import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Search, X } from 'lucide-react'
import { fetchStoreProducts } from '../../api/client.js'
import { useTranslation } from '../../context/LocaleContext.jsx'

const SUGGEST_LIMIT = 8
const DEBOUNCE_MS = 280

export default function StoreSearchBar({
  value = '',
  category = '',
  onCommit,
  onProductSelect,
  placeholder,
}) {
  const { t } = useTranslation()
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const [text, setText] = useState(value)
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [menuRect, setMenuRect] = useState(null)

  useEffect(() => {
    setText(value)
  }, [value])

  const updateMenuRect = useCallback(() => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    setMenuRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 280),
    })
  }, [])

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    updateMenuRect()
  }, [open, text, suggestions.length, updateMenuRect])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updateMenuRect()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, updateMenuRect])

  useEffect(() => {
    const onDocClick = (e) => {
      const menu = document.getElementById('store-search-suggestions')
      if (rootRef.current?.contains(e.target)) return
      if (menu?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    const q = text.trim()
    if (q.length < 1) {
      setSuggestions([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = window.setTimeout(() => {
      fetchStoreProducts({ category, q })
        .then((rows) => setSuggestions((rows || []).slice(0, SUGGEST_LIMIT)))
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(debounceRef.current)
  }, [text, category])

  const commit = (q) => {
    const trimmed = (q ?? text).trim()
    setOpen(false)
    onCommit?.(trimmed)
  }

  const pickProduct = (slug) => {
    setOpen(false)
    onProductSelect?.(slug)
  }

  const ph = placeholder || t('store.searchProducts')
  const showMenu = open && menuRect && text.trim().length > 0

  const menu = showMenu && (
    <div
      id="store-search-suggestions"
      className="store-search-suggestions"
      style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
      role="listbox"
    >
      {loading && suggestions.length === 0 && (
        <p className="store-search-suggestions__empty">{t('common.loading')}</p>
      )}
      {!loading && suggestions.length === 0 && (
        <p className="store-search-suggestions__empty">{t('store.noProducts')}</p>
      )}
      <ul className="store-search-suggestions__list">
        {suggestions.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              role="option"
              className="store-search-suggestions__item"
              onClick={() => pickProduct(p.slug)}
            >
              {p.image_url && (
                <img src={p.image_url} alt="" className="store-search-suggestions__thumb" />
              )}
              <span className="store-search-suggestions__label">
                <span className="store-search-suggestions__name">{p.name}</span>
                {p.category_name && (
                  <span className="store-search-suggestions__meta">{p.category_name}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {text.trim() && (
        <button
          type="button"
          className="store-search-suggestions__all"
          onClick={() => commit(text)}
        >
          {t('store.searchSeeAll', { q: text.trim() })}
        </button>
      )}
    </div>
  )

  return (
    <>
      <div ref={rootRef} className="store-search-bar">
        <Search className="store-search-bar__icon" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            updateMenuRect()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(text)
            }
            if (e.key === 'Escape') {
              setOpen(false)
              inputRef.current?.blur()
            }
          }}
          placeholder={ph}
          className="store-search-bar__input"
          aria-label={ph}
          aria-expanded={open}
          aria-controls="store-search-suggestions"
          autoComplete="off"
        />
        {text ? (
          <button
            type="button"
            onClick={() => {
              setText('')
              setSuggestions([])
              setOpen(false)
              onCommit?.('')
              inputRef.current?.focus()
            }}
            className="store-search-bar__clear"
            aria-label={t('common.clearSearch')}
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      {menu && createPortal(menu, document.body)}
    </>
  )
}
