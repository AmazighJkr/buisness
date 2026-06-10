import { ExternalLink } from 'lucide-react'

export default function SimulationEmbed({ embedUrl, openUrl }) {
  const href = openUrl || embedUrl
  if (!href) return null

  if (embedUrl) {
    return (
      <div className="mx-auto max-w-2xl overflow-hidden rounded border border-dark-border bg-dark-bg">
        <div className="aspect-video w-full">
          <iframe
            src={embedUrl}
            title="Simulation"
            className="h-full w-full"
            allow="fullscreen"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md rounded border border-dark-border bg-dark-bg px-6 py-8 text-center">
      <p className="text-sm text-dark-muted">
        Tinkercad and most external simulators cannot be shown inside this page for security
        reasons.
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 border border-dark-border px-4 py-2 text-sm text-dark-text panel-hover"
      >
        Open simulation
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  )
}
