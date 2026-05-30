import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export default function CodeBox({ code }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-full border border-dark-border bg-dark-bg">
      <div className="flex justify-end border-b border-dark-border px-3 py-2">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-dark-muted hover:text-dark-text"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="h-64 overflow-auto p-4 text-xs leading-relaxed">
        <code>{code || '// No code'}</code>
      </pre>
    </div>
  )
}
