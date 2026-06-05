import { useCallback, useEffect, useState } from 'react'
import {
  adminFetchContactMessage,
  adminFetchContactMessages,
  adminRespondContactMessage,
  staffCanRespondContactMessages,
} from '../../api/client.js'

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
]

function formatWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function AdminContactMessages({ user, onMessage }) {
  const [messages, setMessages] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('new')
  const canRespond = staffCanRespondContactMessages(user)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMessages(await adminFetchContactMessages())
    } catch (e) {
      onMessage?.('error', e.message)
    } finally {
      setLoading(false)
    }
  }, [onMessage])

  useEffect(() => {
    load()
  }, [load])

  const openMessage = async (id) => {
    try {
      const row = await adminFetchContactMessage(id)
      setSelected(row)
      setReplyDraft(row.staff_reply || '')
      setStatusDraft(row.status || 'new')
    } catch (e) {
      onMessage?.('error', e.message)
    }
  }

  const handleRespond = async (e) => {
    e.preventDefault()
    if (!selected || !canRespond) return
    setSubmitting(true)
    try {
      const updated = await adminRespondContactMessage(selected.id, {
        staff_reply: replyDraft.trim(),
        status: statusDraft,
      })
      setSelected(updated)
      setMessages((rows) => rows.map((m) => (m.id === updated.id ? updated : m)))
      onMessage?.('success', 'Reply saved — client notified by email.')
      await load()
    } catch (err) {
      onMessage?.('error', err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <p className="text-xs text-gray-500">Loading messages…</p>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
      <ul className="space-y-2">
        {messages.length === 0 && (
          <li className="text-xs text-gray-500">No contact messages yet.</li>
        )}
        {messages.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => openMessage(m.id)}
              className={`w-full border px-4 py-3 text-left text-xs ${
                selected?.id === m.id
                  ? 'border-lab-cyan bg-lab-surface'
                  : 'border-lab-border bg-lab-surface hover:border-lab-cyan/50'
              }`}
            >
              <div className="flex justify-between gap-2">
                <span className="text-dark-text">{m.client_name || m.client_email}</span>
                <span className="text-lab-copper shrink-0">{m.status}</span>
              </div>
              <p className="mt-1 text-[10px] text-gray-500">{formatWhen(m.created_at)}</p>
              <p className="mt-1 line-clamp-2 text-gray-500">{m.body}</p>
            </button>
          </li>
        ))}
      </ul>

      {selected ? (
        <div className="space-y-4 border border-lab-border bg-lab-surface p-4 text-xs">
          <div className="flex justify-between gap-2">
            <div>
              <p className="text-lab-cyan">{selected.client_name || 'Visitor'}</p>
              <p className="text-gray-500">{selected.client_email}</p>
              <p className="mt-1 text-[10px] text-gray-500">Received {formatWhen(selected.created_at)}</p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="text-gray-500">
              Close
            </button>
          </div>

          <p className="text-dark-text whitespace-pre-wrap">{selected.body}</p>

          {selected.staff_reply && (
            <div className="border border-lab-border bg-lab-bg p-3">
              <p className="text-[10px] text-gray-500">
                Previous reply
                {selected.replied_by_name ? ` by ${selected.replied_by_name}` : ''}
                {selected.replied_at ? ` · ${formatWhen(selected.replied_at)}` : ''}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-dark-text">{selected.staff_reply}</p>
            </div>
          )}

          {canRespond ? (
            <form onSubmit={handleRespond} className="space-y-2">
              <textarea
                rows={5}
                placeholder="Reply to client (sent by email)"
                value={replyDraft}
                onChange={(e) => setReplyDraft(e.target.value)}
                className="w-full border border-lab-border bg-lab-bg px-2 py-2"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="border border-lab-border bg-lab-bg px-2 py-1"
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={submitting || !replyDraft.trim()}
                  className="border border-lab-cyan px-3 py-1 text-lab-cyan disabled:opacity-50"
                >
                  Send reply
                </button>
              </div>
            </form>
          ) : (
            <p className="text-[10px] text-gray-500">You can view messages but not reply.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-500">Select a message to read and reply.</p>
      )}
    </div>
  )
}
