const COUNTRY_KEY = 'eg_client_country'
const PROVIDER_KEY = 'eg_payment_provider'
const CACHE_MS = 15 * 60 * 1000

function cacheEntry(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return null
    const { value, at } = JSON.parse(raw)
    if (Date.now() - at > CACHE_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return value
  } catch {
    return null
  }
}

function setCacheEntry(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify({ value, at: Date.now() }))
  } catch {
    /* ignore */
  }
}

/** Same-origin API base (empty = relative /api on production). */
function apiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    return url.origin === 'null' ? '' : raw.replace(/\/$/, '')
  } catch {
    return ''
  }
}

export function getCachedClientCountry() {
  return cacheEntry(COUNTRY_KEY) || ''
}

export function setCachedClientCountry(code) {
  const cc = (code || '').trim().toUpperCase()
  if (cc.length === 2) setCacheEntry(COUNTRY_KEY, cc)
}

export function getCachedPaymentProvider() {
  return cacheEntry(PROVIDER_KEY) || ''
}

export function setCachedPaymentProvider(provider) {
  if (provider) setCacheEntry(PROVIDER_KEY, provider)
}

/** Country for payment routing — always via our API (server GeoIP), never ipapi.co in browser. */
export async function detectClientCountry({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedClientCountry()
    if (cached) return cached
  }

  try {
    const res = await fetch(`${apiBase()}/api/payments/country/`, {
      signal: AbortSignal.timeout(8000),
      credentials: 'same-origin',
    })
    if (res.ok) {
      const data = await res.json()
      const code = (data.country || '').trim().toUpperCase()
      if (code.length === 2) {
        setCachedClientCountry(code)
        return code
      }
    }
  } catch {
    /* DNS/offline/server waking — do not cache failure */
  }

  return ''
}

export function paymentCountryHeaders() {
  const cc = getCachedClientCountry()
  return cc ? { 'X-Client-Country': cc } : {}
}

export function paymentProviderHeaders(provider) {
  if (!provider) return {}
  return { 'X-Payment-Provider': provider }
}

export function paymentRoutingParams(provider, country) {
  const params = new URLSearchParams()
  const cc = country || getCachedClientCountry()
  if (cc) params.set('country', cc)
  if (provider) params.set('provider', provider)
  return params
}
