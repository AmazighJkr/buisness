import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import { fetchPacks, fetchUserMe, subscribeToPack } from '../api/client.js'

export default function SubscriptionsPage() {
  const [packs, setPacks] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([fetchPacks(), fetchUserMe()])
      .then(([p, u]) => {
        setPacks(p)
        setUser(u)
      })
      .catch(() => setPacks([]))
      .finally(() => setLoading(false))
  }, [])

  const activeIds = new Set((user?.active_pack_ids || []).map(String))

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
      setMsg('Subscription activated!')
      const me = await fetchUserMe()
      setUser(me)
    } catch (err) {
      setMsg(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <PageHeader highlight="/subscriptions" />

      <main className="mx-auto max-w-3xl space-y-6 px-3 py-8 sm:px-4">
        <div>
          <h1 className="text-xl font-semibold">Subscription packs</h1>
          <p className="mt-2 text-sm text-dark-muted">
            Free projects are open to everyone. Packs unlock curated project libraries with
            schematics, code, and simulations.
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
            {packs.map((pack) => {
              const active = activeIds.has(String(pack.id))
              return (
                <article key={pack.id} className="panel flex flex-col p-5">
                  <h2 className="text-lg font-medium">{pack.name}</h2>
                  <p className="mt-2 flex-1 text-sm text-dark-muted">{pack.description}</p>
                  <p className="mt-4 text-2xl font-semibold tabular-nums">
                    ${Number(pack.price).toFixed(2)}
                    <span className="text-sm font-normal text-dark-muted"> / {pack.duration_days} days</span>
                  </p>
                  <p className="mt-1 text-xs text-dark-muted">
                    {pack.project_count} project{pack.project_count === 1 ? '' : 's'}
                  </p>
                  {active ? (
                    <p className="mt-4 text-sm text-lab-green">Active on your account</p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSubscribe(pack.id)}
                      className="mt-4 border border-lab-cyan py-2 text-sm text-lab-cyan panel-hover"
                    >
                      Subscribe
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
