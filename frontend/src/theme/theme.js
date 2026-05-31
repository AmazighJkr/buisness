const STORAGE_KEY = 'embeddedgrid-theme'

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function getStoredPreference() {
  if (typeof window === 'undefined') return 'system'
  const v = localStorage.getItem(STORAGE_KEY)
  if (v === 'light' || v === 'dark' || v === 'system') return v
  return 'system'
}

export function resolveTheme(preference) {
  if (preference === 'light' || preference === 'dark') return preference
  return getSystemTheme()
}

export function applyTheme(resolved) {
  document.documentElement.setAttribute('data-theme', resolved)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#0c1017' : '#f4f6f9')
  }
}

export function initTheme() {
  const pref = getStoredPreference()
  applyTheme(resolveTheme(pref))
  return pref
}

export function storePreference(preference) {
  localStorage.setItem(STORAGE_KEY, preference)
}

export { STORAGE_KEY }
