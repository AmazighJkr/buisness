import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client'

let scriptPromise = null

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GSI_SCRIPT}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = GSI_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
  return scriptPromise
}

/** Official Google "G" mark (simplified SVG for button). */
function GoogleGIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  )
}

export default function ContinueWithGoogle({ clientId, onSuccess, onError, className = '' }) {
  const hiddenHostRef = useRef(null)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const { isDark } = useTheme()
  const [gsiReady, setGsiReady] = useState(false)
  const [loading, setLoading] = useState(false)

  const configured = Boolean(clientId?.trim())

  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  useEffect(() => {
    if (!configured) {
      setGsiReady(false)
      return undefined
    }

    let cancelled = false

    loadGoogleScript()
      .then(() => {
        if (cancelled || !hiddenHostRef.current) return
        window.google.accounts.id.initialize({
          client_id: clientId.trim(),
          callback: (response) => {
            setLoading(false)
            if (response?.credential) {
              onSuccessRef.current?.(response.credential)
            } else {
              onErrorRef.current?.(new Error('Google sign-in was cancelled.'))
            }
          },
        })
        hiddenHostRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(hiddenHostRef.current, {
          type: 'standard',
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          width: 360,
        })
        setGsiReady(true)
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.(new Error('Could not load Google sign-in.'))
      })

    return () => {
      cancelled = true
    }
  }, [clientId, configured, isDark])

  const handleClick = () => {
    if (!configured) {
      onErrorRef.current?.(
        new Error(
          'Google sign-in is not configured on the server yet. Add GOOGLE_OAUTH_CLIENT_ID in Render → Environment, then redeploy.',
        ),
      )
      return
    }

    if (!gsiReady || !hiddenHostRef.current) {
      onErrorRef.current?.(new Error('Google sign-in is still loading. Try again in a moment.'))
      return
    }

    setLoading(true)
    const innerBtn = hiddenHostRef.current.querySelector('div[role="button"]')
    if (innerBtn) {
      innerBtn.click()
      return
    }
    const iframe = hiddenHostRef.current.querySelector('iframe')
    if (iframe) {
      iframe.click()
      return
    }
    setLoading(false)
    onErrorRef.current?.(new Error('Google button not ready. Refresh the page and try again.'))
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={`google-continue-btn ${!configured ? 'google-continue-btn-disabled' : ''}`}
        aria-label="Continue with Google"
      >
        <span className="google-continue-icon">
          <GoogleGIcon />
        </span>
        <span>{loading ? 'Opening Google…' : 'Continue with Google'}</span>
      </button>

      {/* Hidden host for Google's iframe button (clicked programmatically) */}
      <div
        ref={hiddenHostRef}
        className="google-gsi-host"
        aria-hidden
      />

      {!configured && (
        <p className="mt-2 text-center text-xs text-amber-600 dark:text-amber-400">
          Admin: set <strong>GOOGLE_OAUTH_CLIENT_ID</strong> in Render Environment and redeploy to
          enable this (same as Stripe keys).
        </p>
      )}
    </div>
  )
}
