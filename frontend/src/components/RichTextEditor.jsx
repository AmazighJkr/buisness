import { useCallback, useEffect, useRef } from 'react'

const TOOLS = [
  { cmd: 'bold', label: 'B', title: 'Bold' },
  { cmd: 'italic', label: 'I', title: 'Italic' },
  { cmd: 'underline', label: 'U', title: 'Underline' },
  { cmd: 'insertUnorderedList', label: '•', title: 'Bullet list' },
  { cmd: 'insertOrderedList', label: '1.', title: 'Numbered list' },
  { cmd: 'formatBlock', arg: 'h2', label: 'H2', title: 'Heading' },
  { cmd: 'formatBlock', arg: 'h3', label: 'H3', title: 'Subheading' },
]

export default function RichTextEditor({ value = '', onChange, placeholder = 'Write here…', minHeight = '10rem' }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    if (ref.current.innerHTML !== (value || '')) {
      ref.current.innerHTML = value || ''
    }
  }, [value])

  const emit = useCallback(() => {
    onChange?.(ref.current?.innerHTML || '')
  }, [onChange])

  const run = (cmd, arg) => {
    ref.current?.focus()
    document.execCommand(cmd, false, arg || null)
    emit()
  }

  return (
    <div className="rich-text-editor panel border border-dark-border">
      <div className="rich-text-editor__toolbar flex flex-wrap gap-1 border-b border-dark-border p-2">
        {TOOLS.map((t) => (
          <button
            key={`${t.cmd}-${t.arg || ''}`}
            type="button"
            title={t.title}
            className="rich-text-editor__btn"
            onMouseDown={(e) => {
              e.preventDefault()
              run(t.cmd, t.arg)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        className="rich-text-editor__body prose-store px-3 py-2 text-sm outline-none"
        style={{ minHeight }}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        suppressContentEditableWarning
      />
    </div>
  )
}
