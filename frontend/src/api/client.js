const API_BASE = import.meta.env.VITE_API_URL || ''
const ADMIN_TOKEN_KEY = 'admin_access_token'
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
  const res = await fetch(`${API_BASE}/api/categories/`)
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function fetchProjects(subcategoryId) {
  const q = subcategoryId ? `?subcategory=${subcategoryId}` : ''
  const res = await fetch(`${API_BASE}/api/projects/${q}`)
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function fetchFeaturedProjects() {
  const res = await fetch(`${API_BASE}/api/projects/?featured=true`)
  const data = await handleResponse(res)
  return data.results ?? data
}

export async function fetchProject(id) {
  const res = await fetch(`${API_BASE}/api/projects/${id}/`)
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
  view_commands: 'View commands',
  respond_commands: 'Respond to commands',
  moderate_comment: 'Delete comments',
}
