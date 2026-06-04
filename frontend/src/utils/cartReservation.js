const KEY = 'embeddedgrid_cart_reservation_id'

export function getCartReservationId() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function setCartReservationId(id) {
  if (!id) return
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* ignore */
  }
}

export function clearCartReservationId() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
