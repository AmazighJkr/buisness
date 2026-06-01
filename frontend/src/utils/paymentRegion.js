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

export function getCachedClientCountry() {
  return cacheEntry(COUNTRY_KEY) || ''
}

export function getCachedPaymentProvider() {
  return cacheEntry(PROVIDER_KEY) || ''
}

export function setCachedPaymentProvider(provider) {
  if (provider) setCacheEntry(PROVIDER_KEY, provider)
}

/** Best-effort ISO country code for payment routing (DZ → Chargily). */
export async function detectClientCountry({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = getCachedClientCountry()
    if (cached) return cached
  }

  try {
    const res = await fetch('https://ipapi.co/country_code/', {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const code = (await res.text()).trim().toUpperCase()
      if (code.length === 2) {
        setCacheEntry(COUNTRY_KEY, code)
        return code
      }
    }
  } catch {
    /* no fallback timezone — avoids locking Algeria on VPN */
  }

  setCacheEntry(COUNTRY_KEY, '')
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
