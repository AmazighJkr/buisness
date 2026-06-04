import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import AuthLoginCard from '../components/auth/AuthLoginCard.jsx'
import {
  fetchUserMe,
  userChangePassword,
  userGoogleLogin,
  userLogin,
  userLogout,
  userRegister,
} from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function AccountPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const returnTo = searchParams.get('next')
  const [mode, setMode] = useState('login')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '' })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwMsg, setPwMsg] = useState('')
  const [pwSubmitting, setPwSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchUserMe()
      .then((me) => {
        if (cancelled) return
        // Do not overwrite a successful login/register if this slow request started before the token existed.
        setUser((current) => {
          const hasToken = Boolean(localStorage.getItem('user_access_token'))
          if (current && !me && hasToken) return current
          return me
        })
        const dest = returnTo && returnTo.startsWith('/') ? returnTo : null
        if (me && dest) navigate(dest, { replace: true })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    if (searchParams.get('subscribed') === '1') {
      setError('')
    }
    return () => {
      cancelled = true
    }
  }, [searchParams, returnTo, navigate])

  const afterAuth = useCallback(
    async (authUser, tokenFromResponse) => {
      let nextUser = authUser
      if (!nextUser && tokenFromResponse) {
        nextUser = await fetchUserMe()
      }
      if (!nextUser) {
        setError(t('account.profileLoadError'))
        return
      }
      setUser(nextUser)
      setError('')
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
        await afterAuth(data.user, data.access)
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
        await afterAuth(data.user, data.access)
      } else {
        const data = await userRegister({
          username: form.username.trim(),
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
        })
        await afterAuth(data.user, data.access)
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

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPwMsg('')
    if (pwForm.next.length < 8) {
      setPwMsg(t('account.passwordMin'))
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwMsg(t('account.passwordMismatch'))
      return
    }
    setPwSubmitting(true)
    try {
      await userChangePassword(pwForm.current, pwForm.next)
      setPwForm({ current: '', next: '', confirm: '' })
      setPwMsg(t('account.passwordUpdated'))
    } catch (err) {
      setPwMsg(err.message)
    } finally {
      setPwSubmitting(false)
    }
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
        <h1 className="font-display text-xl font-semibold">
          {t('account.welcome', { name: user.username })}
        </h1>
        <p className="text-sm text-dark-muted">{t('account.signedInLead')}</p>
        <div className="panel space-y-2 p-4 text-sm">
          <p>
            <span className="text-dark-muted">{t('account.username')}:</span> {user.username}
          </p>
          <p>
            <span className="text-dark-muted">{t('account.email')}:</span> {user.email}
          </p>
          {user.subscriptions?.length > 0 ? (
            <div className="mt-3 border-t border-dark-border pt-3">
              <p className="text-xs font-medium uppercase text-dark-muted">{t('account.activePacks')}</p>
              <ul className="mt-2 space-y-1">
                {user.subscriptions.map((s) => (
                  <li key={s.id} className="text-xs">
                    {s.pack_name} — {t('account.until')}{' '}
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : '—'}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-3 text-xs text-dark-muted">
              {t('account.noSubscription')}{' '}
              <Link to="/subscriptions" className="text-lab-cyan underline">
                {t('account.browsePacks')}
              </Link>
            </p>
          )}
        </div>
        <div className="panel space-y-3 p-4">
          <h2 className="text-sm font-semibold">{t('account.securityTitle')}</h2>
          <p className="text-xs text-dark-muted">{t('account.securityLead')}</p>
          {!user.has_usable_password ? (
            <p className="text-xs text-dark-muted">{t('account.googleNoPassword')}</p>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-2">
              <label className="block text-xs text-dark-muted">
                {t('account.currentPassword')}
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={pwForm.current}
                  onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-dark-muted">
                {t('account.newPassword')}
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={pwForm.next}
                  onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs text-dark-muted">
                {t('account.confirmPassword')}
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
              </label>
              {pwMsg && (
                <p
                  className={`text-xs ${pwMsg === t('account.passwordUpdated') ? 'text-lab-green' : 'text-red-300'}`}
                >
                  {pwMsg}
                </p>
              )}
              <button type="submit" disabled={pwSubmitting} className="btn-secondary text-sm">
                {pwSubmitting ? t('account.updating') : t('account.changePassword')}
              </button>
            </form>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/subscriptions" className="btn-primary flex-1 text-center">
            {t('account.subscriptions')}
          </Link>
          <button type="button" onClick={logout} className="btn-secondary">
            {t('account.logOut')}
          </button>
        </div>
      </main>
    </div>
  )
}
