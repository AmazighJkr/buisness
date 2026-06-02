/** Build a URL-safe link segment from a display name (e.g. "Arduino UNO" → "arduino-uno"). */
export function slugFromName(name) {
  return (name || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
