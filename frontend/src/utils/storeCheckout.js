const PENDING_KEY = 'eg_store_pending_order'

/** Saved when redirecting to Chargily — cart stays until payment succeeds. */
export function savePendingStoreOrder(order) {
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({
        id: order.id,
        order_number: order.order_number,
        total_dzd: order.total_dzd,
        saved_at: Date.now(),
      }),
    )
  } catch {
    /* ignore */
  }
}

export function readPendingStoreOrder() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (!data?.id) return null
    return data
  } catch {
    return null
  }
}

export function clearPendingStoreOrder() {
  try {
    sessionStorage.removeItem(PENDING_KEY)
  } catch {
    /* ignore */
  }
}
