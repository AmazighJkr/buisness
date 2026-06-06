import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle } from 'lucide-react'
import LandingNav from '../components/LandingNav.jsx'
import HeroFerrofluid from '../components/backgrounds/HeroFerrofluid.jsx'
import CheckoutLegalConsent from '../components/checkout/CheckoutLegalConsent.jsx'
import CheckoutRecaptcha from '../components/checkout/CheckoutRecaptcha.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
import { CONTACT } from '../config/contact.js'
import { fetchPaymentConfig, submitContactMessage } from '../api/client.js'

export default function LandingPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState('')
  const [recaptchaToken, setRecaptchaToken] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const pillars = [
    { title: t('landing.pillarSector'), text: t('landing.pillarSectorText') },
    { title: t('landing.pillarTrusted'), text: t('landing.pillarTrustedText') },
    { title: t('landing.pillarInnovation'), text: t('landing.pillarInnovationText') },
  ]

  const services = [
    { title: t('landing.svcEmbedded'), text: t('landing.svcEmbeddedText') },
    { title: t('landing.svcIot'), text: t('landing.svcIotText') },
    { title: t('landing.svcAndroid'), text: t('landing.svcAndroidText') },
    { title: t('landing.svcConsulting'), text: t('landing.svcConsultingText') },
  ]

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
    <div className="page-shell">
      <LandingNav />

      <section
        id="home"
        className="hero-section relative flex min-h-screen items-center justify-center overflow-hidden pt-16"
      >
        <div className="hero-bg-base absolute inset-0" aria-hidden />
        <HeroFerrofluid />
        <div className="hero-copy relative z-10 mx-auto w-[92%] px-4 py-20 text-center sm:py-24 lg:w-1/2">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl">
            EmbeddedGrid
          </h1>
          <p className="mt-4 text-base text-dark-muted sm:text-lg md:text-xl lg:text-2xl xl:text-3xl">
            {t('landing.tagline')}
          </p>
          <p className="mx-auto mt-6 text-sm text-dark-muted sm:text-base md:text-lg lg:text-xl">
            {t('landing.subtitle')}
          </p>
        </div>
      </section>

      <section id="enterprise" className="border-t border-dark-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold">{t('landing.enterpriseTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-dark-muted">{t('landing.enterpriseLead')}</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {pillars.map((p) => (
              <div key={p.title} className="feature-card">
                <h3>{p.title}</h3>
                <p className="mt-2 text-sm text-dark-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="services" className="landing-section-alt py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold">{t('landing.servicesTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-dark-muted">{t('landing.servicesLead')}</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.title} className="feature-card">
                <h3>{s.title}</h3>
                <p className="mt-2 text-sm text-dark-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-dark-border py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">{t('landing.contactTitle')}</h2>
            <p className="mt-2 text-sm text-dark-muted">
              {t('landing.contactLead')}{' '}
              <Link to="/command" className="text-dark-text underline">
                {t('nav.submitCommand')}
              </Link>
            </p>
            <form onSubmit={handleContact} className="mt-6 space-y-4" autoComplete="off">
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
              {status && <p className="text-xs text-dark-muted">{status}</p>}
              {sent && (
                <p className="mt-2 text-xs text-dark-muted">{t('landing.formSuccessDetail')}</p>
              )}
            </form>
          </div>

          <div className="feature-card">
            <h3 className="font-display text-lg font-semibold">EmbeddedGrid</h3>
            <p className="mt-2 text-sm text-dark-muted">{CONTACT.email}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={CONTACT.emailHref}
                className="inline-flex items-center gap-2 border border-dark-border px-3 py-2 text-xs panel-hover"
              >
                <Mail className="h-4 w-4 shrink-0" aria-hidden />
                {t('landing.contactEmail')}
              </a>
              <a
                href={CONTACT.discordHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-dark-border px-3 py-2 text-xs panel-hover"
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                {t('landing.contactDiscord')}
              </a>
              <a
                href={CONTACT.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-dark-border px-3 py-2 text-xs panel-hover"
              >
                <span className="text-base leading-none" aria-hidden>
                  💬
                </span>
                {t('landing.contactWhatsapp')}
              </a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-dark-border py-8 text-center text-xs text-dark-muted">
        © EmbeddedGrid
      </footer>
    </div>
  )
}
