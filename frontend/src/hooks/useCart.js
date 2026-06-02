import { useCallback, useEffect, useState } from 'react'

const CART_KEY = 'embeddedgrid_cart'

function readCart() {
  try {
    const raw = localStorage.getItem(CART_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event('cart-updated'))
}

export function useCart() {
  const [items, setItems] = useState(readCart)

  useEffect(() => {
    const sync = () => setItems(readCart())
    window.addEventListener('cart-updated', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('cart-updated', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const persist = useCallback((next) => {
    writeCart(next)
    setItems(next)
  }, [])

  const addItem = useCallback((product, quantity = 1) => {
    const qty = Math.max(1, Number(quantity) || 1)
    const current = readCart()
    const idx = current.findIndex((row) => row.productId === product.id)
    const row = {
      productId: product.id,
      name: product.name,
      slug: product.slug,
      image_url: product.image_url || '',
      price_usd: Number(product.price_usd || 0),
      price_dzd: Number(product.price_dzd || 0),
      stock_qty: Number(product.stock_qty || 0),
      quantity: qty,
    }
    if (idx >= 0) {
      const merged = [...current]
      merged[idx] = {
        ...merged[idx],
        ...row,
        quantity: Math.min(merged[idx].stock_qty || row.stock_qty, merged[idx].quantity + qty),
      }
      persist(merged)
      return
    }
    row.quantity = Math.min(row.stock_qty, qty)
    persist([...current, row])
  }, [persist])

  const setQuantity = useCallback((productId, quantity) => {
    const qty = Math.max(0, Number(quantity) || 0)
    const current = readCart()
    if (qty === 0) {
      persist(current.filter((row) => row.productId !== productId))
      return
    }
    persist(
      current.map((row) =>
        row.productId === productId
          ? { ...row, quantity: Math.min(row.stock_qty, qty) }
          : row,
      ),
    )
  }, [persist])

  const removeItem = useCallback((productId) => {
    persist(readCart().filter((row) => row.productId !== productId))
  }, [persist])

  const clearCart = useCallback(() => {
    persist([])
  }, [persist])

  const itemCount = items.reduce((sum, row) => sum + row.quantity, 0)
  const subtotalUsd = items.reduce((sum, row) => sum + row.price_usd * row.quantity, 0)
  const subtotalDzd = items.reduce((sum, row) => sum + row.price_dzd * row.quantity, 0)

  return {
    items,
    itemCount,
    subtotalUsd,
    subtotalDzd,
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }
}
