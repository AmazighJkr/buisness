import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { fetchPacks, fetchUserMe, subscribeToPack } from '../api/client.js'

export default function SubscriptionsPage() {
  const [packs, setPacks] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const u = await fetchUserMe()
      setUser(u)
      const p = await fetchPacks()
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
      const due = Number(pack.price_due ?? pack.price)
      return (
        <button
          type="button"
          onClick={() => handleSubscribe(pack.id)}
          className="mt-4 border border-lab-cyan py-2 text-sm text-lab-cyan panel-hover w-full"
        >
          Upgrade — ${due.toFixed(2)}
          <span className="block text-[10px] font-normal text-dark-muted">
            Pay difference only · same expiry date
          </span>
        </button>
      )
    }
    return (
      <button
        type="button"
        onClick={() => handleSubscribe(pack.id)}
        className="mt-4 border border-lab-cyan py-2 text-sm text-lab-cyan panel-hover w-full"
      >
        Subscribe
      </button>
    )
  }

  const priceLabel = (pack) => {
    if (pack.access_state === 'upgrade') {
      return (
        <>
          <span className="text-lg text-dark-muted line-through">
            ${Number(pack.price).toFixed(2)}
          </span>{' '}
          <span className="text-2xl font-semibold tabular-nums">
            ${Number(pack.price_due ?? pack.price).toFixed(2)}
          </span>
        </>
      )
    }
    return (
      <span className="text-2xl font-semibold tabular-nums">
        ${Number(pack.price).toFixed(2)}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <PageHeader highlight="/subscriptions" />

      <main className="mx-auto max-w-3xl space-y-6 px-3 py-8 sm:px-4">
        <div>
          <h1 className="text-xl font-semibold">Subscription packs</h1>
          <p className="mt-2 text-sm text-dark-muted">
            Higher packs include all projects from lower tiers. Upgrade anytime and pay only
            the price difference — your expiry date stays the same.
          </p>
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

        {loading ? (
          <p className="text-sm text-dark-muted animate-pulse">Loading packs…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {packs.map((pack) => (
              <article key={pack.id} className="panel flex flex-col p-5">
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
