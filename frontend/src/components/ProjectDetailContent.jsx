import CodePanel from './CodePanel.jsx'
import MaterialsTable from './MaterialsTable.jsx'
import ProjectComments from './ProjectComments.jsx'
import SectionBox from './SectionBox.jsx'
import EmbeddableMedia from './EmbeddableMedia.jsx'
import WiringTable from './WiringTable.jsx'
import { resolveSimulationEmbed, resolveVideoEmbed } from '../utils/embedUtils.js'

function hasMaterials(materials) {
  return Array.isArray(materials) && materials.some((r) => r?.component?.trim() || r?.part)
}

export default function ProjectDetailContent({ project, onBack }) {
  const libs = project.libraries_list || []
  const simulationConfig = project.simulation_url
    ? resolveSimulationEmbed(project.simulation_url)
    : null
  const videoConfig = project.video_url ? resolveVideoEmbed(project.video_url) : null
  const codeFiles = (project.code_files || []).filter((f) => f?.code?.trim())
  const hasDescription = Boolean(project.description?.trim())

  return (
    <div className="mx-auto w-[75%] min-w-[280px] max-w-5xl space-y-4 pb-10">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-dark-muted transition-colors hover:text-dark-text"
      >
        ← Back to list
      </button>

      <SectionBox>
        <h1 className="text-2xl font-semibold leading-snug tracking-tight">{project.title}</h1>
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

      {project.schematic_url && (
        <SectionBox title="Schematic">
          <img
            src={project.schematic_url}
            alt=""
            className="mx-auto max-h-96 w-full max-w-full object-contain bg-dark-bg"
          />
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
