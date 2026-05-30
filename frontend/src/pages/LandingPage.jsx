import { useState } from 'react'
import { Link } from 'react-router-dom'
import LandingNav from '../components/LandingNav.jsx'
import { submitCommand } from '../api/client.js'

const PILLARS = [
  { title: 'Sector Leader', text: 'Engineering depth across electronics, firmware, and connected products.' },
  { title: 'Trusted Service', text: 'Clear communication, reliable delivery, and long-term technical partnership.' },
  { title: 'Innovation First', text: 'Modern stacks—from bare-metal MCUs to cloud dashboards and mobile apps.' },
]

const SERVICES = [
  {
    title: 'Embedded Systems Engineering',
    text: 'Custom firmware, PCB bring-up, sensor integration, and production-ready device logic.',
  },
  {
    title: 'IoT & Connected Platforms',
    text: 'MQTT/cloud pipelines, remote monitoring, OTA updates, and secure device-to-cloud architecture.',
  },
  {
    title: 'Android & Companion Apps',
    text: 'Mobile interfaces for configuration, live telemetry, and field diagnostics.',
  },
  {
    title: 'Technical Consulting',
    text: 'Architecture reviews, feasibility studies, maintenance planning, and team guidance.',
  },
]

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('')
  const [tracking, setTracking] = useState(null)

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
      setStatus('Message sent. Save your tracking link below to follow progress.')
      setForm({ name: '', email: '', message: '' })
    } catch (err) {
      setStatus(err.message)
    }
  }

  return (
    <div className="bg-dark-bg text-dark-text">
      <LandingNav />

      {/* HOME */}
      <section
        id="home"
        className="relative flex min-h-screen items-center justify-center pt-16"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/hero-bg.png')" }}
        />
        <div className="absolute inset-0 bg-dark-bg/75" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 text-center sm:py-24">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl md:text-6xl">EmbeddedGrid</h1>
          <p className="mt-4 text-base text-dark-muted sm:text-lg md:text-xl">
            IT, Electronics, Maintenance &amp; Consulting
          </p>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-dark-muted">
            Informatique, Électronique, Maintenance &amp; Consulting — delivered in English and French
            for teams who build real hardware.
          </p>
        </div>
      </section>

      {/* ENTERPRISE */}
      <section id="enterprise" className="border-t border-dark-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold">Enterprise</h2>
          <p className="mt-2 max-w-2xl text-sm text-dark-muted">
            Who we are — a lab focused on dependable embedded products and honest engineering.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="panel p-6">
                <h3 className="font-medium">{p.title}</h3>
                <p className="mt-2 text-sm text-dark-muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="border-t border-dark-border bg-dark-panel/40 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold">Services</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <div key={s.title} className="panel p-6">
                <h3 className="font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-dark-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="border-t border-dark-border py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6">
          <div>
            <h2 className="text-2xl font-semibold">Contact</h2>
            <p className="mt-2 text-sm text-dark-muted">
              Quick message below, or{' '}
              <Link to="/command" className="text-dark-text underline">
                submit a full project command
              </Link>{' '}
              with specs, budget, and file attachments.
            </p>
            <form onSubmit={handleContact} className="mt-6 space-y-4" autoComplete="off">
              <input
                required
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
              />
              <textarea
                required
                rows={5}
                placeholder="Message"
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="border border-dark-border bg-dark-panel px-6 py-2 text-sm panel-hover"
              >
                Send
              </button>
              {status && <p className="text-xs text-dark-muted">{status}</p>}
              {tracking?.tracking_code && (
                <div className="mt-3 border border-dark-border bg-dark-bg p-3 text-xs">
                  <p className="text-dark-muted">Your tracking code:</p>
                  <p className="mt-1 font-mono text-base text-dark-text">{tracking.tracking_code}</p>
                  <Link
                    to={`/track?code=${encodeURIComponent(tracking.tracking_code)}`}
                    className="mt-2 inline-block text-dark-text underline"
                  >
                    Open command tracker
                  </Link>
                </div>
              )}
            </form>
          </div>

          <div className="panel p-6">
            <h3 className="font-medium">Reach us</h3>
            <ul className="mt-4 space-y-3 text-sm text-dark-muted">
              <li>
                <span className="text-dark-text">Email</span>
                <br />
                lab@embeddedgrid.dev
              </li>
              <li>
                <span className="text-dark-text">Discord</span>
                <br />
                discord.gg/embeddedgrid
              </li>
              <li>
                <span className="text-dark-text">WhatsApp</span>
                <br />
                +00 000 000 0000
              </li>
            </ul>
          </div>
        </div>
      </section>

      <footer className="border-t border-dark-border py-8 text-center text-xs text-dark-muted">
        © EmbeddedGrid
      </footer>
    </div>
  )
}
