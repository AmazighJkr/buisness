import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { resolveMediaUrl, SCHEMATIC_PLACEHOLDER } from '../utils/mediaUrl.js'

export default function ProjectCard({ project }) {
  const [imgFailed, setImgFailed] = useState(false)
  const src = resolveMediaUrl(project.schematic_url)
  const showPlaceholder = !src || imgFailed

  return (
    <article className="panel panel-hover overflow-hidden">
      <img
        src={showPlaceholder ? SCHEMATIC_PLACEHOLDER : src}
        alt=""
        className="h-32 w-full border-b border-dark-border object-cover bg-dark-bg"
        onError={() => setImgFailed(true)}
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
