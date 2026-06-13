import { useState } from 'react'
import { ChevronRight, Lock } from 'lucide-react'
import { resolveMediaUrl, SCHEMATIC_PLACEHOLDER } from '../utils/mediaUrl.js'

import ReviewStars from './ReviewStars.jsx'

export default function ProjectCard({ project }) {
  const [imgFailed, setImgFailed] = useState(false)
  const src = resolveMediaUrl(project.cover_url || project.schematic_url)
  const showPlaceholder = !src || imgFailed
  const locked = project.locked

  return (
    <article className={`project-card panel panel-hover ${locked ? 'opacity-90' : ''}`}>
      <div className="project-card__media relative">
        <img
          src={showPlaceholder ? SCHEMATIC_PLACEHOLDER : src}
          alt=""
          className="project-card__img"
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
      <div className="project-card__body flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="project-card__title truncate text-sm font-medium">{project.title}</h3>
          <ReviewStars rating={project.review_avg} count={project.review_count} size="xs" />
          <p className="project-card__desc mt-1 line-clamp-2 text-xs text-dark-muted">
            {project.description}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-dark-muted" aria-hidden />
      </div>
    </article>
  )
}
