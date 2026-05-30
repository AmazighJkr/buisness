import { useEffect, useState } from 'react'
import { ExternalLink, Play, Cpu } from 'lucide-react'

export default function EmbeddableMedia({ config }) {
  const [active, setActive] = useState(false)

  useEffect(() => {
    setActive(false)
  }, [config?.src])

  if (!config) return null

  const { mode, src, openUrl, label, tryFallback, clickToLoad, hint } = config
  const openLabel = label?.includes('Tinkercad')
    ? 'Open on Tinkercad ↗'
    : label?.includes('Wokwi')
      ? 'Open on Wokwi ↗'
      : 'Open in new tab ↗'

  const showIframe = mode === 'iframe' && src && (!clickToLoad || active)

  if (showIframe) {
    return (
      <div className="w-full overflow-hidden bg-dark-bg">
        <div className="relative aspect-video w-full min-h-[320px]">
          <iframe
            src={src}
            title={label || 'Embedded content'}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-presentation"
            allow="fullscreen; autoplay; clipboard-write"
          />
        </div>
        {openUrl && (
          <div className="flex items-center justify-between gap-2 border-t border-dark-border px-3 py-2">
            {hint && <p className="text-[10px] text-dark-muted">{hint}</p>}
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto shrink-0 text-xs text-dark-muted hover:text-dark-text"
            >
              {tryFallback ? openLabel : 'Open in new tab ↗'}
            </a>
          </div>
        )}
      </div>
    )
  }

  if (mode === 'iframe' && src && clickToLoad) {
    return (
      <div className="w-full overflow-hidden bg-dark-bg">
        <button
          type="button"
          onClick={() => setActive(true)}
          className="group relative flex aspect-video min-h-[320px] w-full flex-col items-center justify-center px-6 text-center transition-colors hover:bg-dark-border/20"
        >
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-dark-border bg-dark-bg group-hover:border-dark-text">
            <Play className="ml-0.5 h-6 w-6 text-dark-text" />
          </div>
          <p className="text-sm font-medium text-dark-text">Load simulation</p>
          <p className="mt-2 max-w-md text-xs text-dark-muted">
            {hint || 'Interactive preview runs inside this box after you click.'}
          </p>
        </button>
        {openUrl && (
          <div className="border-t border-dark-border px-3 py-2 text-right">
            <a
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-dark-muted hover:text-dark-text"
            >
              {openLabel}
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex aspect-video min-h-[320px] w-full flex-col items-center justify-center rounded border border-dark-border bg-dark-bg px-6 text-center">
      <Cpu className="mb-3 h-10 w-10 text-dark-muted" />
      <p className="text-sm font-medium text-dark-text">{label || 'External content'}</p>
      <p className="mt-2 max-w-sm text-xs text-dark-muted">{hint || 'Could not load the preview here.'}</p>
      {openUrl && (
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 border border-dark-border px-4 py-2 text-sm panel-hover"
        >
          {label ? `Open ${label}` : 'Open link'}
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  )
}
