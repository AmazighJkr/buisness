import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { fetchCheckoutCaptcha } from '../../api/client.js'
import { useTranslation } from '../../context/LocaleContext.jsx'

export default function CheckoutCaptcha({ token, answer, onTokenChange, onAnswerChange, error }) {
  const { t } = useTranslation()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchCheckoutCaptcha()
      onTokenChange(data.token)
      setQuestion(data.question)
      onAnswerChange('')
    } catch {
      setQuestion('')
    } finally {
      setLoading(false)
    }
  }, [onTokenChange, onAnswerChange])

  useEffect(() => {
    load()
  }, [load])

  return (
    <fieldset className="rounded border border-dark-border p-3">
      <legend className="px-1 text-xs font-semibold text-dark-text">{t('checkout.captchaTitle')}</legend>
      <p className="text-xs text-dark-muted">{t('checkout.captchaHint')}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm tabular-nums">
          {loading ? '…' : `${question} =`}
        </span>
        <input
          type="number"
          inputMode="numeric"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          className="w-20 border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
          aria-label={t('checkout.captchaAnswer')}
          required
        />
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1 text-xs text-lab-cyan hover:underline"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden />
          {t('checkout.captchaRefresh')}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
      {!token && !loading && (
        <p className="mt-2 text-xs text-amber-300">{t('checkout.captchaLoadFailed')}</p>
      )}
    </fieldset>
  )
}
