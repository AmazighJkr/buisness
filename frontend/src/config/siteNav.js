/** Site navigation — Lab and Store are separate areas. */

export const NAV_LAB = [
  { to: '/projects', label: 'Projects' },
  { to: '/subscriptions', label: 'Subscriptions' },
  { to: '/command', label: 'Submit command' },
  { to: '/track', label: 'Track' },
]

export const NAV_STORE = [
  { to: '/shop', label: 'All products' },
  { to: '/shop/order', label: 'Order status' },
]

export function navLinkActive(highlight, to) {
  if (to === '/shop') {
    return highlight === '/shop' || (highlight.startsWith('/shop/') && !highlight.startsWith('/shop/order') && !highlight.startsWith('/shop/cart') && !highlight.startsWith('/shop/checkout'))
  }
  if (to === '/shop/order') return highlight === '/shop/order' || highlight.startsWith('/shop/order')
  return highlight === to
}

export function isStoreRoute(pathname = '') {
  return pathname === '/shop' || pathname.startsWith('/shop/')
}
