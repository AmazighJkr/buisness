import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import {
  fetchUserMe,
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
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '' })

  useEffect(() => {
    fetchUserMe().then(setUser).finally(() => setLoading(false))
    if (searchParams.get('subscribed') === '1') {
      setError('')
    }
  }, [searchParams])

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
      <div className="min-h-screen bg-dark-bg text-dark-text">
        <PageHeader highlight="/account" />
        <p className="p-8 text-sm text-dark-muted animate-pulse">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg text-dark-text">
      <PageHeader highlight="/account" />

      <main className="mx-auto max-w-md space-y-6 px-3 py-8 sm:px-4">
        {user ? (
          <>
            <h1 className="text-xl font-semibold">Welcome, {user.username}</h1>
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
            <div className="flex gap-2">
              <Link
                to="/subscriptions"
                className="flex-1 border border-dark-border py-2 text-center text-sm panel-hover"
              >
                Subscriptions
              </Link>
              <button
                type="button"
                onClick={logout}
                className="border border-dark-border px-4 py-2 text-sm text-dark-muted"
              >
                Log out
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Account</h1>
            <p className="text-sm text-dark-muted">
              Create an account to unlock subscription packs and save your project access.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={`flex-1 border py-2 text-sm ${mode === 'login' ? 'border-dark-text' : 'border-dark-border text-dark-muted'}`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode('register')}
                className={`flex-1 border py-2 text-sm ${mode === 'register' ? 'border-dark-text' : 'border-dark-border text-dark-muted'}`}
              >
                Register
              </button>
            </div>
            <form
              onSubmit={mode === 'login' ? handleLogin : handleRegister}
              className="panel space-y-3 p-4"
            >
              <input
                required
                placeholder="Username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
              />
              {mode === 'register' && (
                <>
                  <input
                    required
                    type="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                  />
                  <input
                    placeholder="First name (optional)"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
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
                className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <button
                type="submit"
                className="w-full border border-lab-cyan py-2 text-sm text-lab-cyan"
              >
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
