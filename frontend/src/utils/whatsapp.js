import { CONTACT } from '../config/contact.js'

/** Pre-filled WhatsApp link for store order support (Algeria). */
export function buildWhatsappOrderUrl(orderNumber, baseUrl = '') {
  const base = (baseUrl || CONTACT.whatsappHref || '').trim()
  if (!base || !orderNumber) return ''
  const text = encodeURIComponent(
    `Bonjour / Hello — commande ${orderNumber}. Merci / Thank you.`,
  )
  const sep = base.includes('?') ? '&' : '?'
  return `${base}${sep}text=${text}`
}
