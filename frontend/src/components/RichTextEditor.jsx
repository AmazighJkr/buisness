import { useCallback, useEffect, useRef, useState } from 'react'

const COLORS = [
  '#ffffff',
  '#e2e8f0',
  '#94a3b8',
  '#22d3ee',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#c084fc',
  '#fb923c',
  '#000000',
]

const HIGHLIGHTS = ['transparent', '#fef08a', '#bbf7d0', '#bae6fd', '#fecdd3', '#e9d5ff']

function ToolbarButton({ active, title, onAction, children, className = '' }) {
  return (
    <button
      type="button"
      title={title}
      tabIndex={-1}
      className={`rich-text-editor__btn ${active ? 'rich-text-editor__btn--active' : ''} ${className}`}
      onMouseDown={(e) => {
        e.preventDefault()
        onAction()
      }}
    >
      {children}
    </button>
  )
}

export default function RichTextEditor({ value = '', onChange, placeholder = 'Write here…', minHeight = '10rem' }) {
  const ref = useRef(null)
  const toolbarRef = useRef(null)
  const savedRange = useRef(null)
  const isFocused = useRef(false)
  const [active, setActive] = useState({})
  const [showColors, setShowColors] = useState(false)
  const [showHighlights, setShowHighlights] = useState(false)

  const saveSelection = useCallback(() => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !ref.current) return
    const range = sel.getRangeAt(0)
    if (ref.current.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange()
    }
  }, [])

  const restoreSelection = useCallback(() => {
    if (!savedRange.current) return
    const sel = window.getSelection()
    sel.removeAllRanges()
    sel.addRange(savedRange.current)
  }, [])

  const emit = useCallback(() => {
    onChange?.(ref.current?.innerHTML || '')
  }, [onChange])

  const refreshActive = useCallback(() => {
    setActive({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      strikeThrough: document.queryCommandState('strikeThrough'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
    })
  }, [])

  const run = useCallback(
    (cmd, arg = null) => {
      ref.current?.focus()
      restoreSelection()
      document.execCommand(cmd, false, arg)
      emit()
      refreshActive()
    },
    [emit, refreshActive, restoreSelection],
  )

  const runBlock = useCallback(
    (tag) => {
      ref.current?.focus()
      restoreSelection()
      document.execCommand('formatBlock', false, tag)
      emit()
      refreshActive()
    },
    [emit, refreshActive, restoreSelection],
  )

  const insertLink = useCallback(() => {
    saveSelection()
    const url = window.prompt('Link URL (https://…)')
    if (!url?.trim()) return
    ref.current?.focus()
    restoreSelection()
    document.execCommand('createLink', false, url.trim())
    emit()
  }, [emit, restoreSelection, saveSelection])

  useEffect(() => {
    if (!ref.current || isFocused.current) return
    const next = value || ''
    if (ref.current.innerHTML !== next) {
      ref.current.innerHTML = next
    }
  }, [value])

  return (
    <div className="rich-text-editor panel border border-dark-border">
      <div
        ref={toolbarRef}
        className="rich-text-editor__toolbar flex flex-wrap items-center gap-1 border-b border-dark-border p-2"
        onMouseDown={saveSelection}
      >
        <ToolbarButton title="Bold" active={active.bold} onAction={() => run('bold')}>
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton title="Italic" active={active.italic} onAction={() => run('italic')}>
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton title="Underline" active={active.underline} onAction={() => run('underline')}>
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" active={active.strikeThrough} onAction={() => run('strikeThrough')}>
          <span className="line-through">S</span>
        </ToolbarButton>

        <span className="rich-text-editor__sep" aria-hidden />

        <ToolbarButton title="Heading 1" onAction={() => runBlock('h1')}>
          H1
        </ToolbarButton>
        <ToolbarButton title="Heading 2" onAction={() => runBlock('h2')}>
          H2
        </ToolbarButton>
        <ToolbarButton title="Heading 3" onAction={() => runBlock('h3')}>
          H3
        </ToolbarButton>
        <ToolbarButton title="Paragraph" onAction={() => runBlock('p')}>
          ¶
        </ToolbarButton>

        <span className="rich-text-editor__sep" aria-hidden />

        <ToolbarButton
          title="Bullet list"
          active={active.insertUnorderedList}
          onAction={() => run('insertUnorderedList')}
        >
          •
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          active={active.insertOrderedList}
          onAction={() => run('insertOrderedList')}
        >
          1.
        </ToolbarButton>
        <ToolbarButton title="Quote" onAction={() => runBlock('blockquote')}>
          “
        </ToolbarButton>
        <ToolbarButton title="Horizontal line" onAction={() => run('insertHorizontalRule')}>
          ―
        </ToolbarButton>

        <span className="rich-text-editor__sep" aria-hidden />

        <ToolbarButton title="Align left" onAction={() => run('justifyLeft')}>
          ⬅
        </ToolbarButton>
        <ToolbarButton title="Align center" onAction={() => run('justifyCenter')}>
          ↔
        </ToolbarButton>
        <ToolbarButton title="Align right" onAction={() => run('justifyRight')}>
          ➡
        </ToolbarButton>

        <span className="rich-text-editor__sep" aria-hidden />

        <div className="relative">
          <ToolbarButton title="Text color" onAction={() => setShowColors((v) => !v)}>
            <span className="rich-text-editor__color-swatch" style={{ color: '#22d3ee' }}>
              A
            </span>
          </ToolbarButton>
          {showColors && (
            <div className="rich-text-editor__palette" onMouseDown={(e) => e.preventDefault()}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  tabIndex={-1}
                  className="rich-text-editor__swatch"
                  style={{ background: c }}
                  title={c}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    run('foreColor', c)
                    setShowColors(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <ToolbarButton title="Highlight" onAction={() => setShowHighlights((v) => !v)}>
            <span className="rich-text-editor__highlight-swatch">HL</span>
          </ToolbarButton>
          {showHighlights && (
            <div className="rich-text-editor__palette" onMouseDown={(e) => e.preventDefault()}>
              {HIGHLIGHTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  tabIndex={-1}
                  className="rich-text-editor__swatch"
                  style={{ background: c === 'transparent' ? 'var(--dark-panel)' : c }}
                  title={c === 'transparent' ? 'Clear highlight' : c}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    run('hiliteColor', c === 'transparent' ? 'transparent' : c)
                    setShowHighlights(false)
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <ToolbarButton title="Insert link" onAction={insertLink}>
          🔗
        </ToolbarButton>
        <ToolbarButton title="Remove formatting" onAction={() => run('removeFormat')}>
          ✕
        </ToolbarButton>
      </div>

      <div
        ref={ref}
        className="rich-text-editor__body prose-store px-3 py-2 text-sm outline-none"
        style={{ minHeight }}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onFocus={() => {
          isFocused.current = true
        }}
        onBlur={() => {
          window.setTimeout(() => {
            const activeEl = document.activeElement
            if (toolbarRef.current?.contains(activeEl)) return
            isFocused.current = false
            emit()
          }, 0)
        }}
        onKeyUp={() => {
          saveSelection()
          refreshActive()
        }}
        onMouseUp={() => {
          saveSelection()
          refreshActive()
        }}
        onInput={() => {
          saveSelection()
          emit()
          refreshActive()
        }}
        suppressContentEditableWarning
      />
    </div>
  )
}
