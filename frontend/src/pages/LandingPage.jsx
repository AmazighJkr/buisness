import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, MessageCircle } from 'lucide-react'
import LandingNav from '../components/LandingNav.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
import { CONTACT } from '../config/contact.js'
import { submitCommand } from '../api/client.js'

export default function LandingPage() {
  const { t } = useTranslation()
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')
  const [tracking, setTracking] = useState(null)

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

  const handleContact = async (e) => {
    e.preventDefault()
    setStatus('')
    setTracking(null)
    try {
      const result = await submitCommand({
        client_name: form.name,
        client_email: form.email,
        idea_description: form.message,
        objectives: 'Contact form — website inquiry',
      })
      setTracking(result)
      setStatus(t('landing.formSuccess'))
      setForm({ name: '', email: '', message: '' })
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <div className="page-shell">
      <LandingNav />

      <section
        id="home"
        className="hero-section relative flex min-h-screen items-center justify-center pt-16"
      >
        <div
          className="hero-bg absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        <div className="hero-overlay absolute inset-0" aria-hidden />
        <div className="hero-copy relative z-10 mx-auto max-w-4xl px-4 py-20 text-center sm:py-24">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            EmbeddedGrid
          </h1>
          <p className="mt-4 text-base text-dark-muted sm:text-lg md:text-xl">{t('landing.tagline')}</p>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-dark-muted">{t('landing.subtitle')}</p>
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
              <button type="submit" className="btn-primary w-full sm:w-auto">
                {t('landing.formSend')}
              </button>
              {status && <p className="text-xs text-dark-muted">{status}</p>}
              {tracking?.tracking_code && (
                <div className="mt-3 border border-dark-border bg-dark-bg p-3 text-xs">
                  <p className="text-dark-muted">{t('landing.trackingLabel')}</p>
                  <p className="mt-1 font-mono text-base text-dark-text">{tracking.tracking_code}</p>
                  <Link
                    to={`/track?code=${encodeURIComponent(tracking.tracking_code)}`}
                    className="mt-2 inline-block text-dark-text underline"
                  >
                    {t('landing.trackProgress')}
                  </Link>
                </div>
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
