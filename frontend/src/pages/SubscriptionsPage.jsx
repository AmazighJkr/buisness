import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
import { fetchPaymentConfig, fetchPacks, fetchUserMe, subscribeToPack } from '../api/client.js'
import { detectClientCountry } from '../utils/paymentRegion.js'
import { formatDzd, formatPackPrice, formatUsd, useDzdPricing } from '../utils/formatMoney.js'

export default function SubscriptionsPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const highlightPackId = searchParams.get('pack')
  const highlightProjectId = searchParams.get('project')
  const packRefs = useRef({})

  const [packs, setPacks] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [paymentProvider, setPaymentProvider] = useState('stripe')

  const useDzd = useDzdPricing(paymentProvider)

  const load = async () => {
    setLoading(true)
    try {
      await detectClientCountry()
      const [cfg, u, p] = await Promise.all([
        fetchPaymentConfig({ forceRefresh: true }),
        fetchUserMe(),
        fetchPacks(),
      ])
      setPaymentProvider(cfg.provider || 'stripe')
      setUser(u)
      setPacks([...p].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))
    } catch {
      setPacks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (!highlightPackId || loading) return
    const el = packRefs.current[highlightPackId]
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightPackId, loading, packs])

  const handleSubscribe = async (packId) => {
    if (!user) {
      setMsg(t('subscriptions.signInFirst'))
      return
    }
    setMsg('')
    try {
      const result = await subscribeToPack(packId, paymentProvider)
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'manual') {
        setMsg(result.instructions || t('subscriptions.pendingManual'))
        return
      }
      setMsg(result.is_upgrade ? t('subscriptions.upgradeComplete') : t('subscriptions.activated'))
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const packAction = (pack) => {
    const state = pack.access_state || 'available'
    if (state === 'active') {
      return <p className="mt-4 text-sm text-lab-green">{t('subscriptions.currentPlan')}</p>
    }
    if (state === 'included') {
      return <p className="mt-4 text-sm text-lab-green">{t('subscriptions.includedInPlan')}</p>
    }
    if (state === 'upgrade') {
      const due = useDzd
        ? Number(pack.price_due_dzd ?? pack.price_dzd)
        : Number(pack.price_due ?? pack.price)
      return (
        <button
          type="button"
          onClick={() => handleSubscribe(pack.id)}
          className="btn-primary mt-4 w-full"
        >
          {t('subscriptions.upgrade')} — {useDzd ? formatDzd(due) : formatUsd(due)}
          <span className="block text-[10px] font-normal opacity-80">{t('subscriptions.upgradeHint')}</span>
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={() => handleSubscribe(pack.id)}
        className="btn-primary mt-4 w-full"
      >
        {t('subscriptions.subscribe')}
      </button>
    )
  }

  const priceLabel = (pack) => {
    if (pack.access_state === 'upgrade') {
      const full = useDzd ? pack.price_dzd : pack.price
      const due = useDzd ? pack.price_due_dzd ?? pack.price_dzd : pack.price_due ?? pack.price
      return (
        <>
          <span className="text-lg text-dark-muted line-through">
            {useDzd ? formatDzd(full) : formatUsd(full)}
          </span>{' '}
          <span className="text-2xl font-semibold tabular-nums">
            {useDzd ? formatDzd(due) : formatUsd(due)}
          </span>
        </>
      )
    }
    return (
      <span className="text-2xl font-semibold tabular-nums">{formatPackPrice(pack, useDzd)}</span>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/subscriptions" />

      <main className="page-main mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="font-display text-xl font-semibold">{t('subscriptions.heading')}</h1>
          <p className="mt-2 text-sm text-dark-muted">{t('subscriptions.intro')}</p>
          {useDzd && <p className="mt-2 text-sm text-lab-cyan">{t('subscriptions.pricesDzd')}</p>}
          {!useDzd && paymentProvider === 'stripe' && (
            <p className="mt-2 text-sm text-dark-muted">{t('subscriptions.pricesUsd')}</p>
          )}
          {!user && (
            <p className="mt-2 text-sm">
              <Link to="/account" className="underline">
                {t('subscriptions.signInToSubscribe')}
              </Link>
            </p>
          )}
        </div>

        {msg && <p className="text-sm text-dark-muted">{msg}</p>}

        {highlightProjectId && (
          <p className="rounded border border-lab-cyan/40 bg-lab-cyan/10 px-3 py-2 text-sm text-dark-text">
            {t('subscriptions.unlockProject')}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-dark-muted animate-pulse">{t('subscriptions.loadingPacks')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => (
              <article
                key={pack.id}
                ref={(el) => {
                  packRefs.current[pack.id] = el
                }}
                className={`panel flex flex-col p-5 ${
                  highlightPackId === pack.id
                    ? 'ring-2 ring-lab-cyan ring-offset-2 ring-offset-[var(--eg-bg)]'
                    : ''
                }`}
              >
                <h2 className="text-lg font-medium">{pack.name}</h2>
                <p className="mt-2 flex-1 text-sm text-dark-muted">{pack.description}</p>
                <p className="mt-4">
                  {priceLabel(pack)}
                  <span className="text-sm font-normal text-dark-muted">
                    {' '}
                    / {pack.duration_days} {t('subscriptions.days')}
                  </span>
                </p>
                <p className="mt-1 text-xs text-dark-muted">
                  {pack.project_count === 1
                    ? t('subscriptions.projectCount', { count: pack.project_count })
                    : t('subscriptions.projectCountPlural', { count: pack.project_count })}
                  {pack.sort_order > 1 && t('subscriptions.includesLower')}
                </p>
                {packAction(pack)}
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
