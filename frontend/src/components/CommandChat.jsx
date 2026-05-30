import { useEffect, useRef, useState } from 'react'
import CommandMessageContent from './CommandMessageContent.jsx'

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

export default function CommandChat({
  messages = [],
  onSend,
  sending,
  placeholder,
  enterpriseLabel = 'EmbeddedGrid',
}) {
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!text.trim() || sending) return
    const msg = text.trim()
    setText('')
    await onSend({ text: msg })
  }

  return (
    <div className="flex flex-col border border-dark-border bg-dark-bg">
      <div className="max-h-72 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-dark-muted">No messages yet. Start the conversation below.</p>
        ) : (
          messages.map((m) => {
            const isStaff = m.role === 'staff'
            const label = isStaff ? enterpriseLabel : m.author_name
            return (
              <div
                key={m.id}
                className={`max-w-[85%] text-xs ${isStaff ? 'ml-auto text-right' : 'mr-auto text-left'}`}
              >
                <p className="mb-0.5 text-[10px] text-dark-muted">
                  {label} · {formatTime(m.created_at)}
                </p>
                <div
                  className={`inline-block border px-3 py-2 text-left ${
                    isStaff
                      ? 'border-dark-border bg-dark-panel text-dark-text'
                      : 'border-dark-border bg-dark-panel/50 text-dark-muted'
                  }`}
                >
                  <CommandMessageContent message={m} />
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-dark-border p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder || 'Write a private message…'}
          className="min-w-0 flex-1 border border-dark-border bg-dark-panel px-2 py-1.5 text-xs outline-none focus:border-dark-muted"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 border border-dark-border px-3 py-1.5 text-xs panel-hover disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
