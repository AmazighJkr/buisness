/** Format pack/command amounts for Stripe (USD) vs Chargily (DZD). */
export function useDzdPricing(paymentProvider) {
  return paymentProvider === 'chargily'
}

export function formatUsd(amount) {
  return `$${Number(amount || 0).toFixed(2)}`
}

export function formatDzd(amount) {
  const n = Math.round(Number(amount || 0))
  return `${n.toLocaleString('fr-DZ')} DZD`
}

export function formatPackPrice(pack, useDzd, { due = false } = {}) {
  if (useDzd) {
    const value = due ? pack.price_due_dzd ?? pack.price_dzd : pack.price_dzd
    return formatDzd(value)
  }
  const value = due ? pack.price_due ?? pack.price : pack.price
  return formatUsd(value)
}

export function formatCommandBill(command, useDzd) {
  if (useDzd) {
    return formatDzd(command.quoted_price_dzd)
  }
  return formatUsd(command.quoted_price)
}

export function formatStoreTotal(usd, dzd, useDzd) {
  return useDzd ? formatDzd(dzd) : formatUsd(usd)
}
