const COUNTRY_KEY = 'eg_client_country'

export function getCachedClientCountry() {
  try {
    return sessionStorage.getItem(COUNTRY_KEY) || ''
  } catch {
    return ''
  }
}

export function setCachedClientCountry(code) {
  try {
    if (code) sessionStorage.setItem(COUNTRY_KEY, code)
  } catch {
    /* ignore */
  }
}

/** Best-effort ISO country code for payment routing (DZ → Chargily). */
export async function detectClientCountry() {
  const cached = getCachedClientCountry()
  if (cached) return cached

  try {
    const res = await fetch('https://ipapi.co/country_code/', {
      signal: AbortSignal.timeout(4000),
    })
    if (res.ok) {
      const code = (await res.text()).trim().toUpperCase()
      if (code.length === 2) {
        setCachedClientCountry(code)
        return code
      }
    }
  } catch {
    /* fallback below */
  }

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (tz === 'Africa/Algiers') {
      setCachedClientCountry('DZ')
      return 'DZ'
    }
  } catch {
    /* ignore */
  }

  return ''
}

export function paymentCountryHeaders() {
  const cc = getCachedClientCountry()
  return cc ? { 'X-Client-Country': cc } : {}
}
