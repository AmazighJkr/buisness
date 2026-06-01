import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import AuthLoginCard from '../components/auth/AuthLoginCard.jsx'
import {
  fetchUserMe,
  userGoogleLogin,
  userLogin,
  userLogout,
  userRegister,
} from '../api/client.js'

export default function AccountPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('next')
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '' })

  useEffect(() => {
    fetchUserMe()
      .then((me) => {
        setUser(me)
        const dest = returnTo && returnTo.startsWith('/') ? returnTo : null
        if (me && dest) navigate(dest, { replace: true })
      })
      .finally(() => setLoading(false))
    if (searchParams.get('subscribed') === '1') {
      setError('')
    }
  }, [searchParams, returnTo, navigate])

  const afterAuth = useCallback(
    (authUser) => {
      setUser(authUser)
      const dest = returnTo && returnTo.startsWith('/') ? returnTo : null
      if (dest) navigate(dest, { replace: true })
    },
    [navigate, returnTo],
  )

  const handleGoogleSuccess = useCallback(
    async (credential) => {
      setError('')
      setSubmitting(true)
      try {
        const data = await userGoogleLogin(credential)
        afterAuth(data.user)
      } catch (err) {
        setError(err.message)
      } finally {
        setSubmitting(false)
      }
    },
    [afterAuth],
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        const data = await userLogin(form.username, form.password)
        afterAuth(data.user)
      } else {
        const data = await userRegister({
          username: form.username,
          email: form.email,
          password: form.password,
          first_name: form.first_name,
        })
        afterAuth(data.user)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const logout = () => {
    userLogout()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-page-bg" aria-hidden />
        <p className="relative z-10 p-8 text-sm text-dark-muted animate-pulse">Loading…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthLoginCard
        mode={mode}
        setMode={setMode}
        form={form}
        setForm={setForm}
        error={error}
        submitting={submitting}
        onSubmit={handleSubmit}
        onGoogleSuccess={handleGoogleSuccess}
        onGoogleError={(err) => setError(err.message)}
      />
    )
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/account" />

      <main className="page-main mx-auto max-w-md space-y-6">
        <h1 className="font-display text-xl font-semibold">Welcome, {user.username}</h1>
        <p className="text-sm text-dark-muted">
          You are signed in. Manage subscriptions and project access from here.
        </p>
        <div className="panel space-y-2 p-4 text-sm">
          <p>
            <span className="text-dark-muted">Username:</span> {user.username}
          </p>
          <p>
            <span className="text-dark-muted">Email:</span> {user.email}
          </p>
          {user.subscriptions?.length > 0 ? (
            <div className="mt-3 border-t border-dark-border pt-3">
              <p className="text-xs font-medium uppercase text-dark-muted">Active packs</p>
              <ul className="mt-2 space-y-1">
                {user.subscriptions.map((s) => (
                  <li key={s.id} className="text-xs">
                    {s.pack_name} — until{' '}
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs text-dark-muted">
              No active subscription.{' '}
              <Link to="/subscriptions" className="text-lab-cyan underline">
                Browse packs
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/subscriptions" className="btn-primary flex-1 text-center">
            Subscriptions
          </Link>
          <button type="button" onClick={logout} className="btn-secondary">
            Log out
          </button>
        </div>
      </main>
    </div>
  )
}
