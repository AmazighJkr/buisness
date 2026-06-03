import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

function productLabel(p) {
  const stock = p.stock_qty <= 0 ? ' (out of stock)' : ''
  return `${p.name}${stock}`
}

export default function StoreProductCombobox({ products, value, onChange, placeholder = 'Search store…' }) {
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selected = useMemo(
    () => products.find((p) => p.id === value) || null,
    [products, value],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => {
      const name = (p.name || '').toLowerCase()
      const slug = (p.slug || '').toLowerCase()
      const cat = (p.category_name || '').toLowerCase()
      return name.includes(q) || slug.includes(q) || cat.includes(q)
    })
  }, [products, query])

  useEffect(() => {
    if (!open) {
      setQuery(selected ? productLabel(selected) : '')
    }
  }, [open, selected])

  useEffect(() => {
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const pick = (productId) => {
    onChange(productId || '')
    setOpen(false)
  }

  const clear = (e) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative min-w-[11rem]">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : selected ? productLabel(selected) : query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
            if (value && e.target.value !== productLabel(selected)) {
              onChange('')
            }
          }}
          onFocus={() => {
            setOpen(true)
            setQuery(selected ? productLabel(selected) : query)
          }}
          placeholder={placeholder}
          className="w-full border border-lab-border bg-lab-bg py-1 pl-2 pr-14 text-xs outline-none focus:border-lab-cyan"
          autoComplete="off"
        />
        <div className="absolute right-0 flex items-center">
          {value && (
            <button
              type="button"
              onClick={clear}
              className="px-1 text-dark-muted hover:text-dark-text"
              aria-label="Clear store product"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v)
              if (!open) inputRef.current?.focus()
            }}
            className="px-1.5 text-dark-muted hover:text-dark-text"
            aria-label="Toggle product list"
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <ul
          className="absolute z-20 mt-0.5 max-h-44 w-full overflow-y-auto border border-lab-border bg-lab-bg shadow-lg"
          role="listbox"
        >
          <li>
            <button
              type="button"
              onClick={() => pick('')}
              className="w-full px-2 py-1.5 text-left text-xs text-dark-muted hover:bg-dark-panel"
            >
              — None —
            </button>
          </li>
          {filtered.length === 0 ? (
            <li className="px-2 py-2 text-xs text-dark-muted">No matching products</li>
          ) : (
            filtered.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={p.id === value}
                  onClick={() => pick(p.id)}
                  className={`w-full px-2 py-1.5 text-left text-xs hover:bg-dark-panel ${
                    p.id === value ? 'bg-dark-panel text-lab-cyan' : 'text-dark-text'
                  }`}
                >
                  {productLabel(p)}
                  {p.category_name && (
                    <span className="mt-0.5 block truncate text-[10px] text-dark-muted">{p.category_name}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
