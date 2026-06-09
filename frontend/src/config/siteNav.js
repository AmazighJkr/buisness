/** Site navigation — Lab and Store are separate areas. Labels use i18n keys. */

export const NAV_LAB = [
  { to: '/projects', labelKey: 'nav.projects' },
  { to: '/subscriptions', labelKey: 'nav.subscriptions' },
  { to: '/command', labelKey: 'nav.submitCommand' },
  { to: '/track', labelKey: 'nav.track' },
]

export const NAV_STORE = [
  { to: '/store', labelKey: 'nav.storeHome' },
  { to: '/shop', labelKey: 'nav.allProducts' },
  { to: '/shop/order', labelKey: 'nav.orderStatus' },
]

export function navLinkActive(highlight, to) {
  if (to === '/store') {
    return highlight === '/store'
  }
  if (to === '/shop') {
    return (
      highlight === '/shop' ||
      (highlight.startsWith('/shop/') &&
        !highlight.startsWith('/shop/order') &&
        !highlight.startsWith('/shop/cart') &&
        !highlight.startsWith('/shop/checkout'))
    )
  }
  if (to === '/shop/order') return highlight === '/shop/order' || highlight.startsWith('/shop/order')
  return highlight === to
}

export function isStoreRoute(pathname = '') {
  return pathname === '/store' || pathname === '/shop' || pathname.startsWith('/shop/')
}
