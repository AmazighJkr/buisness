import { useMemo, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import hljs from 'highlight.js/lib/core'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import yaml from 'highlight.js/lib/languages/yaml'
import bash from 'highlight.js/lib/languages/bash'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import { detectLanguage, displayFileName, langLabel } from '../utils/codeLanguage.js'

hljs.registerLanguage('c', c)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('python', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('css', css)

function highlightCode(code, language) {
  if (!code) return []
  try {
    if (language !== 'plaintext' && hljs.getLanguage(language)) {
      return hljs.highlight(code, { language }).value.split('\n')
    }
    return hljs.highlightAuto(code).value.split('\n')
  } catch {
    return code.split('\n').map((line) =>
      line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    )
  }
}

export default function CodePanel({ files }) {
  const list = (files || []).filter((f) => f?.code?.trim())
  const [active, setActive] = useState(0)
  const [copied, setCopied] = useState(false)

  const idx = Math.min(active, Math.max(list.length - 1, 0))
  const current = list[idx]
  const language = detectLanguage(current?.title)
  const lang = langLabel(language)

  const lines = useMemo(
    () => highlightCode(current?.code || '', language),
    [current?.code, language],
  )

  if (!list.length) return null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(current.code || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="lab-code">
      <div className="lab-code-toolbar">
        <div className="lab-code-tabs">
          {list.map((file, i) => {
            const fileLang = langLabel(detectLanguage(file.title))
            return (
              <button
                key={`${file.title}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`lab-code-tab ${i === idx ? 'lab-code-tab-active' : ''}`}
              >
                <span>{displayFileName(file.title, i)}</span>
                <span className="lab-lang-badge">{fileLang}</span>
              </button>
            )
          })}
        </div>
        <button type="button" onClick={handleCopy} className="lab-copy-btn">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <div className="lab-code-scroll">
        <table className="lab-code-table">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i}>
                <td className="lab-ln">{i + 1}</td>
                <td className="lab-code-line">
                  <code className="hljs" dangerouslySetInnerHTML={{ __html: line || ' ' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
