const URL_SPLIT = /(https?:\/\/[^\s]+)/g
const URL_TEST = /^https?:\/\//

function linkify(text) {
  const parts = text.split(URL_SPLIT)
  return parts.map((part, i) =>
    URL_TEST.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-dark-text underline break-all"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  )
}

export default function CommandMessageContent({ message }) {
  const hasText = Boolean(message.text?.trim())
  const hasLink = Boolean(message.link_url?.trim())
  const hasImage = Boolean(message.image_url)

  if (!hasText && !hasLink && !hasImage) return null

  return (
    <div className="space-y-2">
      {hasText && (
        <p className="whitespace-pre-wrap break-words">{linkify(message.text)}</p>
      )}
      {hasLink && (
        <a
          href={message.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-xs text-lab-accent underline break-all"
        >
          {message.link_url}
        </a>
      )}
      {hasImage && (
        <a href={message.image_url} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={message.image_url}
            alt=""
            className="max-h-48 max-w-full rounded border border-dark-border object-contain"
          />
        </a>
      )}
    </div>
  )
}
