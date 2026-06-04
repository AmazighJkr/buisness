import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../context/LocaleContext.jsx'

const RECAPTCHA_SCRIPT_ID = 'google-recaptcha-v2'

function loadRecaptchaScript() {
  if (document.getElementById(RECAPTCHA_SCRIPT_ID)) {
    return Promise.resolve()
  }
  return new Promise((resolve, reject) => {
    const existing = window.grecaptcha
    if (existing?.render) {
      resolve()
      return
    }
    window.__egRecaptchaReady = () => resolve()
    const script = document.createElement('script')
    script.id = RECAPTCHA_SCRIPT_ID
    script.src = 'https://www.google.com/recaptcha/api.js?onload=__egRecaptchaReady&render=explicit'
    script.async = true
    script.defer = true
    script.onerror = () => reject(new Error('reCAPTCHA failed to load'))
    document.head.appendChild(script)
  })
}

export default function CheckoutRecaptcha({ siteKey, onChange, error }) {
  const { t } = useTranslation()
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const onChangeRef = useRef(onChange)
  const [loadError, setLoadError] = useState('')

  onChangeRef.current = onChange

  useEffect(() => {
    onChangeRef.current('')
    if (!siteKey) {
      setLoadError(t('checkout.recaptchaNotConfigured'))
      return
    }
    setLoadError('')
    let cancelled = false

    const mount = async () => {
      try {
        await loadRecaptchaScript()
        if (cancelled || !containerRef.current) return
        if (widgetIdRef.current != null) {
          try {
            window.grecaptcha.reset(widgetIdRef.current)
          } catch {
            /* ignore */
          }
        }
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onChangeRef.current(token),
          'expired-callback': () => onChangeRef.current(''),
          'error-callback': () => onChangeRef.current(''),
        })
      } catch {
        if (!cancelled) setLoadError(t('checkout.recaptchaLoadFailed'))
      }
    }

    mount()
    return () => {
      cancelled = true
    }
  }, [siteKey, t])

  return (
    <fieldset className="rounded border border-dark-border p-3">
      <legend className="px-1 text-xs font-semibold text-dark-text">{t('checkout.captchaTitle')}</legend>
      {siteKey ? (
        <div ref={containerRef} className="mt-2" />
      ) : (
        <p className="mt-2 text-xs text-amber-300">{loadError || t('checkout.recaptchaNotConfigured')}</p>
      )}
      {(error || loadError) && (
        <p className="mt-2 text-xs text-red-300">{error || loadError}</p>
      )}
    </fieldset>
  )
}
