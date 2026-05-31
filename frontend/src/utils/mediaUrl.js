/** Normalize API media paths (always root-relative or absolute HTTPS). */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== 'string') return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed
  }
  if (trimmed.startsWith('/')) return trimmed
  return `/media/${trimmed.replace(/^\/+/, '')}`
}

export const SCHEMATIC_PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
      <rect fill="#f3f4f6" width="400" height="200"/>
      <text x="200" y="95" text-anchor="middle" fill="#6b7280" font-family="system-ui,sans-serif" font-size="13">Schematic not available</text>
      <text x="200" y="118" text-anchor="middle" fill="#9ca3af" font-family="system-ui,sans-serif" font-size="10">Re-upload in admin or add Cloudinary on Render</text>
    </svg>`,
  )
