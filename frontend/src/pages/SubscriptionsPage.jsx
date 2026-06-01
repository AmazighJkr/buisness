import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { fetchPaymentConfig, fetchPacks, fetchUserMe, subscribeToPack } from '../api/client.js'
import { detectClientCountry } from '../utils/paymentRegion.js'
import { formatDzd, formatPackPrice, formatUsd, useDzdPricing } from '../utils/formatMoney.js'

export default function SubscriptionsPage() {
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
        fetchPaymentConfig(),
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
      setMsg('Sign in first to subscribe.')
      return
    }
    setMsg('')
    try {
      const result = await subscribeToPack(packId)
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'manual') {
        setMsg(result.instructions || 'Subscription pending — complete payment to activate.')
        return
      }
      setMsg(result.is_upgrade ? 'Upgrade complete!' : 'Subscription activated!')
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const packAction = (pack) => {
    const state = pack.access_state || 'available'
    if (state === 'active') {
      return <p className="mt-4 text-sm text-lab-green">Your current plan</p>
    }
    if (state === 'included') {
      return <p className="mt-4 text-sm text-lab-green">Included in your plan</p>
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
          Upgrade — {useDzd ? formatDzd(due) : formatUsd(due)}
          <span className="block text-[10px] font-normal opacity-80">
            Pay difference only · same expiry date
          </span>
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={() => handleSubscribe(pack.id)}
        className="btn-primary mt-4 w-full"
      >
        Subscribe
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
          <h1 className="font-display text-xl font-semibold">Subscription packs</h1>
          <p className="mt-2 text-sm text-dark-muted">
            Higher packs include all projects from lower tiers. Upgrade anytime and pay only
            the price difference — your expiry date stays the same.
          </p>
          {useDzd && (
            <p className="mt-2 text-sm text-lab-cyan">
              Prices in Algerian dinar (DZD). Payment via Chargily (Edahabia / CIB).
            </p>
          )}
          {!useDzd && paymentProvider === 'stripe' && (
            <p className="mt-2 text-sm text-dark-muted">Prices in US dollars (USD). Card payment via Stripe.</p>
          )}
          {!user && (
            <p className="mt-2 text-sm">
              <Link to="/account" className="underline">
                Sign in or register
              </Link>{' '}
              to subscribe.
            </p>
          )}
        </div>

        {msg && <p className="text-sm text-dark-muted">{msg}</p>}

        {highlightProjectId && (
          <p className="rounded border border-lab-cyan/40 bg-lab-cyan/10 px-3 py-2 text-sm text-dark-text">
            Subscribe to unlock the project you selected. The recommended pack is highlighted below.
          </p>
        )}

        {loading ? (
          <p className="text-sm text-dark-muted animate-pulse">Loading packs…</p>
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
                    / {pack.duration_days} days
                  </span>
                </p>
                <p className="mt-1 text-xs text-dark-muted">
                  {pack.project_count} project{pack.project_count === 1 ? '' : 's'} in this tier
                  {pack.sort_order > 1 && ' · includes lower tiers'}
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
