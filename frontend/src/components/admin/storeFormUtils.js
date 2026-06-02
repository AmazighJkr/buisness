import { slugFromName } from '../../utils/slugFromName.js'

export function toStoreFormData(body, image, imageKey = 'image') {
  const fd = new FormData()
  Object.entries(body).forEach(([k, v]) => {
    if (v === null || v === undefined) return
    fd.append(k, String(v))
  })
  if (image) fd.append(imageKey, image)
  return fd
}

export function boolFormValue(value) {
  return value ? 'true' : 'false'
}

/** URL segment for /shop/… — always letters, numbers, hyphens. */
export function normalizeStoreSlug(nameOrSlug) {
  return slugFromName(nameOrSlug)
}

export function categoryId(value) {
  if (!value) return ''
  if (typeof value === 'object' && value.id != null) return String(value.id)
  return String(value)
}

export function safeInt(value, fallback = 0) {
  const n = Number.parseInt(String(value ?? ''), 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

export function safeMoney(value, fallback = 0) {
  const n = Number.parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : fallback
}
