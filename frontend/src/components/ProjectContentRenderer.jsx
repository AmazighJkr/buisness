import { useState } from 'react'
import { useTranslation } from '../context/LocaleContext.jsx'
import CodePanel from './CodePanel.jsx'
import ProjectMaterialsSection from './ProjectMaterialsSection.jsx'
import SectionBox from './SectionBox.jsx'
import EmbeddableMedia from './EmbeddableMedia.jsx'
import HardwareModelViewer from './HardwareModelViewer.jsx'
import WiringTable from './WiringTable.jsx'
import { resolveSimulationEmbed, resolveVideoEmbed } from '../utils/embedUtils.js'
import { resolveMediaUrl, SCHEMATIC_PLACEHOLDER } from '../utils/mediaUrl.js'

function hasMaterials(materials) {
  return Array.isArray(materials) && materials.some((r) => r?.component?.trim() || r?.part)
}

function RichHtml({ html }) {
  if (!html?.trim()) return null
  return <div className="prose-store text-sm leading-relaxed text-dark-muted" dangerouslySetInnerHTML={{ __html: html }} />
}

function SchematicBlock({ block }) {
  const [failed, setFailed] = useState(false)
  const src = resolveMediaUrl(block.image_url)
  return (
    <img
      src={failed || !src ? SCHEMATIC_PLACEHOLDER : src}
      alt={block.title || 'Schematic'}
      className="mx-auto max-h-96 w-full max-w-full object-contain bg-dark-bg"
      onError={() => setFailed(true)}
    />
  )
}

export default function ProjectContentRenderer({ project, blocks = [] }) {
  const { t } = useTranslation()

  return (
    <>
      {(blocks || []).map((block) => {
        const key = block.id || `${block.type}-${block.title}`
        const title = block.title?.trim()

        if (block.type === 'heading') {
          if (!title) return null
          return (
            <h2 key={key} className="text-lg font-semibold tracking-tight text-dark-text">
              {title}
            </h2>
          )
        }

        if (block.type === 'rich_text') {
          if (!block.html?.trim()) return null
          return (
            <SectionBox key={key} title={title || undefined}>
              <RichHtml html={block.html} />
            </SectionBox>
          )
        }

        if (block.type === 'libraries' && block.text?.trim()) {
          const libs = block.text.split(',').map((x) => x.trim()).filter(Boolean)
          return (
            <SectionBox key={key} title={title || t('materials.libraries')}>
              <ul className="flex flex-wrap gap-1.5">
                {libs.map((lib) => (
                  <li key={lib} className="lab-chip">
                    {lib}
                  </li>
                ))}
              </ul>
            </SectionBox>
          )
        }

        if (block.type === 'code') {
          const files = (block.code_files || []).filter((f) => f?.code?.trim())
          if (!files.length) return null
          return (
            <SectionBox key={key} title={title || t('materials.code')} noPadding>
              <CodePanel files={files} projectId={project.id} />
            </SectionBox>
          )
        }

        if (block.type === 'schematic' && (block.image_url || block.image_path)) {
          return (
            <SectionBox key={key} title={title || t('materials.schematic')}>
              <SchematicBlock block={block} />
            </SectionBox>
          )
        }

        if (block.type === 'simulation' && block.url?.trim()) {
          const config = resolveSimulationEmbed(block.url)
          if (!config) return null
          return (
            <SectionBox key={key} title={title || t('materials.simulation')} noPadding>
              <EmbeddableMedia config={config} />
            </SectionBox>
          )
        }

        if (block.type === 'video' && block.url?.trim()) {
          const config = resolveVideoEmbed(block.url)
          if (!config) return null
          return (
            <SectionBox key={key} title={title || t('materials.video')} noPadding>
              <EmbeddableMedia config={config} />
            </SectionBox>
          )
        }

        if (block.type === 'materials' && hasMaterials(block.materials)) {
          return (
            <SectionBox key={key} title={title || t('materials.title')}>
              <ProjectMaterialsSection materials={block.materials} />
            </SectionBox>
          )
        }

        if (block.type === 'wiring' && block.wiring?.length > 0) {
          return (
            <SectionBox key={key} title={title || t('materials.wiring')}>
              <div className="overflow-x-auto">
                <WiringTable wiring={block.wiring} />
              </div>
            </SectionBox>
          )
        }

        if (block.type === 'model_3d' && (project.model_3d_url?.trim() || project.model_3d_pending)) {
          return (
            <SectionBox key={key} title={title || t('materials.model3d')} noPadding>
              {project.model_3d_url?.trim() ? (
                <HardwareModelViewer url={project.model_3d_url.trim()} />
              ) : (
                <div className="model-viewer-notice">
                  <p className="text-sm font-medium text-dark-text">{t('projects.model3dPendingTitle')}</p>
                  <p className="mt-2 text-xs text-dark-muted">{t('projects.model3dPendingBody')}</p>
                </div>
              )}
            </SectionBox>
          )
        }

        return null
      })}
    </>
  )
}
