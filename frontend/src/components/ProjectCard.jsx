import { useState } from 'react'
import { ChevronRight, Lock } from 'lucide-react'
import { resolveMediaUrl, SCHEMATIC_PLACEHOLDER } from '../utils/mediaUrl.js'

export default function ProjectCard({ project }) {
  const [imgFailed, setImgFailed] = useState(false)
  const src = resolveMediaUrl(project.schematic_url)
  const showPlaceholder = !src || imgFailed
  const locked = project.locked

  return (
    <article className={`panel panel-hover overflow-hidden ${locked ? 'opacity-90' : ''}`}>
      <div className="relative">
        <img
          src={showPlaceholder ? SCHEMATIC_PLACEHOLDER : src}
          alt=""
          className="h-32 w-full border-b border-dark-border object-cover bg-dark-bg"
          onError={() => setImgFailed(true)}
        />
        {locked && (
          <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-dark-bg/90 px-2 py-0.5 text-[10px] text-dark-muted">
            <Lock className="h-3 w-3" />
            Pack
          </span>
        )}
        {project.is_free && !locked && (
          <span className="absolute right-2 top-2 rounded bg-dark-bg/90 px-2 py-0.5 text-[10px] text-lab-green">
            Free
          </span>
        )}
      </div>
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
