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

/** Flat list with top-level categories and indented children for select options. */
export function storeCategorySelectOptions(categories) {
  const rows = [...(categories || [])]
  const tops = rows.filter((c) => !c.parent).sort((a, b) => a.name.localeCompare(b.name))
  const options = []
  for (const top of tops) {
    options.push({ id: top.id, label: top.name })
    const children = rows
      .filter((c) => c.parent === top.id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    for (const child of children) {
      options.push({ id: child.id, label: `↳ ${child.name}` })
    }
  }
  const listed = new Set(options.map((o) => o.id))
  for (const orphan of rows.filter((c) => c.parent && !listed.has(c.id))) {
    options.push({ id: orphan.id, label: orphan.name })
  }
  return options
}
