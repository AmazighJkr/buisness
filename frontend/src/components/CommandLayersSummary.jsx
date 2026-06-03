import { useEffect, useState } from 'react'
import { fetchPaymentConfig } from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import { detectClientCountry } from '../utils/paymentRegion.js'
import { formatDzd, formatUsd, useDzdPricing } from '../utils/formatMoney.js'

export default function CommandLayersSummary({ layers = [], totalUsd, totalDzd }) {
  const { t } = useTranslation()
  const [useDzd, setUseDzd] = useState(false)

  useEffect(() => {
    detectClientCountry()
      .then(() => fetchPaymentConfig())
      .then((cfg) => setUseDzd(useDzdPricing(cfg?.provider)))
      .catch(() => setUseDzd(false))
  }, [])

  if (!layers?.length) return null

  const total = useDzd ? Number(totalDzd || 0) : Number(totalUsd || 0)
  const format = useDzd ? formatDzd : formatUsd

  return (
    <div className="border border-dark-border bg-dark-bg p-3 text-xs">
      <p className="font-medium text-dark-text">{t('commandLayers.selectedTitle')}</p>
      <ul className="mt-2 space-y-1">
        {layers.map((row) => (
          <li key={row.id || row.slug} className="flex justify-between gap-2 text-dark-muted">
            <span>{row.name}</span>
            <span className="tabular-nums shrink-0">
              {format(Number(useDzd ? row.price_dzd : row.price_usd || 0))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex justify-between border-t border-dark-border pt-2 font-medium text-dark-text">
        <span>{t('commandLayers.estimatedTotal')}</span>
        <span className="tabular-nums text-lab-cyan">{format(total)}</span>
      </p>
      <p className="mt-1 text-[10px] text-dark-muted">{t('commandLayers.quoteHint')}</p>
    </div>
  )
}
