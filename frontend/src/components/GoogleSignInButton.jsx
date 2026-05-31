import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext.jsx'

const GSI_SCRIPT = 'https://accounts.google.com/gsi/client'

let scriptPromise = null

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }
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

export default function GoogleSignInButton({ clientId, onSuccess, onError }) {
  const containerRef = useRef(null)
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const { isDark } = useTheme()
  const [ready, setReady] = useState(false)

  onSuccessRef.current = onSuccess
  onErrorRef.current = onError

  useEffect(() => {
    if (!clientId) return undefined

    let cancelled = false
    setReady(false)

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return
        const width = Math.min(containerRef.current.offsetWidth || 360, 400)
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              onSuccessRef.current?.(response.credential)
            } else {
              onErrorRef.current?.(new Error('Google sign-in was cancelled.'))
            }
          },
        })
        containerRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: isDark ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          width,
        })
        setReady(true)
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.(new Error('Could not load Google sign-in.'))
      })

    return () => {
      cancelled = true
    }
  }, [clientId, isDark])

  if (!clientId) {
    return (
      <p className="text-center text-xs text-dark-muted">
        Google sign-in is not configured. Add <code className="text-[10px]">GOOGLE_OAUTH_CLIENT_ID</code>{' '}
        on the server.
      </p>
    )
  }

  return (
    <div className="w-full">
      <div ref={containerRef} className="flex min-h-[44px] w-full justify-center" />
      {!ready && (
        <p className="mt-2 text-center text-xs text-dark-muted animate-pulse">Loading Google…</p>
      )}
    </div>
  )
}
