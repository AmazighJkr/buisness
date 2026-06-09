import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ContactMagicBento from './ContactMagicBento.jsx'
import CheckoutLegalConsent from '../checkout/CheckoutLegalConsent.jsx'
import CheckoutRecaptcha from '../checkout/CheckoutRecaptcha.jsx'
import { useTranslation } from '../../context/LocaleContext.jsx'
import { fetchPaymentConfig, submitContactMessage } from '../../api/client.js'

export default function ContactSection({ className = '' }) {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

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

  const handleContact = async (e) => {
    e.preventDefault()
    setStatus('')
    setSent(false)
    const errors = {}
    if (!acceptedTerms) errors.terms = t('checkout.errTerms')
    if (recaptchaSiteKey && !recaptchaToken) errors.captcha = t('checkout.errCaptcha')
    setFieldErrors(errors)
    const firstErr = errors.terms || errors.captcha
    if (firstErr) {
      setStatus(firstErr)
      return
    }
    setSubmitting(true)
    try {
      await submitContactMessage({
        client_name: form.name,
        client_email: form.email,
        body: form.message,
        recaptcha_response: recaptchaToken,
      })
      setSent(true)
      setStatus(t('landing.formSuccess'))
      setForm({ name: '', email: '', message: '' })
      setAcceptedTerms(false)
      setRecaptchaToken('')
    } catch (err) {
      setStatus(err.message)
      if (/captcha|recaptcha|vérification/i.test(err.message)) {
        setFieldErrors((prev) => ({ ...prev, captcha: err.message }))
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="contact" className={`contact-section-block ${className}`.trim()}>
      <h2 className="font-display text-2xl font-semibold">{t('landing.contactTitle')}</h2>
      <p className="mt-2 max-w-2xl text-sm text-dark-muted">
        {t('landing.contactLead')}{' '}
        <Link to="/command" className="text-dark-text underline">
          {t('nav.submitCommand')}
        </Link>
      </p>
      <div className="contact-section mt-10">
        <div className="contact-channels">
          <h3 className="contact-section-label">{t('landing.contactChannelsTitle')}</h3>
          <ContactMagicBento />
        </div>

        <div className="contact-form-block">
          <h3 className="contact-section-label">{t('landing.contactFormTitle')}</h3>
          <form onSubmit={handleContact} className="contact-form space-y-4" autoComplete="off">
            <input
              required
              placeholder={t('landing.formName')}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="input-field"
            />
            <input
              required
              type="email"
              placeholder={t('landing.formEmail')}
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="input-field"
            />
            <textarea
              required
              rows={5}
              placeholder={t('landing.formMessage')}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="input-field resize-y min-h-[8rem]"
            />
            <CheckoutLegalConsent
              accepted={acceptedTerms}
              onChange={setAcceptedTerms}
              error={fieldErrors.terms}
            />
            {recaptchaSiteKey ? (
              <CheckoutRecaptcha
                siteKey={recaptchaSiteKey}
                onChange={setRecaptchaToken}
                error={fieldErrors.captcha}
              />
            ) : null}
            <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
              {submitting ? t('landing.formSending') : t('landing.formSend')}
            </button>
            {status && (
              <p className={`text-sm ${sent ? 'text-lab-green' : 'text-red-400'}`}>{status}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}
