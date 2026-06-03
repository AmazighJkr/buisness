import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader.jsx'
import CommandPaymentBill from '../components/CommandPaymentBill.jsx'
import CommandChat from '../components/CommandChat.jsx'
import CommandStatusBar from '../components/CommandStatusBar.jsx'
import SectionBox from '../components/SectionBox.jsx'
import { statusLabel } from '../constants/commandStatus.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useUserSession } from '../hooks/useUserSession.js'
import {
  fetchCommandTrackByCode,
  fetchCommandTrackByEmail,
  fetchMyCommand,
  fetchMyCommands,
  postCommandMessage,
  postMyCommandMessage,
} from '../api/client.js'

function CommandDetail({ command, onBack, onSend, onCommandUpdated, sending, useAccountApi }) {
  const { t } = useTranslation()
  const title = command.client_name
    ? t('command.commandOf', { name: command.client_name })
    : t('command.yourCommand')

  return (
    <>
      <div className="flex items-center justify-between text-xs text-dark-muted">
        <span className="font-mono">{command.tracking_code}</span>
        <button type="button" onClick={onBack} className="hover:text-dark-text">
          {useAccountApi ? t('command.allCommands') : t('command.trackAnother')}
        </button>
      </div>

      <SectionBox>
        <h1 className="text-xl font-semibold">{title}</h1>
        {command.project_title && (
          <p className="mt-1 text-xs text-dark-muted">
            {t('command.projectLabel')}: {command.project_title}
          </p>
        )}
        <p className="mt-4 whitespace-pre-wrap text-sm text-dark-muted">{command.idea_description}</p>
      </SectionBox>

      <SectionBox title={t('command.devStatus')}>
        <CommandStatusBar status={command.status} />
      </SectionBox>

      {(command.quoted_price > 0 || command.status === 'Accepted') && (
        <SectionBox title={t('command.payment')}>
          <CommandPaymentBill
            command={command}
            useAccountApi={useAccountApi}
            onUpdated={onCommandUpdated}
          />
        </SectionBox>
      )}

      <SectionBox title={t('command.privateChat')}>
        <p className="mb-3 text-xs text-dark-muted">{t('command.chatLead')}</p>
        <CommandChat
          messages={command.messages || []}
          onSend={onSend}
          sending={sending}
          placeholder={t('command.chatPlaceholder')}
        />
      </SectionBox>
    </>
  )
}

export default function CommandTrackPage() {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, loading: sessionLoading, isLoggedIn } = useUserSession()

  const [mode, setMode] = useState('code')
  const [trackingCode, setTrackingCode] = useState(() => searchParams.get('code') || '')
  const [email, setEmail] = useState('')
  const [command, setCommand] = useState(null)
  const [myCommands, setMyCommands] = useState(null)
  const [emailResults, setEmailResults] = useState(null)
  const [activeCode, setActiveCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const loadMyList = useCallback(async () => {
    setLoading(true)
    setError('')
    setCommand(null)
    try {
      const data = await fetchMyCommands()
      setMyCommands(data.commands || [])
    } catch (err) {
      setMyCommands([])
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMyCommand = useCallback(
    async (commandId) => {
      setLoading(true)
      setError('')
      setEmailResults(null)
      try {
        const data = await fetchMyCommand(commandId)
        setCommand(data)
        setActiveCode(data.tracking_code)
        setMyCommands(null)
        navigate(`/track?command=${encodeURIComponent(commandId)}`, { replace: true })
      } catch (err) {
        setCommand(null)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    },
    [navigate],
  )

  const loadByCode = async (code) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setError(t('command.enterCode'))
      return
    }
    setLoading(true)
    setError('')
    setEmailResults(null)
    setMyCommands(null)
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
      setError(t('command.enterEmail'))
      return
    }
    setLoading(true)
    setError('')
    setCommand(null)
    setMyCommands(null)
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
    if (sessionLoading) return
    const commandId = searchParams.get('command')
    const code = searchParams.get('code')

    if (isLoggedIn) {
      if (commandId) {
        loadMyCommand(commandId)
      } else if (code) {
        setMode('code')
        setTrackingCode(code)
        loadByCode(code)
      } else {
        loadMyList()
      }
      return
    }

    if (code) {
      setMode('code')
      setTrackingCode(code)
      loadByCode(code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoading, isLoggedIn])

  const handleCodeSubmit = (e) => {
    e.preventDefault()
    loadByCode(trackingCode)
  }

  const handleSend = async (payload) => {
    if (!command) return
    setSending(true)
    try {
      const msg = isLoggedIn
        ? await postMyCommandMessage(command.id, payload)
        : await postCommandMessage(activeCode, payload)
      setCommand((c) => ({ ...c, messages: [...(c.messages || []), msg] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  const backToList = () => {
    setCommand(null)
    setEmailResults(null)
    setError('')
    if (isLoggedIn) {
      navigate('/track', { replace: true })
      loadMyList()
    } else {
      navigate('/track', { replace: true })
    }
  }

  const openMyCommand = (cmd) => {
    loadMyCommand(cmd.id)
  }

  return (
    <div className="page-shell">
      <PageHeader highlight="/track" />

      <main className="mx-auto max-w-3xl space-y-4 px-3 py-6 sm:px-4 sm:py-8">
        {!command && isLoggedIn && myCommands && (
          <SectionBox title={t('command.yourCommands')}>
            <p className="mb-4 text-sm text-dark-muted">{t('command.yourCommandsLead')}</p>
            {myCommands.length === 0 ? (
              <p className="text-sm text-dark-muted">
                {t('command.noCommandsYet')}{' '}
                <Link to="/command" className="underline">
                  {t('command.submitCommandLink')}
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {myCommands.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => openMyCommand(c)}
                      className="w-full border border-dark-border px-3 py-2 text-left text-xs panel-hover"
                    >
                      <span className="font-mono text-dark-text">{c.tracking_code}</span>
                      <span className="ml-2 text-dark-muted">{statusLabel(c.status, t)}</span>
                      <p className="mt-1 text-dark-muted">{c.idea_preview}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 border-t border-dark-border pt-4 text-xs text-dark-muted">
              {t('command.guestLookup')}{' '}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  setMyCommands(null)
                  setMode('code')
                }}
              >
                {t('command.lookupByCode')}
              </button>
            </p>
          </SectionBox>
        )}

        {!command && isLoggedIn && myCommands === null && mode === 'code' && (
          <SectionBox title={t('command.lookupByCodeTitle')}>
            <form onSubmit={handleCodeSubmit} className="space-y-3">
              <p className="text-sm text-dark-muted">{t('command.lookupByCodeLead')}</p>
              <input
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                placeholder={t('command.trackingCode')}
                className="w-full border border-dark-border bg-dark-bg px-3 py-2 font-mono text-sm uppercase"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-dark-border px-4 py-2 text-sm panel-hover disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('command.open')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('')
                    loadMyList()
                  }}
                  className="border border-dark-border px-4 py-2 text-sm text-dark-muted panel-hover"
                >
                  {t('command.backToMyCommands')}
                </button>
              </div>
            </form>
          </SectionBox>
        )}

        {!command && !isLoggedIn && (
          <SectionBox title={t('command.trackTitle')}>
            <p className="mb-4 text-sm text-dark-muted">
              <Link to="/account" className="underline">
                {t('common.signIn')}
              </Link>{' '}
              {t('command.signInToSee')}
            </p>
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('code')
                  setError('')
                  setEmailResults(null)
                }}
                className={`border px-3 py-1 text-xs ${mode === 'code' ? 'border-dark-text text-dark-text' : 'border-dark-border text-dark-muted'}`}
              >
                {t('command.byCode')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('email')
                  setError('')
                  setEmailResults(null)
                }}
                className={`border px-3 py-1 text-xs ${mode === 'email' ? 'border-dark-text text-dark-text' : 'border-dark-border text-dark-muted'}`}
              >
                {t('command.byEmail')}
              </button>
            </div>

            {mode === 'code' ? (
              <form onSubmit={handleCodeSubmit} className="space-y-3">
                <p className="text-sm text-dark-muted">{t('command.codeHelp')}</p>
                <input
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                  placeholder={t('command.trackingCode')}
                  className="w-full border border-dark-border bg-dark-bg px-3 py-2 font-mono text-sm uppercase"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-dark-border px-4 py-2 text-sm panel-hover disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('command.openTrackerBtn')}
                </button>
              </form>
            ) : (
              <form onSubmit={loadByEmail} className="space-y-3">
                <p className="text-sm text-dark-muted">{t('command.emailHelp')}</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('landing.formEmail')}
                  className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="border border-dark-border px-4 py-2 text-sm panel-hover disabled:opacity-50"
                >
                  {loading ? t('common.loading') : t('command.findCommands')}
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
                      <span className="ml-2 text-dark-muted">{statusLabel(c.status, t)}</span>
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
          <CommandDetail
            command={command}
            useAccountApi={isLoggedIn}
            onBack={backToList}
            onSend={handleSend}
            onCommandUpdated={setCommand}
            sending={sending}
          />
        )}
      </main>
    </div>
  )
}
