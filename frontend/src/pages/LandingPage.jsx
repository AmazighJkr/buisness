import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LandingNav from '../components/LandingNav.jsx'
import HeroFerrofluid from '../components/backgrounds/HeroFerrofluid.jsx'
import ContactMagicBento from '../components/landing/ContactMagicBento.jsx'
import LandingSectionBento, {
  pillarToBentoCard,
  serviceToBentoCard,
} from '../components/landing/LandingSectionBento.jsx'
import CheckoutLegalConsent from '../components/checkout/CheckoutLegalConsent.jsx'
import CheckoutRecaptcha from '../components/checkout/CheckoutRecaptcha.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
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
    { title: t('landing.pillarSector'), text: t('landing.pillarSectorText'), handle: 'Enterprise' },
    { title: t('landing.pillarTrusted'), text: t('landing.pillarTrustedText'), handle: 'Enterprise' },
    { title: t('landing.pillarInnovation'), text: t('landing.pillarInnovationText'), handle: 'Enterprise' },
  ]

  const services = [
    { title: t('landing.svcEmbedded'), text: t('landing.svcEmbeddedText') },
    { title: t('landing.svcIot'), text: t('landing.svcIotText') },
    { title: t('landing.svcAndroid'), text: t('landing.svcAndroidText') },
    { title: t('landing.svcConsulting'), text: t('landing.svcConsultingText') },
    {
      title: t('landing.svcProjects'),
      text: t('landing.svcProjectsText'),
      label: t('landing.svcProjectsLabel'),
      to: '/projects',
    },
    {
      title: t('landing.svcStore'),
      text: t('landing.svcStoreText'),
      label: t('landing.svcStoreLabel'),
      to: '/store',
    },
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
        <div className="hero-copy relative z-10 mx-auto w-[94%] px-4 py-20 text-center sm:py-24 lg:w-1/2">
          <h1 className="hero-title font-display font-bold tracking-tight">
            Embedded<span className="hero-title-accent">Grid</span>
          </h1>
          <p className="hero-tagline mt-4 text-dark-muted">{t('landing.tagline')}</p>
          <p className="hero-subtitle mx-auto mt-6 text-dark-muted">{t('landing.subtitle')}</p>
        </div>
      </section>

      <section id="enterprise" className="border-t border-dark-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold">{t('landing.enterpriseTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-dark-muted">{t('landing.enterpriseLead')}</p>
          <div className="mt-10">
            <LandingSectionBento
              cards={pillars.map(pillarToBentoCard)}
              layout="enterprise"
            />
          </div>
        </div>
      </section>

      <section id="services" className="landing-section-alt py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold">{t('landing.servicesTitle')}</h2>
          <p className="mt-2 max-w-2xl text-sm text-dark-muted">{t('landing.servicesLead')}</p>
          <div className="mt-10">
            <LandingSectionBento
              cards={services.map(serviceToBentoCard)}
              layout="services"
            />
          </div>
        </div>
      </section>

      <section id="contact" className="border-t border-dark-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
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
                {status && <p className="text-xs text-dark-muted">{status}</p>}
                {sent && (
                  <p className="mt-2 text-xs text-dark-muted">{t('landing.formSuccessDetail')}</p>
                )}
              </form>
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
