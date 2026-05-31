import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import CommandPaymentBill from '../components/CommandPaymentBill.jsx'
import CommandChat from '../components/CommandChat.jsx'
import CommandStatusBar from '../components/CommandStatusBar.jsx'
import SectionBox from '../components/SectionBox.jsx'
import { statusLabel } from '../constants/commandStatus.js'
import {
  fetchCommandTrackByCode,
  fetchCommandTrackByEmail,
  postCommandMessage,
} from '../api/client.js'

export default function CommandTrackPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [mode, setMode] = useState('code')
  const [trackingCode, setTrackingCode] = useState(() => searchParams.get('code') || '')
  const [email, setEmail] = useState('')
  const [command, setCommand] = useState(null)
  const [emailResults, setEmailResults] = useState(null)
  const [activeCode, setActiveCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const loadByCode = async (code) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setError('Enter your tracking code.')
      return
    }
    setLoading(true)
    setError('')
    setEmailResults(null)
    try {
      const data = await fetchCommandTrackByCode(normalized)
      setCommand(data)
      setActiveCode(data.tracking_code)
      navigate(`/track?code=${encodeURIComponent(data.tracking_code)}`, { replace: true })
    } catch (err) {
      setCommand(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadByEmail = async (e) => {
    e.preventDefault()
    const normalized = email.trim().toLowerCase()
    if (!normalized) {
      setError('Enter your email.')
      return
    }
    setLoading(true)
    setError('')
    setCommand(null)
    try {
      const data = await fetchCommandTrackByEmail(normalized)
      if (data.commands?.length === 1) {
        await loadByCode(data.commands[0].tracking_code)
        return
      }
      setEmailResults(data.commands || [])
    } catch (err) {
      setEmailResults(null)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      setMode('code')
      setTrackingCode(code)
      loadByCode(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    loadByCode(trackingCode)
  }

  const handleSend = async (payload) => {
    if (!command || !activeCode) return
    setSending(true)
    try {
      const msg = await postCommandMessage(activeCode, payload)
      setCommand((c) => ({ ...c, messages: [...(c.messages || []), msg] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/track" />

      <main className="mx-auto max-w-3xl space-y-4 px-3 py-6 sm:px-4 sm:py-8">
        {!command && (
          <SectionBox title="Track your command">
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => { setMode('code'); setError(''); setEmailResults(null) }}
                className={`border px-3 py-1 text-xs ${mode === 'code' ? 'border-dark-text text-dark-text' : 'border-dark-border text-dark-muted'}`}
              >
                By tracking code
              </button>
              <button
                type="button"
                onClick={() => { setMode('email'); setError(''); setEmailResults(null) }}
                className={`border px-3 py-1 text-xs ${mode === 'email' ? 'border-dark-text text-dark-text' : 'border-dark-border text-dark-muted'}`}
              >
                By email
              </button>
            </div>

            {mode === 'code' ? (
              <form onSubmit={handleCodeSubmit} className="space-y-3">
                <p className="text-sm text-dark-muted">
                  Enter the tracking code you received after submitting your command (e.g. EG-A1B2C3).
                </p>
                <input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  placeholder="Tracking code"
                  className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-dark-border px-4 py-2 text-sm panel-hover disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Open tracker'}
                </button>
              </form>
            ) : (
              <form onSubmit={loadByEmail} className="space-y-3">
                <p className="text-sm text-dark-muted">
                  Enter the email you used when submitting your command.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-dark-border px-4 py-2 text-sm panel-hover disabled:opacity-50"
                >
                  {loading ? 'Loading…' : 'Find my commands'}
                </button>
              </form>
            )}

            {emailResults && emailResults.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-dark-border pt-4">
                {emailResults.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => loadByCode(c.tracking_code)}
                      className="w-full border border-dark-border px-3 py-2 text-left text-xs panel-hover"
                    >
                      <span className="font-mono text-dark-text">{c.tracking_code}</span>
                      <span className="ml-2 text-dark-muted">{statusLabel(c.status)}</span>
                      <p className="mt-1 text-dark-muted">{c.idea_preview}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionBox>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        {command && (
          <>
            <div className="flex items-center justify-between text-xs text-dark-muted">
              <span className="font-mono">{command.tracking_code}</span>
              <button
                type="button"
                onClick={() => {
                  setCommand(null)
                  setEmailResults(null)
                  setError('')
                  navigate('/track', { replace: true })
                }}
                className="hover:text-dark-text"
              >
                Track another
              </button>
            </div>

            <SectionBox>
              <h1 className="text-xl font-semibold">
                {command.client_name ? `${command.client_name}'s command` : 'Your command'}
              </h1>
              {command.project_title && (
                <p className="mt-1 text-xs text-dark-muted">Project: {command.project_title}</p>
              )}
              <p className="mt-4 text-sm text-dark-muted whitespace-pre-wrap">{command.idea_description}</p>
            </SectionBox>

            <SectionBox title="Development status">
              <CommandStatusBar status={command.status} />
            </SectionBox>

            {(command.quoted_price > 0 || command.status === 'Accepted') && (
              <SectionBox title="Payment">
                <CommandPaymentBill
                  command={command}
                  onUpdated={(updated) => setCommand(updated)}
                />
              </SectionBox>
            )}

            <SectionBox title="Private chat">
              <p className="mb-3 text-xs text-dark-muted">
                Only you and our team can see this conversation.
              </p>
              <CommandChat
                messages={command.messages || []}
                onSend={handleSend}
                sending={sending}
                placeholder="Message the team…"
              />
            </SectionBox>
          </>
        )}
      </main>
    </div>
  )
}
