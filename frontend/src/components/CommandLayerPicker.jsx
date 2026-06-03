import { useEffect, useMemo, useState } from 'react'
import { Check } from 'lucide-react'
import { useTranslation } from '../context/LocaleContext.jsx'
import { fetchCommandLayers } from '../api/client.js'
import { fetchPaymentConfig } from '../api/client.js'
import { detectClientCountry } from '../utils/paymentRegion.js'
import { formatDzd, formatUsd, useDzdPricing } from '../utils/formatMoney.js'

const GROUP_ORDER = ['firmware', 'mobile', 'cloud', 'wireless']

export default function CommandLayerPicker({ selectedIds, onChange }) {
  const { t } = useTranslation()
  const [layers, setLayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [useDzd, setUseDzd] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchCommandLayers().catch(() => []),
      detectClientCountry().then(() => fetchPaymentConfig()).catch(() => ({ provider: 'stripe' })),
    ])
      .then(([list, cfg]) => {
        if (cancelled) return
        setLayers(list)
        setUseDzd(useDzdPricing(cfg?.provider))
        const required = list.filter((l) => l.is_required).map((l) => l.id)
        if (required.length && !selectedIds.length) {
          onChange(required)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || t('commandLayers.loadError'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const grouped = useMemo(() => {
    const map = new Map()
    for (const layer of layers) {
      const g = layer.group || 'firmware'
      if (!map.has(g)) map.set(g, [])
      map.get(g).push(layer)
    }
    return GROUP_ORDER.filter((g) => map.has(g)).map((g) => [g, map.get(g)])
  }, [layers])

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const total = useMemo(() => {
    return layers.reduce((sum, layer) => {
      if (!selectedSet.has(layer.id)) return sum
      return sum + Number(useDzd ? layer.price_dzd : layer.price_usd || 0)
    }, 0)
  }, [layers, selectedSet, useDzd])

  const toggle = (layer) => {
    if (layer.is_required) return
    if (selectedSet.has(layer.id)) {
      onChange(selectedIds.filter((id) => id !== layer.id))
    } else {
      onChange([...selectedIds, layer.id])
    }
  }

  const groupLabel = (key) => t(`commandLayers.groups.${key}`) || key

  if (loading) {
    return <p className="text-xs text-dark-muted animate-pulse">{t('commandLayers.loading')}</p>
  }

  if (error) {
    return <p className="text-xs text-red-400">{error}</p>
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-dark-text">{t('commandLayers.title')}</p>
        <p className="mt-1 text-xs text-dark-muted">{t('commandLayers.lead')}</p>
      </div>

      {grouped.map(([groupKey, items]) => (
        <div key={groupKey}>
          <p className="mb-2 text-[10px] uppercase tracking-wide text-lab-cyan">{groupLabel(groupKey)}</p>
          <ul className="space-y-2">
            {items.map((layer) => {
              const on = selectedSet.has(layer.id)
              const price = useDzd
                ? formatDzd(Number(layer.price_dzd || 0))
                : formatUsd(Number(layer.price_usd || 0))
              return (
                <li key={layer.id}>
                  <button
                    type="button"
                    disabled={layer.is_required}
                    onClick={() => toggle(layer)}
                    className={`flex w-full items-start gap-3 border px-3 py-2.5 text-left text-xs transition-colors ${
                      on
                        ? 'border-lab-cyan bg-lab-cyan/10'
                        : 'border-dark-border panel-hover'
                    } ${layer.is_required ? 'cursor-default opacity-90' : ''}`}
                  >
                    <span
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border ${
                        on ? 'border-lab-cyan bg-lab-cyan text-dark-bg' : 'border-dark-border'
                      }`}
                      aria-hidden
                    >
                      {on && <Check className="h-3 w-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium text-dark-text">
                          {layer.name}
                          {layer.is_required && (
                            <span className="ml-1 text-[10px] font-normal text-dark-muted">
                              ({t('commandLayers.required')})
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums text-lab-cyan">{price}</span>
                      </span>
                      {layer.description && (
                        <span className="mt-1 block text-dark-muted">{layer.description}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <div className="border border-dark-border bg-dark-panel px-4 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium">{t('commandLayers.estimatedTotal')}</span>
          <span className="text-lg font-semibold tabular-nums text-lab-cyan">
            {useDzd ? formatDzd(total) : formatUsd(total)}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-dark-muted">{t('commandLayers.totalHint')}</p>
      </div>
    </div>
  )
}
