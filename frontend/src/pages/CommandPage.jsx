import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Send } from 'lucide-react'
import PageHeader from '../components/PageHeader.jsx'
import { useUserSession } from '../hooks/useUserSession.js'
import { fetchFeaturedProjects, submitCommand } from '../api/client.js'

export default function CommandPage() {
  const [searchParams] = useSearchParams()
  const preselectedProject = searchParams.get('project') || ''
  const { user, isLoggedIn } = useUserSession()

  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({
    client_name: '',
    client_email: '',
    associated_project: preselectedProject,
    idea_description: '',
    price_limit: '',
    objectives: '',
    problems: '',
  })
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [tracking, setTracking] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchFeaturedProjects().then(setProjects).catch(() => [])
  }, [])

  useEffect(() => {
    if (preselectedProject) {
      setForm((f) => ({ ...f, associated_project: preselectedProject }))
    }
  }, [preselectedProject])

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
    setSubmitting(true)
    setStatus({ type: '', message: '' })
    setTracking(null)
    try {
      const result = await submitCommand({ ...form, attachment: file })
      setTracking(result)
      setStatus({
        type: 'success',
        message: isLoggedIn
          ? 'Command submitted. View progress on the Track page.'
          : 'Command submitted. Save your tracking link below to follow progress and chat with us.',
      })
      setForm({
        client_name: isLoggedIn ? user?.first_name || user?.username || '' : '',
        client_email: isLoggedIn ? user?.email || '' : '',
        associated_project: preselectedProject,
        idea_description: '',
        price_limit: '',
        objectives: '',
        problems: '',
      })
      setFile(null)
    } catch (err) {
      setStatus({ type: 'error', message: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/command" />

      <main className="mx-auto max-w-3xl px-3 py-6 sm:px-4 sm:py-8">
        <h1 className="text-2xl font-semibold">Submit a command</h1>
        <p className="mt-2 text-sm text-dark-muted">
          {isLoggedIn
            ? 'Your command is linked to your account. Track it anytime from the Track page — no code needed.'
            : 'Describe your embedded or IoT project. No account required — or sign in to manage commands in one place.'}
        </p>
        {isLoggedIn && (
          <p className="mt-2 text-sm">
            <Link to="/track" className="text-lab-cyan underline">
              View your commands
            </Link>
          </p>
        )}

        <form onSubmit={handleSubmit} autoComplete="off" className="panel mt-6 space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-xs text-dark-muted">
              Your name
              <input
                type="text"
                value={form.client_name}
                onChange={update('client_name')}
                className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
                placeholder="Optional"
              />
            </label>
            <label className="block text-xs text-dark-muted">
              Email {!isLoggedIn && '*'}
              <input
                type="email"
                required={!isLoggedIn}
                value={form.client_email}
                onChange={update('client_email')}
                disabled={isLoggedIn && Boolean(user?.email)}
                className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text disabled:opacity-70"
                placeholder={isLoggedIn ? 'From your account' : 'Used for guest tracking'}
              />
            </label>
          </div>

          <label className="block text-xs text-dark-muted">
            Related project (optional)
            <select
              value={form.associated_project}
              onChange={update('associated_project')}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            >
              <option value="">— New custom build —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-dark-muted">
            Project idea *
            <textarea
              required
              rows={4}
              value={form.idea_description}
              onChange={update('idea_description')}
              placeholder="What do you want to build? Sensors, connectivity, enclosure..."
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            />
          </label>

          <label className="block text-xs text-dark-muted">
            Price limit (budget cap)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price_limit}
              onChange={update('price_limit')}
              placeholder="e.g. 500.00"
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            />
          </label>

          <label className="block text-xs text-dark-muted">
            Objectives & deliverables
            <textarea
              rows={3}
              value={form.objectives}
              onChange={update('objectives')}
              placeholder="Milestones, timeline, production quantity..."
              className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm outline-none focus:border-dark-text"
            />
          </label>

          <label className="block text-xs text-dark-muted">
            Problems & constraints
            <textarea
              rows={3}
              value={form.problems}
              onChange={update('problems')}
              placeholder="Technical blockers, environment, power limits..."
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
            {file ? file.name : 'Attach schematics / datasheets (optional, max 5MB)'}
          </label>

          {status.message && (
            <p className={`text-xs ${status.type === 'error' ? 'text-red-400' : 'text-dark-muted'}`}>
              {status.message}
            </p>
          )}

          {tracking && (
            <div className="border border-dark-border bg-dark-bg p-3 text-xs">
              {isLoggedIn ? (
                <>
                  <p className="text-dark-muted">Command saved to your account.</p>
                  <Link to="/track" className="mt-3 inline-block text-dark-text underline">
                    Open Track — your commands
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-dark-muted">Your tracking code — save it to follow progress:</p>
                  <p className="mt-2 font-mono text-lg tracking-wide text-dark-text">
                    {tracking.tracking_code}
                  </p>
                  <Link
                    to={`/track?code=${encodeURIComponent(tracking.tracking_code)}`}
                    className="mt-3 inline-block text-dark-text underline"
                  >
                    Open command tracker
                  </Link>
                  <p className="mt-2 text-dark-muted">
                    You can also track using the email you provided, or{' '}
                    <Link to="/account" className="underline">
                      create an account
                    </Link>{' '}
                    for easier access next time.
                  </p>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 border border-dark-border py-3 text-sm font-medium panel-hover disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting…' : 'Submit command'}
          </button>
        </form>
      </main>
    </div>
  )
}
