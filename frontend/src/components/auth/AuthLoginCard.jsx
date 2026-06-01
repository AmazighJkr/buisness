import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import ContinueWithGoogle from '../ContinueWithGoogle.jsx'
import ThemeToggle from '../ThemeToggle.jsx'
import { fetchAuthConfig } from '../../api/client.js'

export default function AuthLoginCard({
  mode,
  setMode,
  form,
  setForm,
  error,
  submitting,
  onSubmit,
  onGoogleSuccess,
  onGoogleError,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const [authConfig, setAuthConfig] = useState({ google_sign_in: false, google_client_id: '' })

  useEffect(() => {
    fetchAuthConfig()
      .then(setAuthConfig)
      .catch(() => setAuthConfig({ google_sign_in: false, google_client_id: '' }))
  }, [])

  const googleClientId =
    authConfig.google_client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  const handleGoogle = useCallback(
    (credential) => {
      onGoogleSuccess?.(credential)
    },
    [onGoogleSuccess],
  )

  const handleFormSubmit = (e) => {
    if (mode === 'register') {
      if (!form.email?.trim()) {
        e.preventDefault()
        onGoogleError?.(new Error('Email is required.'))
        return
      }
      if (!form.password || form.password.length < 8) {
        e.preventDefault()
        onGoogleError?.(new Error('Password must be at least 8 characters.'))
        return
      }
      if (!form.username?.trim()) {
        e.preventDefault()
        onGoogleError?.(new Error('Username is required.'))
        return
      }
    }
    onSubmit(e)
  }

  return (
    <div className="auth-page">
      <div className="auth-page-bg" aria-hidden />
      <div className="auth-page-grid" aria-hidden />

      <div className="auth-back flex items-center gap-2">
        <Link to="/" className="auth-back-link">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <ThemeToggle compact />
      </div>

      <div className="auth-center">
        <div className="auth-card">
          <div className="auth-logo-box">
            <div className="text-center">
              <span className="auth-logo-text">EMBEDDED</span>
              <span className="auth-logo-sub">GRID LAB</span>
            </div>
          </div>

          <h1 className="auth-title">{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Sign in to unlock projects and subscriptions'
              : 'Register to access packs and saved progress'}
          </p>

          <div className="auth-mode-tabs mt-5">
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'login' ? 'auth-mode-tab-active' : ''}`}
              onClick={() => setMode('login')}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`auth-mode-tab ${mode === 'register' ? 'auth-mode-tab-active' : ''}`}
              onClick={() => setMode('register')}
            >
              Register
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="auth-google-wrap mt-5">
            <ContinueWithGoogle
              clientId={googleClientId}
              onSuccess={handleGoogle}
              onError={(err) => onGoogleError?.(err)}
            />
          </div>
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          <form
            className="auth-form"
            onSubmit={handleFormSubmit}
            autoComplete="on"
            noValidate
          >
            <div>
              <label className="auth-label" htmlFor="auth-username">
                Username
              </label>
              <input
                id="auth-username"
                required
                autoComplete="username"
                placeholder="Enter your username"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="auth-input"
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label className="auth-label" htmlFor="auth-email">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    required
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="auth-input"
                  />
                </div>
                <div>
                  <label className="auth-label" htmlFor="auth-first">
                    First name (optional)
                  </label>
                  <input
                    id="auth-first"
                    autoComplete="given-name"
                    placeholder="Your name"
                    value={form.first_name}
                    onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                    className="auth-input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="auth-label" htmlFor="auth-password">
                Password
              </label>
              <div className="auth-password-wrap">
                <input
                  id="auth-password"
                  required
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="auth-input pr-11"
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={submitting}>
              {submitting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Please wait…
                </span>
              ) : mode === 'login' ? (
                'Sign in to EmbeddedGrid'
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="auth-footer">
            {mode === 'login' ? (
              <p>
                New here?{' '}
                <button type="button" onClick={() => setMode('register')}>
                  Create an account
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button type="button" onClick={() => setMode('login')}>
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
