import { ChevronRight } from 'lucide-react'

const PLACEHOLDER =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="120" viewBox="0 0 400 120">
      <rect fill="#141414" width="400" height="120"/>
      <line x1="40" y1="60" x2="360" y2="60" stroke="#2a2a2a" stroke-width="2"/>
    </svg>`,
  )

export default function ProjectCard({ project }) {
  return (
    <article className="panel panel-hover overflow-hidden">
      <img
        src={project.schematic_url || PLACEHOLDER}
        alt=""
        className="h-32 w-full border-b border-dark-border object-cover bg-dark-bg"
      />
      <div className="flex items-start justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{project.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-dark-muted">{project.description}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-dark-muted" />
      </div>
    </article>
  )
}
