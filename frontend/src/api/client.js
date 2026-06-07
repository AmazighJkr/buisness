import {
  detectClientCountry,
  getCachedClientCountry,
  getCachedPaymentProvider,
  paymentCountryHeaders,
  paymentProviderHeaders,
  paymentRoutingParams,
  setCachedClientCountry,
  setCachedPaymentProvider,
} from '../utils/paymentRegion.js'

function resolveApiBase() {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  if (!raw) return ''
  try {
    new URL(raw)
    return raw.replace(/\/$/, '')
  } catch {
    return ''
  }
}

const API_BASE = resolveApiBase()
const ADMIN_TOKEN_KEY = 'admin_access_token'
const ADMIN_REFRESH_KEY = 'admin_refresh_token'
const USER_TOKEN_KEY = 'user_access_token'
const USER_REFRESH_KEY = 'user_refresh_token'
let adminRefreshInFlight = null
let userRefreshInFlight = null
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function parseJwtPayload(token) {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function isAdminAccessExpired(bufferSec = 60) {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (!token) return true
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 < Date.now() + bufferSec * 1000
}

/** True when admin access or refresh token is stored locally. */
export function hasAdminSession() {
  if (typeof window === 'undefined') return false
  return Boolean(
    localStorage.getItem(ADMIN_TOKEN_KEY) || localStorage.getItem(ADMIN_REFRESH_KEY),
  )
}

/** Refresh access token when expired; returns false if admin must log in again. */
export async function ensureAdminSession() {
  if (typeof window === 'undefined') return false
  const refresh = localStorage.getItem(ADMIN_REFRESH_KEY)
  const access = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (!refresh && !access) return false
  if (refresh && (!access || isAdminAccessExpired())) {
    const ok = await refreshAdminAccessToken()
    if (!ok) {
      adminLogout()
      return false
    }
    return true
  }
  return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY))
}

async function apiFetch(url, options = {}) {
  let res
  try {
    res = await fetch(url, options)
  } catch {
    throw new Error(
      'Network error — the server may be waking up, your session may have expired, or the file is too large (max 5 MB). Wait 30s, log in again, and retry.',
    )
  }
  return handleResponse(res)
}

function clearUserTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(USER_TOKEN_KEY)
  localStorage.removeItem(USER_REFRESH_KEY)
  window.dispatchEvent(new Event('user-session-changed'))
}

function clearUserToken() {
  if (typeof window === 'undefined') return
  if (!localStorage.getItem(USER_TOKEN_KEY)) return
  clearUserTokens()
}

function getUserHeaders(includeJson = true) {
  const headers = {}
  if (includeJson) headers['Content-Type'] = 'application/json'
  const token = localStorage.getItem(USER_TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function refreshUserAccessToken() {
  const refresh = localStorage.getItem(USER_REFRESH_KEY)
  if (!refresh) return false
  if (!userRefreshInFlight) {
    userRefreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        })
        if (!res.ok) return false
        const data = await res.json()
        if (data.access) localStorage.setItem(USER_TOKEN_KEY, data.access)
        if (data.refresh) localStorage.setItem(USER_REFRESH_KEY, data.refresh)
        return Boolean(data.access)
      } catch {
        return false
      } finally {
        userRefreshInFlight = null
      }
    })()
  }
  return userRefreshInFlight
}

/** Public API reads: optional JWT; refresh on 401 before dropping auth. */
async function publicFetch(url, options = {}, retried = false) {
  const token = localStorage.getItem(USER_TOKEN_KEY)
  const extra = options.headers || {}

  const doFetch = (withAuth) => {
    const headers = { ...extra }
    if (withAuth && token) headers.Authorization = `Bearer ${token}`
    return fetch(url, { ...options, headers })
  }

  let res = await doFetch(Boolean(token))
  if (res.status === 401 && token && !retried) {
    const ok = await refreshUserAccessToken()
    if (ok) return publicFetch(url, options, true)
    clearUserTokens()
    res = await doFetch(false)
  } else if (res.status === 401 && token) {
    clearUserTokens()
    res = await doFetch(false)
  }
  return handleResponse(res)
}

function authHeaders(includeJson = true) {
  const user = getUserHeaders(includeJson)
  if (user.Authorization) return user
  return getAdminHeaders(includeJson)
}

/** Authenticated fetch with JWT refresh (optional token — guests skip refresh). */
async function authFetch(url, options = {}, retried = false) {
  const headers = { ...(options.headers || {}) }
  const token = localStorage.getItem(USER_TOKEN_KEY)
  if (token) headers.Authorization = `Bearer ${token}`
  const method = (options.method || 'GET').toUpperCase()
  if (
    !headers['Content-Type'] &&
    options.body &&
    !(options.body instanceof FormData) &&
    ['POST', 'PATCH', 'PUT'].includes(method)
  ) {
    headers['Content-Type'] = 'application/json'
  }

  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch {
    throw new Error('Network error — check your connection or sign in again.')
  }
  if (res.status === 401 && token && !retried) {
    const ok = await refreshUserAccessToken()
    if (ok) return authFetch(url, options, true)
    clearUserTokens()
    throw new Error('Session expired. Please sign in again.')
  }
  return handleResponse(res)
}

async function userFetch(url, options = {}) {
  return authFetch(url, {
    ...options,
    headers: { ...getUserHeaders(), ...(options.headers || {}) },
  })
}

function getAdminHeaders(includeJson = true) {
  const headers = {}
  if (includeJson) headers['Content-Type'] = 'application/json'
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function refreshAdminAccessToken() {
  const refresh = localStorage.getItem(ADMIN_REFRESH_KEY)
  if (!refresh) return false
  if (!adminRefreshInFlight) {
    adminRefreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/token/refresh/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        })
        if (!res.ok) return false
        const data = await res.json()
        if (data.access) localStorage.setItem(ADMIN_TOKEN_KEY, data.access)
        if (data.refresh) localStorage.setItem(ADMIN_REFRESH_KEY, data.refresh)
        return Boolean(data.access)
      } catch {
        return false
      } finally {
        adminRefreshInFlight = null
      }
    })()
  }
  return adminRefreshInFlight
}

/** Admin API with JWT refresh on 401. */
export async function adminRequest(url, options = {}, retried = false) {
  if (!retried && hasAdminSession()) {
    await ensureAdminSession()
  }
  const isForm = options.body instanceof FormData
  const headers = { ...(options.headers || {}) }
  const method = (options.method || 'GET').toUpperCase()
  if (!isForm && !headers['Content-Type'] && ['POST', 'PATCH', 'PUT'].includes(method)) {
    headers['Content-Type'] = 'application/json'
  }
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(url, { ...options, headers })
  } catch {
    throw new Error('Network error — check your connection or log in again.')
  }

  if (res.status === 401 && !retried) {
    const ok = await refreshAdminAccessToken()
    if (ok) return adminRequest(url, options, true)
    adminLogout()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('admin-session-expired'))
    }
    throw new Error('Admin session expired. Please log in again.')
  }
  if (res.status === 204) return null
  return handleResponse(res)
}

async function handleResponse(res) {
  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { detail: text }
    }
  }
  if (!res.ok) {
    const raw = typeof data?.detail === 'string' ? data.detail : text
    if (raw && (raw.trimStart().startsWith('<') || raw.includes('<!DOCTYPE'))) {
      throw new Error(
        'Server returned an HTML error page. Restart backend (run.bat) and log in again.',
      )
    }
    if (data && typeof data === 'object' && !data.detail) {
      const fieldMsgs = Object.entries(data)
        .map(([field, errs]) => {
          const t = Array.isArray(errs) ? errs.join(' ') : String(errs)
          return `${field}: ${t}`
        })
        .filter(Boolean)
      if (fieldMsgs.length) throw new Error(fieldMsgs.join(' | '))
    }
    const message =
      data?.detail ||
      data?.non_field_errors?.[0] ||
      Object.values(data || {})
        .flat()
        .find(Boolean) ||
      res.statusText
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }
  return data
}

export async function fetchCategories() {
  const data = await publicFetch(`${API_BASE}/api/categories/`)
  return data.results ?? data
}

function resolveApiUrl(pathOrUrl) {
  if (!pathOrUrl) return null
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) return pathOrUrl
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`
  return `${API_BASE}${path}`
}

/** Follow DRF pagination so lists beyond PAGE_SIZE are fully loaded. */
async function fetchPaginatedList(initialUrl) {
  const items = []
  let url = initialUrl
  while (url) {
    const data = await publicFetch(url)
    if (Array.isArray(data)) return data
    items.push(...(data.results ?? []))
    url = resolveApiUrl(data.next)
  }
  return items
}

export async function fetchProjects(subcategoryId, { featured = false, q = '' } = {}) {
  const params = new URLSearchParams()
  if (subcategoryId) params.set('subcategory', subcategoryId)
  else if (featured) params.set('featured', 'true')
  const query = (q || '').trim()
  if (query) params.set('q', query)
  const qs = params.toString()
  const url = `${API_BASE}/api/projects/${qs ? `?${qs}` : ''}`
  return fetchPaginatedList(url)
}

async function storeFetch(url) {
  await detectClientCountry()
  return publicFetch(url, { headers: paymentCountryHeaders() })
}

export async function fetchStoreCategories() {
  const data = await storeFetch(`${API_BASE}/api/store/categories/`)
  return data.results ?? data
}

export async function fetchStoreProducts({ category = '', featured = false, q = '' } = {}) {
  const params = new URLSearchParams()
  if (category) params.set('category', category)
  if (featured) params.set('featured', 'true')
  if (q) params.set('q', q)
  const qs = params.toString()
  const data = await storeFetch(`${API_BASE}/api/store/products/${qs ? `?${qs}` : ''}`)
  return data.results ?? data
}

export async function fetchStoreProduct(idOrSlug) {
  const data = await storeFetch(
    `${API_BASE}/api/store/products/${encodeURIComponent(idOrSlug)}/`,
  )
  return data
}

export async function validateStoreCart(items, reservationId = null) {
  await detectClientCountry()
  const body = {
    items: items.map((row) => ({
      product_id: row.productId || row.product_id,
      quantity: row.quantity,
    })),
  }
  if (reservationId) body.reservation_id = reservationId
  const res = await fetch(`${API_BASE}/api/store/cart/validate/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...paymentCountryHeaders(),
    },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function fetchShippingWilayas() {
  await detectClientCountry()
  const res = await fetch(`${API_BASE}/api/store/shipping/wilayas/`, {
    headers: paymentCountryHeaders(),
  })
  return handleResponse(res)
}

export async function fetchShippingPostalCodes(wilayaId) {
  await detectClientCountry()
  const q = new URLSearchParams({ wilaya: wilayaId })
  const res = await fetch(`${API_BASE}/api/store/shipping/postal-codes/?${q}`, {
    headers: paymentCountryHeaders(),
  })
  return handleResponse(res)
}

export async function searchShippingLocations(query, wilayaId = null, limit = 20) {
  await detectClientCountry()
  const q = new URLSearchParams({ q: query, limit: String(limit) })
  if (wilayaId) q.set('wilaya', wilayaId)
  const res = await fetch(`${API_BASE}/api/store/shipping/search/?${q}`, {
    headers: paymentCountryHeaders(),
  })
  return handleResponse(res)
}

export async function fetchShippingQuote(postalCode, deliveryType) {
  await detectClientCountry()
  const res = await fetch(`${API_BASE}/api/store/shipping/quote/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...paymentCountryHeaders(),
    },
    body: JSON.stringify({ postal_code: postalCode, delivery_type: deliveryType }),
  })
  return handleResponse(res)
}

export async function fetchLegalPage(slug, lang = 'fr') {
  const params = new URLSearchParams({ lang })
  const res = await fetch(`${API_BASE}/api/legal/${slug}/?${params}`)
  return handleResponse(res)
}

export async function adminFetchLegalPage(slug) {
  return adminRequest(`${API_BASE}/api/admin/legal/${slug}/`)
}

export async function adminUpdateLegalPage(slug, content) {
  return adminRequest(`${API_BASE}/api/admin/legal/${slug}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
}

export async function createStoreOrder(payload) {
  await detectClientCountry()
  return authFetch(`${API_BASE}/api/store/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...paymentCountryHeaders(),
    },
    body: JSON.stringify(payload),
  })
}

export async function fetchStoreOrderResume(orderId) {
  await detectClientCountry()
  const res = await fetch(`${API_BASE}/api/store/orders/${orderId}/resume/`, {
    headers: paymentCountryHeaders(),
  })
  return handleResponse(res)
}

export async function payStoreOrder(orderId, body = {}) {
  await detectClientCountry()
  const q = paymentRoutingParams('chargily', null)
  return authFetch(`${API_BASE}/api/store/orders/${orderId}/pay/?${q}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...paymentCountryHeaders(),
    },
    body: JSON.stringify(body),
  })
}

export async function trackStoreOrder(orderNumber, email) {
  const res = await fetch(`${API_BASE}/api/store/orders/track/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      order_number: orderNumber.trim().toUpperCase(),
      email: email.trim().toLowerCase(),
    }),
  })
  return handleResponse(res)
}

export async function fetchMyStoreOrders() {
  return userFetch(`${API_BASE}/api/store/orders/mine/`)
}

/** Featured-only grid (e.g. homepage highlights). Most pages should use fetchProjects(). */
export async function fetchFeaturedProjects() {
  return fetchProjects(null, { featured: true })
}

export async function fetchProject(id) {
  const data = await publicFetch(`${API_BASE}/api/projects/${id}/`)
  if (data.subcategory) {
    data.subcategory_name = data.subcategory_name || ''
    data.category_name = data.category_name || ''
  }
  return data
}

export async function postComment(projectId, body) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/comments/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function fetchCommandLayers() {
  const data = await publicFetch(`${API_BASE}/api/commands/layers/`)
  return Array.isArray(data) ? data : data.results ?? data
}

export async function fetchCommandLayerBundles() {
  const data = await publicFetch(`${API_BASE}/api/commands/layer-bundles/`)
  return Array.isArray(data) ? data : data.results ?? data
}

export async function submitCommand(fields) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (key === 'layer_ids' || key === 'accepted_terms' || key === 'recaptcha_response') return
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, value)
    }
  })
  if (fields.layer_ids?.length) {
    form.append('layer_ids_json', JSON.stringify(fields.layer_ids))
  }
  if (fields.accepted_terms) {
    form.append('accepted_terms', 'true')
  }
  if (fields.recaptcha_response) {
    form.append('recaptcha_response', fields.recaptcha_response)
  }
  return authFetch(`${API_BASE}/api/commands/`, {
    method: 'POST',
    body: form,
  })
}

export async function submitContactMessage(fields) {
  return authFetch(`${API_BASE}/api/contact/`, {
    method: 'POST',
    body: JSON.stringify({
      client_name: fields.client_name,
      client_email: fields.client_email,
      body: fields.body || fields.message,
      accepted_terms: true,
      recaptcha_response: fields.recaptcha_response || '',
    }),
  })
}

export async function fetchMyCommands() {
  return userFetch(`${API_BASE}/api/commands/mine/`)
}

export async function fetchMyCommand(commandId) {
  return userFetch(`${API_BASE}/api/commands/mine/${commandId}/`)
}

export async function fetchCommandTrackByCode(code) {
  const q = new URLSearchParams({ code: code.trim().toUpperCase() })
  const res = await fetch(`${API_BASE}/api/commands/track/?${q}`)
  return handleResponse(res)
}

export async function fetchCommandTrackByEmail(email) {
  const q = new URLSearchParams({ email: email.trim().toLowerCase() })
  const res = await fetch(`${API_BASE}/api/commands/track/?${q}`)
  return handleResponse(res)
}

export async function fetchPaymentConfig({ forceRefresh = false } = {}) {
  const cached = forceRefresh ? '' : getCachedClientCountry()
  const params = paymentRoutingParams(null, cached)
  const qs = params.toString()
  let res
  try {
    res = await fetch(`${API_BASE}/api/payments/config/${qs ? `?${qs}` : ''}`, {
      headers: { ...paymentCountryHeaders(), ...paymentProviderHeaders() },
      credentials: 'same-origin',
    })
  } catch {
    throw new Error(
      'Could not reach the server. Check your connection or wait if the site is waking up.',
    )
  }
  const data = await handleResponse(res)
  if (data.country) setCachedClientCountry(data.country)
  if (data.provider) setCachedPaymentProvider(data.provider)
  return data
}

async function paymentRequestOptions(provider) {
  const p = provider || getCachedPaymentProvider()
  if (!getCachedClientCountry()) {
    await detectClientCountry()
  }
  return {
    headers: {
      ...paymentCountryHeaders(),
      ...paymentProviderHeaders(p),
    },
    provider: p,
  }
}

export async function payCommand(code, body = {}, provider) {
  const { headers, provider: p } = await paymentRequestOptions(provider)
  const q = paymentRoutingParams(p, null)
  q.set('code', code.trim().toUpperCase())
  const res = await fetch(`${API_BASE}/api/commands/pay/?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function payMyCommand(commandId, body = {}, provider) {
  const { headers, provider: p } = await paymentRequestOptions(provider)
  const q = paymentRoutingParams(p, null)
  q.set('command_id', commandId)
  return userFetch(`${API_BASE}/api/commands/pay/?${q}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

export function userLogout() {
  clearUserTokens()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-session-changed'))
  }
}

export async function userRegister(body) {
  const data = await apiFetch(`${API_BASE}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  localStorage.setItem(USER_TOKEN_KEY, data.access)
  if (data.refresh) localStorage.setItem(USER_REFRESH_KEY, data.refresh)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-session-changed'))
  }
  return data
}

export async function fetchAuthConfig() {
  const res = await fetch(`${API_BASE}/api/auth/config/`)
  return handleResponse(res)
}

export async function userGoogleLogin(credential) {
  const data = await apiFetch(`${API_BASE}/api/auth/google/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  localStorage.setItem(USER_TOKEN_KEY, data.access)
  if (data.refresh) localStorage.setItem(USER_REFRESH_KEY, data.refresh)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-session-changed'))
  }
  return data
}

export async function userLogin(username, password) {
  const data = await apiFetch(`${API_BASE}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  localStorage.setItem(USER_TOKEN_KEY, data.access)
  if (data.refresh) localStorage.setItem(USER_REFRESH_KEY, data.refresh)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-session-changed'))
  }
  return data
}

export async function fetchUserMe() {
  const token = localStorage.getItem(USER_TOKEN_KEY)
  if (!token) return null
  try {
    return await authFetch(`${API_BASE}/api/auth/me/`)
  } catch {
    return null
  }
}

export async function fetchPacks() {
  const data = await publicFetch(`${API_BASE}/api/packs/`)
  return data.results ?? data
}

export async function subscribeToPack(packId, provider) {
  const { headers, provider: p } = await paymentRequestOptions(provider)
  const q = paymentRoutingParams(p, null)
  const data = await userFetch(`${API_BASE}/api/packs/${packId}/subscribe/?${q}`, {
    method: 'POST',
    headers,
    body: '{}',
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-session-changed'))
  }
  return data
}

export async function adminFetchPacks() {
  const data = await adminRequest(`${API_BASE}/api/admin/packs/`)
  return data.results ?? data
}

export async function adminCreatePack(body) {
  return adminRequest(`${API_BASE}/api/admin/packs/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdatePack(id, body) {
  return adminRequest(`${API_BASE}/api/admin/packs/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeletePack(id) {
  return adminRequest(`${API_BASE}/api/admin/packs/${id}/`, { method: 'DELETE' })
}

export async function postCommandMessage(code, payload) {
  const q = new URLSearchParams({ code: code.trim().toUpperCase() })
  const headers = {}
  let body
  if (payload instanceof FormData) {
    body = payload
  } else {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(payload)
  }
  const res = await fetch(`${API_BASE}/api/commands/messages/?${q}`, {
    method: 'POST',
    headers,
    body,
  })
  return handleResponse(res)
}

export async function postMyCommandMessage(commandId, payload) {
  const q = new URLSearchParams({ command_id: commandId })
  const headers = { ...getUserHeaders(false) }
  let body
  if (payload instanceof FormData) {
    body = payload
  } else {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(payload)
  }
  return authFetch(`${API_BASE}/api/commands/messages/?${q}`, {
    method: 'POST',
    headers,
    body,
  })
}

export async function adminLogin(username, password) {
  const data = await apiFetch(`${API_BASE}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  localStorage.setItem(ADMIN_TOKEN_KEY, data.access)
  if (data.refresh) localStorage.setItem(ADMIN_REFRESH_KEY, data.refresh)
  return data
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_REFRESH_KEY)
}

export async function fetchAdminMe() {
  if (!hasAdminSession()) return null
  if (!(await ensureAdminSession())) return null
  try {
    return await adminRequest(`${API_BASE}/api/admin/me/`)
  } catch (err) {
    const msg = err.message || ''
    if (
      msg.includes('expired')
      || msg.includes('credentials')
      || msg.includes('log in')
      || msg.includes('Invalid')
    ) {
      return null
    }
    throw err
  }
}

export async function adminSearchAmazon(q, domain = 'amazon.com') {
  const params = new URLSearchParams({ q, domain })
  return adminRequest(`${API_BASE}/api/admin/amazon/search/?${params}`)
}

export async function adminFetchCommandLayers() {
  const data = await adminRequest(`${API_BASE}/api/admin/command-layers/`)
  return data.results ?? data
}

export async function adminCreateCommandLayer(body) {
  return adminRequest(`${API_BASE}/api/admin/command-layers/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateCommandLayer(id, body) {
  return adminRequest(`${API_BASE}/api/admin/command-layers/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeleteCommandLayer(id) {
  return adminRequest(`${API_BASE}/api/admin/command-layers/${id}/`, { method: 'DELETE' })
}

export async function adminFetchCommandLayerBundles() {
  const data = await adminRequest(`${API_BASE}/api/admin/command-layer-bundles/`)
  return data.results ?? data
}

export async function adminCreateCommandLayerBundle(body) {
  return adminRequest(`${API_BASE}/api/admin/command-layer-bundles/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateCommandLayerBundle(id, body) {
  return adminRequest(`${API_BASE}/api/admin/command-layer-bundles/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeleteCommandLayerBundle(id) {
  return adminRequest(`${API_BASE}/api/admin/command-layer-bundles/${id}/`, { method: 'DELETE' })
}

export async function adminCreateProject(formData) {
  return adminRequest(`${API_BASE}/api/admin/projects/`, { method: 'POST', body: formData })
}

export async function adminUpdateProject(id, formData) {
  return adminRequest(`${API_BASE}/api/admin/projects/${id}/`, { method: 'PATCH', body: formData })
}

const ALLOWED_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
])

export function validateUploadFile(file, label = 'File') {
  if (!file) return null
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${label} must be 5 MB or smaller (this file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`
  }
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
  if (ext && !ALLOWED_IMAGE_EXTENSIONS.has(ext)) {
    return `${label} type not allowed (${ext || 'unknown'}). Use PNG, JPG, GIF, or WebP.`
  }
  return null
}

const MAX_MODEL_3D_BYTES = 25 * 1024 * 1024
const ALLOWED_MODEL_3D_EXTENSIONS = new Set(['.glb', '.gltf', '.obj', '.fbx'])

export function validateModel3dFile(file, label = '3D model') {
  if (!file) return null
  if (file.size > MAX_MODEL_3D_BYTES) {
    return `${label} must be 25 MB or smaller (this file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`
  }
  const name = file.name || ''
  const dot = name.lastIndexOf('.')
  const ext = dot >= 0 ? name.slice(dot).toLowerCase() : ''
  if (!ALLOWED_MODEL_3D_EXTENSIONS.has(ext)) {
    return `${label} type not allowed (${ext || 'unknown'}). Use GLB, GLTF, OBJ, or FBX.`
  }
  return null
}

export async function adminDeleteProject(id) {
  return adminRequest(`${API_BASE}/api/admin/projects/${id}/`, { method: 'DELETE' })
}

export async function adminFetchProjects() {
  const data = await adminRequest(`${API_BASE}/api/admin/projects/`)
  return data.results ?? data
}

export async function adminFetchCommands() {
  const data = await adminRequest(`${API_BASE}/api/admin/commands/`)
  return data.results ?? data
}

export async function adminFetchCommand(id) {
  return adminRequest(`${API_BASE}/api/admin/commands/${id}/`)
}

export async function adminSendCommandMessage(id, { text, link_url, image }) {
  const fd = new FormData()
  if (text) fd.append('text', text)
  if (link_url) fd.append('link_url', link_url)
  if (image) fd.append('image', image)
  return adminRequest(`${API_BASE}/api/admin/commands/${id}/messages/`, { method: 'POST', body: fd })
}

export async function adminRespondCommand(id, body) {
  return adminRequest(`${API_BASE}/api/admin/commands/${id}/respond/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminFetchContactMessages() {
  const data = await adminRequest(`${API_BASE}/api/admin/contact/messages/`)
  return data.results ?? data
}

export async function adminFetchContactMessage(id) {
  return adminRequest(`${API_BASE}/api/admin/contact/messages/${id}/`)
}

export async function adminRespondContactMessage(id, body) {
  return adminRequest(`${API_BASE}/api/admin/contact/messages/${id}/respond/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminFetchUsers() {
  const data = await adminRequest(`${API_BASE}/api/admin/users/`)
  return data.results ?? data
}

export async function adminFetchCustomers() {
  const data = await adminRequest(`${API_BASE}/api/admin/customers/`)
  const rows = data.results ?? data
  if (data.next) {
    let url = data.next
    const all = [...rows]
    while (url) {
      const pageUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
      const pageData = await adminRequest(pageUrl)
      all.push(...(pageData.results ?? pageData))
      url = pageData.next || null
    }
    return all
  }
  return rows
}

export async function adminCreateUser(body) {
  return adminRequest(`${API_BASE}/api/admin/users/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminFetchComments() {
  const data = await adminRequest(`${API_BASE}/api/admin/comments/`)
  return data.results ?? data
}

export async function adminDeleteComment(id) {
  return adminRequest(`${API_BASE}/api/admin/comments/${id}/`, { method: 'DELETE' })
}

export async function adminFetchCategories() {
  const data = await adminRequest(`${API_BASE}/api/admin/categories/`)
  return data.results ?? data
}

export async function adminFetchStoreCategories() {
  const data = await adminRequest(`${API_BASE}/api/admin/store/categories/`)
  return data.results ?? data
}

export async function adminCreateStoreCategory(formData) {
  return adminRequest(`${API_BASE}/api/admin/store/categories/`, { method: 'POST', body: formData })
}

export async function adminUpdateStoreCategory(id, formData) {
  return adminRequest(`${API_BASE}/api/admin/store/categories/${id}/`, {
    method: 'PATCH',
    body: formData,
  })
}

export async function adminDeleteStoreCategory(id) {
  return adminRequest(`${API_BASE}/api/admin/store/categories/${id}/`, { method: 'DELETE' })
}

export async function adminFetchStoreProducts() {
  const data = await adminRequest(`${API_BASE}/api/admin/store/products/`)
  return data.results ?? data
}

export async function adminCreateStoreProduct(formData) {
  return adminRequest(`${API_BASE}/api/admin/store/products/`, { method: 'POST', body: formData })
}

export async function adminUpdateStoreProduct(id, formData) {
  return adminRequest(`${API_BASE}/api/admin/store/products/${id}/`, {
    method: 'PATCH',
    body: formData,
  })
}

/** Quick edits (name, prices, stock) without uploading files. */
export async function adminPatchStoreProduct(id, body) {
  return adminRequest(`${API_BASE}/api/admin/store/products/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeleteStoreProduct(id) {
  return adminRequest(`${API_BASE}/api/admin/store/products/${id}/`, { method: 'DELETE' })
}

export async function adminAddProductGallery(productId, files) {
  const fd = new FormData()
  for (const file of files) {
    fd.append('images', file)
  }
  return adminRequest(`${API_BASE}/api/admin/store/products/${productId}/gallery/`, {
    method: 'POST',
    body: fd,
  })
}

export async function adminDeleteProductGalleryImage(productId, imageId) {
  return adminRequest(
    `${API_BASE}/api/admin/store/products/${productId}/gallery/${imageId}/`,
    { method: 'DELETE' },
  )
}

export async function adminFetchStoreOrders() {
  const data = await adminRequest(`${API_BASE}/api/admin/store/orders/`)
  return data.results ?? data
}

export async function adminUpdateStoreOrder(id, body) {
  return adminRequest(`${API_BASE}/api/admin/store/orders/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

async function downloadPdf(url, filename, useAdminAuth = false) {
  const headers = useAdminAuth ? getAdminHeaders(false) : {}
  let res = await fetch(url, { headers })
  if (res.status === 401 && useAdminAuth) {
    const ok = await refreshAdminAccessToken()
    if (ok) {
      res = await fetch(url, { headers: getAdminHeaders(false) })
    }
  }
  if (!res.ok) {
    let detail = 'Download failed.'
    try {
      const data = await res.json()
      detail = data.detail || detail
    } catch {
      /* binary error body */
    }
    throw new Error(detail)
  }
  const blob = await res.blob()
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function adminDownloadStoreInvoice(orderId, orderNumber) {
  const name = `invoice-${orderNumber || orderId}.pdf`
  await downloadPdf(
    `${API_BASE}/api/admin/store/orders/${orderId}/invoice/`,
    name,
    true,
  )
}

export async function downloadStoreOrderInvoice(orderNumber, email) {
  const params = new URLSearchParams({
    order_number: orderNumber,
    email,
  })
  await downloadPdf(
    `${API_BASE}/api/store/orders/invoice/?${params}`,
    `invoice-${orderNumber}.pdf`,
    false,
  )
}

export async function adminFetchDashboard() {
  return adminRequest(`${API_BASE}/api/admin/dashboard/`)
}

export async function adminFetchEconomics({ period = 'all', from = '', to = '' } = {}) {
  const q = new URLSearchParams()
  if (period) q.set('period', period)
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const qs = q.toString()
  return adminRequest(`${API_BASE}/api/admin/economics${qs ? `?${qs}` : ''}`)
}

export async function adminFetchStaffActivity({ staff = '', resource = '', action = '' } = {}) {
  const params = new URLSearchParams()
  if (staff) params.set('staff', staff)
  if (resource) params.set('resource', resource)
  if (action) params.set('action', action)
  const qs = params.toString()
  const data = await adminRequest(`${API_BASE}/api/admin/audit-log/${qs ? `?${qs}` : ''}`)
  return data.results ?? data
}

export async function adminUpdateUser(id, body) {
  return adminRequest(`${API_BASE}/api/admin/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function fetchMyOrders() {
  return userFetch(`${API_BASE}/api/auth/me/orders/`)
}

export async function adminFetchWilayas() {
  return adminRequest(`${API_BASE}/api/admin/store/wilayas/`)
}

export async function adminFetchPostalCodes({
  wilaya = '',
  q = '',
  status = '',
  page = 1,
  pageSize = 500,
} = {}) {
  const params = new URLSearchParams()
  if (wilaya) params.set('wilaya', wilaya)
  if (q) params.set('q', q)
  if (status) params.set('status', status)
  params.set('page', String(page))
  params.set('page_size', String(pageSize))
  const qs = params.toString()
  const data = await adminRequest(`${API_BASE}/api/admin/store/postal-codes/?${qs}`)
  if (data.results) {
    return { rows: data.results, count: data.count ?? data.results.length }
  }
  return { rows: data, count: data.length }
}

export async function adminCreatePostalCode(body) {
  return adminRequest(`${API_BASE}/api/admin/store/postal-codes/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdatePostalCode(id, body) {
  return adminRequest(`${API_BASE}/api/admin/store/postal-codes/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeletePostalCode(id) {
  return adminRequest(`${API_BASE}/api/admin/store/postal-codes/${id}/`, { method: 'DELETE' })
}

export async function adminCreateCategory(body) {
  return adminRequest(`${API_BASE}/api/admin/categories/`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function adminUpdateCategory(id, body) {
  return adminRequest(`${API_BASE}/api/admin/categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export async function adminDeleteCategory(id) {
  return adminRequest(`${API_BASE}/api/admin/categories/${id}/`, { method: 'DELETE' })
}

export async function userChangePassword(currentPassword, newPassword) {
  return userFetch(`${API_BASE}/api/auth/change-password/`, {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  })
}

export const PERM_LABELS = {
  post_project: 'Post projects',
  edit_project: 'Edit projects',
  manage_categories: 'Manage categories',
  manage_packs: 'Manage subscription packs',
  manage_store: 'Manage store (full)',
  post_store: 'Post store products',
  edit_store: 'Edit store catalog & shipping',
  manage_store_orders: 'Manage store orders',
  manage_command_layers: 'Manage command layers',
  view_commands: 'View commands',
  respond_commands: 'Respond to commands',
  view_contact_messages: 'View contact messages',
  respond_contact_messages: 'Respond to contact messages',
  moderate_comment: 'Delete comments',
}

export function staffHasPerm(user, perm) {
  return Boolean(user?.is_superuser || user?.permissions?.includes(perm))
}

export function staffCanPostStore(user) {
  return Boolean(
    user?.is_superuser
      || staffHasPerm(user, 'manage_store')
      || staffHasPerm(user, 'post_store'),
  )
}

export function staffCanEditStore(user) {
  return Boolean(
    user?.is_superuser
      || staffHasPerm(user, 'manage_store')
      || staffHasPerm(user, 'edit_store'),
  )
}

export function staffCanManageStoreOrders(user) {
  return Boolean(
    user?.is_superuser
      || staffHasPerm(user, 'manage_store')
      || staffHasPerm(user, 'manage_store_orders'),
  )
}

export function staffHasStoreAccess(user) {
  return Boolean(
    user?.is_superuser
      || staffHasPerm(user, 'manage_store')
      || staffHasPerm(user, 'post_store')
      || staffHasPerm(user, 'edit_store')
      || staffHasPerm(user, 'manage_store_orders'),
  )
}

export function staffCanManageLayers(user) {
  return Boolean(
    user?.is_superuser
      || staffHasPerm(user, 'manage_command_layers')
      || staffHasPerm(user, 'respond_commands'),
  )
}

export function staffCanViewContactMessages(user) {
  return Boolean(
    user?.is_superuser
      || staffHasPerm(user, 'view_contact_messages')
      || staffHasPerm(user, 'view_commands'),
  )
}

export function staffCanRespondContactMessages(user) {
  return Boolean(
    user?.is_superuser
      || staffHasPerm(user, 'respond_contact_messages')
      || staffHasPerm(user, 'respond_commands'),
  )
}
