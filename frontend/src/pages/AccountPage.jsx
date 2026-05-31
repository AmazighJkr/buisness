import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import GoogleSignInButton from '../components/GoogleSignInButton.jsx'
import {
  fetchAuthConfig,
  fetchUserMe,
  userGoogleLogin,
  userLogin,
  userLogout,
  userRegister,
} from '../api/client.js'

export default function AccountPage() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authConfig, setAuthConfig] = useState({ google_sign_in: false, google_client_id: '' })
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '' })

  useEffect(() => {
    Promise.all([fetchUserMe(), fetchAuthConfig().catch(() => ({}))])
      .then(([u, cfg]) => {
        setUser(u)
        setAuthConfig(cfg || {})
      })
      .finally(() => setLoading(false))
    if (searchParams.get('subscribed') === '1') {
      setError('')
    }
  }, [searchParams])

  const handleGoogleSuccess = useCallback(async (credential) => {
    setError('')
    try {
      const data = await userGoogleLogin(credential)
      setUser(data.user)
    } catch (err) {
      setError(err.message)
    }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await userLogin(form.username, form.password)
      setUser(data.user)
      setError('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await userRegister({
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.first_name,
      })
      setUser(data.user)
    } catch (err) {
      setError(err.message)
    }
  }

  const logout = () => {
    userLogout()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="page-shell">
        <PageHeader highlight="/account" />
        <p className="p-8 text-sm text-dark-muted animate-pulse">Loading…</p>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/account" />

      <main className="page-main mx-auto max-w-md space-y-6">
        {user ? (
          <>
            <h1 className="font-display text-xl font-semibold">Welcome, {user.username}</h1>
            <p className="text-sm text-lab-cyan">You are signed in. Use the top bar to see your account on any page.</p>
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
                  <Link to="/subscriptions" className="underline">
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
          </>
        ) : (
          <>
            <h1 className="font-display text-xl font-semibold">Account</h1>
            <p className="text-sm text-dark-muted">
              Create an account to unlock subscription packs and save your project access.
            </p>
            <div className="flex gap-2 rounded-lg border border-dark-border bg-dark-panel p-1">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 rounded-md py-2 text-sm transition-colors ${
                  mode === 'login'
                    ? 'bg-[color-mix(in_srgb,var(--eg-accent)_14%,var(--eg-panel))] font-medium text-lab-cyan'
                    : 'text-dark-muted'
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 rounded-md py-2 text-sm transition-colors ${
                  mode === 'register'
                    ? 'bg-[color-mix(in_srgb,var(--eg-accent)_14%,var(--eg-panel))] font-medium text-lab-cyan'
                    : 'text-dark-muted'
                }`}
              >
                Register
              </button>
            </div>
            <form
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
              className="panel space-y-3 p-4"
            >
              {authConfig.google_sign_in && authConfig.google_client_id && (
                <>
                  <GoogleSignInButton
                    clientId={authConfig.google_client_id}
                    onSuccess={handleGoogleSuccess}
                    onError={(err) => setError(err.message)}
                  />
                  <p className="text-center text-xs text-dark-muted">or use username & password</p>
                </>
              )}
              <input
                required
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="input-field"
              />
              {mode === 'register' && (
                <>
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="input-field"
                  />
                  <input
                    placeholder="First name (optional)"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="input-field"
                  />
                </>
              )}
              <input
                required
                type="password"
                minLength={8}
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input-field"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button type="submit" className="btn-primary w-full">
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
