const API_BASE = import.meta.env.VITE_API_URL || ''
const ADMIN_TOKEN_KEY = 'admin_access_token'
const USER_TOKEN_KEY = 'user_access_token'
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

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

function getUserHeaders(includeJson = true) {
  const headers = {}
  if (includeJson) headers['Content-Type'] = 'application/json'
  const token = localStorage.getItem(USER_TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

function authHeaders(includeJson = true) {
  const user = getUserHeaders(includeJson)
  if (user.Authorization) return user
  return getAdminHeaders(includeJson)
}

async function userFetch(url, options = {}) {
  return apiFetch(url, {
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
  const res = await fetch(`${API_BASE}/api/categories/`, { headers: getUserHeaders(false) })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function fetchProjects(subcategoryId) {
  const q = subcategoryId ? `?subcategory=${subcategoryId}` : ''
  const res = await fetch(`${API_BASE}/api/projects/${q}`, { headers: getUserHeaders(false) })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function fetchFeaturedProjects() {
  const res = await fetch(`${API_BASE}/api/projects/?featured=true`, { headers: getUserHeaders(false) })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function fetchProject(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/`, { headers: getUserHeaders(false) })
  const data = await handleResponse(res)
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

export async function submitCommand(fields) {
  const form = new FormData()
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, value)
    }
  })
  const res = await fetch(`${API_BASE}/api/commands/`, { method: 'POST', body: form })
  return handleResponse(res)
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

export async function payCommand(code, body = {}) {
  const q = new URLSearchParams({ code: code.trim().toUpperCase() })
  const res = await fetch(`${API_BASE}/api/commands/pay/?${q}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export function userLogout() {
  localStorage.removeItem(USER_TOKEN_KEY)
  localStorage.removeItem('user_refresh_token')
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
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-session-changed'))
  }
  return data
}

export async function fetchUserMe() {
  const res = await fetch(`${API_BASE}/api/auth/me/`, { headers: getUserHeaders() })
  if (res.status === 401 || res.status === 403) return null
  return handleResponse(res)
}

export async function fetchPacks() {
  const res = await fetch(`${API_BASE}/api/packs/`)
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function subscribeToPack(packId) {
  const data = await userFetch(`${API_BASE}/api/packs/${packId}/subscribe/`, { method: 'POST', body: '{}' })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('user-session-changed'))
  }
  return data
}

export async function adminFetchPacks() {
  const res = await fetch(`${API_BASE}/api/admin/packs/`, { headers: getAdminHeaders() })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function adminCreatePack(body) {
  const res = await fetch(`${API_BASE}/api/admin/packs/`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function adminUpdatePack(id, body) {
  const res = await fetch(`${API_BASE}/api/admin/packs/${id}/`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function adminDeletePack(id) {
  const res = await fetch(`${API_BASE}/api/admin/packs/${id}/`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  })
  if (res.status === 204) return null
  return handleResponse(res)
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

export async function adminLogin(username, password) {
  const data = await apiFetch(`${API_BASE}/api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  localStorage.setItem(ADMIN_TOKEN_KEY, data.access)
  return data
}

export function adminLogout() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem('admin_refresh_token')
}

export async function fetchAdminMe() {
  const res = await fetch(`${API_BASE}/api/admin/me/`, { headers: getAdminHeaders() })
  if (res.status === 401 || res.status === 403) return null
  return handleResponse(res)
}

function adminHeadersMultipart() {
  const headers = {}
  const token = localStorage.getItem(ADMIN_TOKEN_KEY)
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

export async function adminCreateProject(formData) {
  return apiFetch(`${API_BASE}/api/admin/projects/`, {
    method: 'POST',
    headers: adminHeadersMultipart(),
    body: formData,
  })
}

export async function adminUpdateProject(id, formData) {
  return apiFetch(`${API_BASE}/api/admin/projects/${id}/`, {
    method: 'PATCH',
    headers: adminHeadersMultipart(),
    body: formData,
  })
}

export function validateUploadFile(file, label = 'File') {
  if (!file) return null
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${label} must be 5 MB or smaller (this file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`
  }
  return null
}

export async function adminDeleteProject(id) {
  const res = await fetch(`${API_BASE}/api/admin/projects/${id}/`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  })
  if (res.status === 204) return null
  return handleResponse(res)
}

export async function adminFetchProjects() {
  const res = await fetch(`${API_BASE}/api/admin/projects/`, { headers: getAdminHeaders() })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function adminFetchCommands() {
  const res = await fetch(`${API_BASE}/api/admin/commands/`, { headers: getAdminHeaders() })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function adminFetchCommand(id) {
  const res = await fetch(`${API_BASE}/api/admin/commands/${id}/`, { headers: getAdminHeaders() })
  return handleResponse(res)
}

export async function adminSendCommandMessage(id, { text, link_url, image }) {
  const fd = new FormData()
  if (text) fd.append('text', text)
  if (link_url) fd.append('link_url', link_url)
  if (image) fd.append('image', image)
  const res = await fetch(`${API_BASE}/api/admin/commands/${id}/messages/`, {
    method: 'POST',
    headers: adminHeadersMultipart(),
    body: fd,
  })
  return handleResponse(res)
}

export async function adminRespondCommand(id, body) {
  const res = await fetch(`${API_BASE}/api/admin/commands/${id}/respond/`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function adminFetchUsers() {
  const res = await fetch(`${API_BASE}/api/admin/users/`, { headers: getAdminHeaders() })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function adminFetchCustomers() {
  const res = await fetch(`${API_BASE}/api/admin/customers/`, { headers: getAdminHeaders() })
  const data = await handleResponse(res)
  const rows = data.results ?? data
  if (data.next) {
    let url = data.next
    const all = [...rows]
    while (url) {
      const pageUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
      const pageRes = await fetch(pageUrl, { headers: getAdminHeaders() })
      const pageData = await handleResponse(pageRes)
      all.push(...(pageData.results ?? pageData))
      url = pageData.next || null
    }
    return all
  }
  return rows
}

export async function adminCreateUser(body) {
  const res = await fetch(`${API_BASE}/api/admin/users/`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function adminFetchComments() {
  const res = await fetch(`${API_BASE}/api/admin/comments/`, { headers: getAdminHeaders() })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function adminDeleteComment(id) {
  const res = await fetch(`${API_BASE}/api/admin/comments/${id}/`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  })
  if (res.status === 204) return null
  return handleResponse(res)
}

export async function adminFetchCategories() {
  const res = await fetch(`${API_BASE}/api/admin/categories/`, { headers: getAdminHeaders() })
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function adminCreateCategory(body) {
  const res = await fetch(`${API_BASE}/api/admin/categories/`, {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function adminUpdateCategory(id, body) {
  const res = await fetch(`${API_BASE}/api/admin/categories/${id}/`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify(body),
  })
  return handleResponse(res)
}

export async function adminDeleteCategory(id) {
  const res = await fetch(`${API_BASE}/api/admin/categories/${id}/`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  })
  if (res.status === 204) return null
  return handleResponse(res)
}

export const PERM_LABELS = {
  post_project: 'Post projects',
  edit_project: 'Edit projects',
  manage_categories: 'Manage categories',
  manage_packs: 'Manage subscription packs',
  view_commands: 'View commands',
  respond_commands: 'Respond to commands',
  moderate_comment: 'Delete comments',
}
