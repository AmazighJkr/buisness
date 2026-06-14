import { useState } from 'react'
import { useTranslation } from '../context/LocaleContext.jsx'
import ProjectLockedPanel from './ProjectLockedPanel.jsx'
import CodePanel from './CodePanel.jsx'
import ProjectMaterialsSection from './ProjectMaterialsSection.jsx'
import ProjectContentRenderer from './ProjectContentRenderer.jsx'
import ProjectComments from './ProjectComments.jsx'
import SectionBox from './SectionBox.jsx'
import EmbeddableMedia from './EmbeddableMedia.jsx'
import HardwareModelViewer from './HardwareModelViewer.jsx'
import WiringTable from './WiringTable.jsx'
import { resolveSimulationEmbed, resolveVideoEmbed } from '../utils/embedUtils.js'
import { resolveMediaUrl, SCHEMATIC_PLACEHOLDER } from '../utils/mediaUrl.js'

function hasMaterials(materials) {
  return Array.isArray(materials) && materials.some((r) => r?.component?.trim() || r?.part)
}

export default function ProjectDetailContent({ project, onBack }) {
  const { t } = useTranslation()
  const [schematicFailed, setSchematicFailed] = useState(false)
  const [coverFailed, setCoverFailed] = useState(false)
  const coverSrc = resolveMediaUrl(project.cover_url)
  const schematicSrc = resolveMediaUrl(project.schematic_url)
  const libs = project.libraries_list || []
  const simulationConfig = project.simulation_url
    ? resolveSimulationEmbed(project.simulation_url)
    : null
  const videoConfig = project.video_url ? resolveVideoEmbed(project.video_url) : null
  const codeFiles = (project.code_files || []).filter((f) => f?.code?.trim())
  const hasDescription = Boolean(project.description?.trim())
  const contentBlocks = Array.isArray(project.content_blocks) ? project.content_blocks : []
  const useBlocks = contentBlocks.length > 0

  if (project.locked) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 pb-10 lg:w-[75%]">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-dark-muted transition-colors hover:text-dark-text"
        >
          {t('projects.backToList')}
        </button>
        <ProjectLockedPanel project={project} />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 pb-10 lg:w-[75%]">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-dark-muted transition-colors hover:text-dark-text"
      >
        {t('projects.backToList')}
      </button>

      <SectionBox>
        <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{project.title}</h1>
        <p className="mt-1 text-xs text-dark-muted">
          {project.category_name} / {project.subcategory_name}
        </p>
        {coverSrc && coverSrc !== schematicSrc && (
          <img
            src={coverFailed ? SCHEMATIC_PLACEHOLDER : coverSrc}
            alt=""
            className="mt-4 max-h-72 w-full rounded-lg object-cover"
            onError={() => setCoverFailed(true)}
          />
        )}
      </SectionBox>

      {useBlocks ? (
        <ProjectContentRenderer project={project} blocks={contentBlocks} />
      ) : (
        <>
      {hasDescription && (
        <SectionBox title={t('materials.description')}>
          <p className="text-sm leading-relaxed text-dark-muted whitespace-pre-wrap">
            {project.description}
          </p>
        </SectionBox>
      )}

      {libs.length > 0 && (
        <SectionBox title={t('materials.libraries')}>
          <ul className="flex flex-wrap gap-1.5">
            {libs.map((lib) => (
              <li key={lib} className="lab-chip">
                {lib}
              </li>
            ))}
          </ul>
        </SectionBox>
      )}

      {codeFiles.length > 0 && (
        <SectionBox title={t('materials.code')} noPadding>
          <CodePanel files={codeFiles} projectId={project.id} />
        </SectionBox>
      )}

      {(project.model_3d_url?.trim() || project.model_3d_pending) && (
        <SectionBox title={t('materials.model3d')} noPadding>
          {project.model_3d_url?.trim() ? (
            <HardwareModelViewer url={project.model_3d_url.trim()} />
          ) : (
            <div className="model-viewer-notice">
              <p className="text-sm font-medium text-dark-text">
                {project.model_3d_conversion_error
                  ? t('projects.model3dFailedTitle')
                  : t('projects.model3dPendingTitle')}
              </p>
              <p className="mt-2 text-xs text-dark-muted">
                {project.model_3d_conversion_error || t('projects.model3dPendingBody')}
              </p>
            </div>
          )}
        </SectionBox>
      )}

      {simulationConfig && (
        <SectionBox title={t('materials.simulation')} noPadding>
          <EmbeddableMedia config={simulationConfig} />
        </SectionBox>
      )}

      {(schematicSrc || project.schematic_file_missing) && (
        <SectionBox title={t('materials.schematic')}>
          <img
            src={
              schematicFailed || !schematicSrc || project.schematic_file_missing
                ? SCHEMATIC_PLACEHOLDER
                : schematicSrc
            }
            alt="Project schematic"
            className="mx-auto max-h-96 w-full max-w-full object-contain bg-dark-bg"
            onError={() => setSchematicFailed(true)}
          />
          {(schematicFailed || project.schematic_file_missing) && (
            <p className="mt-2 text-center text-xs text-dark-muted">
              Image missing on server (common on Render after redeploy). Edit the project and
              upload again, or set CLOUDINARY_URL — see RENDER.md.
            </p>
          )}
        </SectionBox>
      )}

      {videoConfig && (
        <SectionBox title={t('materials.video')} noPadding>
          <EmbeddableMedia config={videoConfig} />
        </SectionBox>
      )}

      {hasMaterials(project.materials) && (
        <SectionBox title={t('materials.title')}>
          <ProjectMaterialsSection materials={project.materials} />
        </SectionBox>
      )}

      {project.wiring?.length > 0 && (
        <SectionBox title={t('materials.wiring')}>
          <div className="overflow-x-auto">
            <WiringTable wiring={project.wiring} />
          </div>
        </SectionBox>
      )}
        </>
      )}

      <ProjectComments projectId={project.id} initial={project.comments || []} />
    </div>
  )
}
