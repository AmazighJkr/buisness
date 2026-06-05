import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import CommandLayerPicker from '../components/CommandLayerPicker.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useUserSession } from '../hooks/useUserSession.js'
import CheckoutLegalConsent from '../components/checkout/CheckoutLegalConsent.jsx'
import CheckoutRecaptcha from '../components/checkout/CheckoutRecaptcha.jsx'
import { fetchPaymentConfig, fetchProjects, submitCommand } from '../api/client.js'

export default function CommandPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const preselectedProject = searchParams.get('project') || ''
  const { user, isLoggedIn } = useUserSession()

  const [projects, setProjects] = useState([])
  const [layerIds, setLayerIds] = useState([])
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    associated_project: preselectedProject,
    idea_description: '',
    objectives: '',
    problems: '',
  })
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [tracking, setTracking] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    fetchProjects().then(setProjects).catch(() => [])
  }, [])

  useEffect(() => {
    if (preselectedProject) {
      setForm((f) => ({ ...f, associated_project: preselectedProject }))
    }
  }, [preselectedProject])

  useEffect(() => {
    const envKey = (import.meta.env.VITE_RECAPTCHA_SITE_KEY || '').trim()
    if (envKey) {
      setRecaptchaSiteKey(envKey)
      return
    }
    fetchPaymentConfig()
      .then((cfg) => setRecaptchaSiteKey(cfg.recaptcha_site_key || ''))
      .catch(() => setRecaptchaSiteKey(''))
  }, [])

  useEffect(() => {
    if (user?.email) {
      setForm((f) => ({
        ...f,
        client_email: f.client_email || user.email,
        client_name: f.client_name || user.first_name || user.username || '',
      }))
    }
  }, [user])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errors = {}
    if (!layerIds.length) errors.layers = t('commandLayers.pickOne')
    if (!acceptedTerms) errors.terms = t('checkout.errTerms')
    if (!recaptchaToken) errors.captcha = t('checkout.errCaptcha')
    setFieldErrors(errors)
    const firstErr = errors.layers || errors.terms || errors.captcha
    if (firstErr) {
      setStatus({ type: 'error', message: firstErr })
      return
    }
    setSubmitting(true)
    setStatus({ type: '', message: '' })
    setTracking(null)
    try {
      const result = await submitCommand({
        ...form,
        layer_ids: layerIds,
        attachment: file,
        accepted_terms: true,
        recaptcha_response: recaptchaToken,
      })
      setTracking(result)
      setStatus({
        type: 'success',
        message: isLoggedIn ? t('command.successLoggedIn') : t('command.successGuest'),
      })
      setForm({
        client_name: isLoggedIn ? user?.first_name || user?.username || '' : '',
        client_email: isLoggedIn ? user?.email || '' : '',
        associated_project: preselectedProject,
        idea_description: '',
        objectives: '',
        problems: '',
      })
      setLayerIds([])
      setFile(null)
      setAcceptedTerms(false)
      setRecaptchaToken('')
    } catch (err) {
      const msg = err.message || t('command.submitFailed')
      setStatus({ type: 'error', message: msg })
      if (/captcha|recaptcha|vérification/i.test(msg)) {
        setFieldErrors((prev) => ({ ...prev, captcha: msg }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/command" />

      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
        <h1 className="text-2xl font-semibold">{t('command.title')}</h1>
        <p className="mt-2 text-sm text-dark-muted">
          {isLoggedIn ? t('command.introLoggedIn') : t('command.introGuest')}
        </p>
        {isLoggedIn && (
          <p className="mt-2 text-sm">
            <Link to="/track" className="text-lab-cyan underline">
              {t('command.viewCommands')}
            </Link>
          </p>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="panel mt-6 space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-dark-muted">
              {t('command.yourName')}
              <input
                type="text"
                value={form.client_name}
                onChange={update('client_name')}
                className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
                placeholder={t('command.optional')}
              />
            </label>
            <label className="block text-xs text-dark-muted">
              {t('command.email')} {!isLoggedIn && '*'}
              <input
                type="email"
                required={!isLoggedIn}
                value={form.client_email}
                onChange={update('client_email')}
                disabled={isLoggedIn && Boolean(user?.email)}
                className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text disabled:opacity-70"
                placeholder={isLoggedIn ? t('command.emailFromAccount') : t('command.emailGuestHint')}
              />
            </label>
          </div>

          <label className="block text-xs text-dark-muted">
            {t('command.relatedProject')}
            <select
              value={form.associated_project}
              onChange={update('associated_project')}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            >
              <option value="">{t('command.newCustomBuild')}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-dark-muted">
            {t('command.projectIdea')} *
            <textarea
              required
              rows={4}
              value={form.idea_description}
              onChange={update('idea_description')}
              placeholder={t('command.projectIdeaPlaceholder')}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            />
          </label>

          <CommandLayerPicker selectedIds={layerIds} onChange={setLayerIds} />

          <label className="block text-xs text-dark-muted">
            {t('command.objectives')}
            <textarea
              rows={3}
              value={form.objectives}
              onChange={update('objectives')}
              placeholder={t('command.objectivesPlaceholder')}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            />
          </label>

          <label className="block text-xs text-dark-muted">
            {t('command.problems')}
            <textarea
              rows={3}
              value={form.problems}
              onChange={update('problems')}
              placeholder={t('command.problemsPlaceholder')}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            />
          </label>

          <label className="flex cursor-pointer items-center gap-2 border border-dashed border-dark-border px-3 py-3 text-xs text-dark-muted panel-hover">
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.gif,.zip,.txt,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            {file ? file.name : t('command.attachFile')}
          </label>

          <CheckoutLegalConsent
            accepted={acceptedTerms}
            onChange={(v) => {
              setAcceptedTerms(v)
              setFieldErrors((fe) => ({ ...fe, terms: undefined }))
            }}
            error={fieldErrors.terms}
          />
          <CheckoutRecaptcha
            siteKey={recaptchaSiteKey}
            onChange={(v) => {
              setRecaptchaToken(v)
              setFieldErrors((fe) => ({ ...fe, captcha: undefined }))
            }}
            error={fieldErrors.captcha}
          />

          {status.message && (
            <p className={`text-xs ${status.type === 'error' ? 'text-red-400' : 'text-dark-muted'}`}>
              {status.message}
            </p>
          )}

          {tracking && (
            <div className="border border-dark-border bg-dark-bg p-3 text-xs">
              {isLoggedIn ? (
                <>
                  <p className="text-dark-muted">{t('command.savedToAccount')}</p>
                  <Link to="/track" className="mt-3 inline-block text-dark-text underline">
                    {t('command.openTrack')}
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-dark-muted">{t('command.trackingCodeLabel')}</p>
                  <p className="mt-2 font-mono text-lg tracking-wide text-dark-text">
                    {tracking.tracking_code}
                  </p>
                  <Link
                    to={`/track?code=${encodeURIComponent(tracking.tracking_code)}`}
                    className="mt-3 inline-block text-dark-text underline"
                  >
                    {t('command.openTracker')}
                  </Link>
                  <p className="mt-2 text-dark-muted">
                    {t('command.trackHintBefore')}{' '}
                    <Link to="/account" className="underline">
                      {t('command.createAccount')}
                    </Link>{' '}
                    {t('command.trackHintAfter')}
                  </p>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !acceptedTerms || !recaptchaToken}
            className="flex w-full items-center justify-center gap-2 border border-dark-border py-3 text-sm font-medium panel-hover disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? t('command.submitting') : t('command.submit')}
          </button>
        </form>
      </main>
    </div>
  )
}
