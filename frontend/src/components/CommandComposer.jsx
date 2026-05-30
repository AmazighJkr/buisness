import { useState } from 'react'
import { Image, Link2, Send } from 'lucide-react'
import CommandMessageContent from './CommandMessageContent.jsx'

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString()
}

export default function CommandComposer({
  messages = [],
  onSend,
  sending,
  adminView = false,
  enterpriseLabel = 'EmbeddedGrid',
}) {
  const [text, setText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [image, setImage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (sending) return
    const body = text.trim()
    const link = linkUrl.trim()
    if (!body && !link && !image) return
    await onSend({ text: body, link_url: link, image })
    setText('')
    setLinkUrl('')
    setImage(null)
  }

  return (
    <div className="flex flex-col border border-dark-border bg-dark-bg">
      <div className="max-h-80 flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-dark-muted">No messages yet.</p>
        ) : (
          messages.map((m) => {
            const isStaff = m.role === 'staff'
            const label = isStaff ? enterpriseLabel : m.author_name
            return (
              <div
                key={m.id}
                className={`max-w-[90%] text-xs ${isStaff ? 'ml-auto text-right' : 'mr-auto text-left'}`}
              >
                <p className="mb-0.5 text-[10px] text-dark-muted">
                  {label} · {formatTime(m.created_at)}
                </p>
                {adminView && isStaff && m.staff_responder && (
                  <p className="mb-1 text-[10px] text-lab-copper">
                    Replied by: {m.staff_responder}
                  </p>
                )}
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
      </div>

      <form onSubmit={handleSubmit} className="space-y-2 border-t border-dark-border p-3">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a message to the client…"
          className="w-full resize-none border border-dark-border bg-dark-panel px-2 py-1.5 text-xs outline-none focus:border-dark-muted"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1 border border-dark-border px-2 py-1 text-[10px] text-dark-muted panel-hover">
            <Link2 className="h-3 w-3" />
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              className="w-36 bg-transparent outline-none"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-1 border border-dark-border px-2 py-1 text-[10px] text-dark-muted panel-hover">
            <Image className="h-3 w-3" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
            />
            {image ? image.name : 'Image'}
          </label>
          <button
            type="submit"
            disabled={sending || (!text.trim() && !linkUrl.trim() && !image)}
            className="ml-auto flex items-center gap-1 border border-dark-border px-3 py-1.5 text-xs panel-hover disabled:opacity-50"
          >
            <Send className="h-3 w-3" />
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {adminView && (
          <p className="text-[10px] text-dark-muted">
            Client sees messages from <strong>{enterpriseLabel}</strong> only.
          </p>
        )}
      </form>
    </div>
  )
}
