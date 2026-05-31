import { useState } from 'react'
import ProjectLockedPanel from './ProjectLockedPanel.jsx'
import CodePanel from './CodePanel.jsx'
import MaterialsTable from './MaterialsTable.jsx'
import ProjectComments from './ProjectComments.jsx'
import SectionBox from './SectionBox.jsx'
import EmbeddableMedia from './EmbeddableMedia.jsx'
import WiringTable from './WiringTable.jsx'
import { resolveSimulationEmbed, resolveVideoEmbed } from '../utils/embedUtils.js'
import { resolveMediaUrl, SCHEMATIC_PLACEHOLDER } from '../utils/mediaUrl.js'

function hasMaterials(materials) {
  return Array.isArray(materials) && materials.some((r) => r?.component?.trim() || r?.part)
}

export default function ProjectDetailContent({ project, onBack }) {
  const [schematicFailed, setSchematicFailed] = useState(false)
  const schematicSrc = resolveMediaUrl(project.schematic_url)
  const libs = project.libraries_list || []
  const simulationConfig = project.simulation_url
    ? resolveSimulationEmbed(project.simulation_url)
    : null
  const videoConfig = project.video_url ? resolveVideoEmbed(project.video_url) : null
  const codeFiles = (project.code_files || []).filter((f) => f?.code?.trim())
  const hasDescription = Boolean(project.description?.trim())

  if (project.locked) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 pb-10 lg:w-[75%]">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-dark-muted transition-colors hover:text-dark-text"
        >
          ← Back to list
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
        ← Back to list
      </button>

      <SectionBox>
        <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">{project.title}</h1>
        <p className="mt-1 text-xs text-dark-muted">
          {project.category_name} / {project.subcategory_name}
        </p>
      </SectionBox>

      {hasDescription && (
        <SectionBox title="Description">
          <p className="text-sm leading-relaxed text-dark-muted whitespace-pre-wrap">
            {project.description}
          </p>
        </SectionBox>
      )}

      {libs.length > 0 && (
        <SectionBox title="Libraries">
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
        <SectionBox title="Code" noPadding>
          <CodePanel files={codeFiles} />
        </SectionBox>
      )}

      {simulationConfig && (
        <SectionBox title="Simulation" noPadding>
          <EmbeddableMedia config={simulationConfig} />
        </SectionBox>
      )}

      {(schematicSrc || project.schematic_file_missing) && (
        <SectionBox title="Schematic">
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
        <SectionBox title="Video" noPadding>
          <EmbeddableMedia config={videoConfig} />
        </SectionBox>
      )}

      {hasMaterials(project.materials) && (
        <SectionBox title="Materials">
          <div className="overflow-x-auto">
            <MaterialsTable materials={project.materials} />
          </div>
        </SectionBox>
      )}

      {project.wiring?.length > 0 && (
        <SectionBox title="Wiring">
          <div className="overflow-x-auto">
            <WiringTable wiring={project.wiring} />
          </div>
        </SectionBox>
      )}

      <ProjectComments projectId={project.id} initial={project.comments || []} />
    </div>
  )
}
