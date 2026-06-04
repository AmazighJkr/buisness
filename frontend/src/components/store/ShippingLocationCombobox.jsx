import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'
import { searchShippingLocations } from '../../api/client.js'
import { useTranslation } from '../../context/LocaleContext.jsx'

function locationLabel(row) {
  if (!row) return ''
  const city = row.city ? ` — ${row.city}` : ''
  return `${row.postal_code}${city} (${row.wilaya_name})`
}

export default function ShippingLocationCombobox({ value, onChange, wilayaId = '' }) {
  const { t } = useTranslation()
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [menuRect, setMenuRect] = useState(null)

  const selected = useMemo(() => {
    if (!value?.postal_code) return null
    return value
  }, [value])

  const updateMenuRect = () => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    setMenuRect({
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 280),
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    updateMenuRect()
  }, [open, query, results.length])

  useEffect(() => {
    if (!open) {
      setQuery(selected ? locationLabel(selected) : '')
    }
  }, [open, selected])

  useEffect(() => {
    if (!open) return
    const onScrollOrResize = () => updateMenuRect()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open])

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        const menu = document.getElementById('shipping-location-combobox-menu')
        if (menu?.contains(e.target)) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const q = query.trim()
    if (q.length < 1) {
      setResults([])
      setLoading(false)
      return undefined
    }
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      searchShippingLocations(q, wilayaId || null)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 220)
    return () => clearTimeout(debounceRef.current)
  }, [query, open, wilayaId])

  const pick = (row) => {
    onChange(row)
    setOpen(false)
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange(null)
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  const openMenu = () => {
    setOpen(true)
    setQuery(selected ? locationLabel(selected) : query)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  const menu = open && menuRect && (
    <ul
      id="shipping-location-combobox-menu"
      className="fixed z-[200] max-h-52 overflow-y-auto border border-lab-border bg-lab-bg shadow-xl"
      style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
      role="listbox"
    >
      {loading && (
        <li className="px-2 py-2 text-xs text-dark-muted">{t('checkout.searchingLocations')}</li>
      )}
      {!loading && query.trim().length < 1 && (
        <li className="px-2 py-2 text-xs text-dark-muted">{t('checkout.searchLocationHint')}</li>
      )}
      {!loading && query.trim().length >= 1 && results.length === 0 && (
        <li className="px-2 py-2 text-xs text-dark-muted">{t('checkout.noLocationMatch')}</li>
      )}
      {!loading &&
        results.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              role="option"
              aria-selected={row.postal_code === value?.postal_code && row.wilaya === value?.wilaya}
              onClick={() => pick(row)}
              className={`w-full px-2 py-1.5 text-left text-xs hover:bg-dark-panel ${
                row.postal_code === value?.postal_code && row.wilaya === value?.wilaya
                  ? 'bg-dark-panel text-lab-cyan'
                  : 'text-dark-text'
              }`}
            >
              <span className="font-mono">{row.postal_code}</span>
              {row.city ? ` — ${row.city}` : ''}
              <span className="mt-0.5 block truncate text-[10px] text-dark-muted">{row.wilaya_name}</span>
              {!row.has_home && !row.has_bureau && (
                <span className="mt-0.5 block text-[10px] text-amber-300">{t('checkout.noRatesYet')}</span>
              )}
            </button>
          </li>
        ))}
    </ul>
  )

  return (
    <>
      <div ref={rootRef} className="relative">
        <div className="relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={open ? query : selected ? locationLabel(selected) : query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!open) setOpen(true)
              if (value && e.target.value !== locationLabel(selected)) {
                onChange(null)
              }
            }}
            onFocus={openMenu}
            placeholder={t('checkout.searchLocationPlaceholder')}
            className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-lab-cyan"
            autoComplete="off"
            required={!selected}
          />
          <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center">
            {value && (
              <button
                type="button"
                onClick={clear}
                className="px-1 text-dark-muted hover:text-dark-text"
                aria-label={t('checkout.clearLocation')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => (open ? setOpen(false) : openMenu())}
              className="px-1.5 text-dark-muted hover:text-dark-text"
              aria-label={t('checkout.toggleLocationList')}
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      {menu && createPortal(menu, document.body)}
    </>
  )
}
