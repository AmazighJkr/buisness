import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, X } from 'lucide-react'

function productLabel(p) {
  const stock = p.stock_qty <= 0 ? ' (out of stock)' : ''
  return `${p.name}${stock}`
}

export default function StoreProductCombobox({ products, value, onChange, placeholder = 'Type to search store…' }) {
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuRect, setMenuRect] = useState(null)

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

  const updateMenuRect = () => {
    if (!rootRef.current) return
    const rect = rootRef.current.getBoundingClientRect()
    setMenuRect({
      top: rect.bottom + 2,
      left: rect.left,
      width: Math.max(rect.width, 220),
    })
  }

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null)
      return
    }
    updateMenuRect()
  }, [open, query, products.length])

  useEffect(() => {
    if (!open) {
      setQuery(selected ? productLabel(selected) : '')
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
        const menu = document.getElementById('store-product-combobox-menu')
        if (menu?.contains(e.target)) return
        setOpen(false)
      }
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

  const openMenu = () => {
    setOpen(true)
    setQuery(selected ? productLabel(selected) : query)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }

  const menu = open && menuRect && (
    <ul
      id="store-product-combobox-menu"
      className="fixed z-[200] max-h-52 overflow-y-auto border border-lab-border bg-lab-bg shadow-xl"
      style={{ top: menuRect.top, left: menuRect.left, width: menuRect.width }}
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
  )

  return (
    <>
      <div ref={rootRef} className="relative min-w-[12rem]">
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
            onFocus={openMenu}
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
              onClick={() => (open ? setOpen(false) : openMenu())}
              className="px-1.5 text-dark-muted hover:text-dark-text"
              aria-label="Toggle product list"
            >
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      {menu && createPortal(menu, document.body)}
    </>
  )
}
