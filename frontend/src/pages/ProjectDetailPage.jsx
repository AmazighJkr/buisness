import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { fetchProject } from '../api/client.js'
import CodeBox from '../components/CodeBox.jsx'
import MaterialsTable from '../components/MaterialsTable.jsx'
import ProjectComments from '../components/ProjectComments.jsx'
import ProjectContact from '../components/ProjectContact.jsx'
import SectionBox from '../components/SectionBox.jsx'
import SimulationEmbed from '../components/SimulationEmbed.jsx'
import WiringTable from '../components/WiringTable.jsx'

export default function ProjectDetailPage() {
  const { id } = useParams()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProject(id)
      .then(setProject)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <p className="text-sm text-theme-muted animate-pulse">Loading...</p>

  if (error || !project) {
    return (
      <div>
        <Link to="/" className="text-sm text-theme-muted hover:text-theme-fg">← Home</Link>
        <p className="mt-4 text-theme-muted">{error || 'Not found'}</p>
      </div>
    )
  }

  const libs = project.libraries_list || []

  return (
    <div className="space-y-6 pb-12">
      <Link to="/" className="text-sm text-theme-muted hover:text-theme-fg">
        ← Home
      </Link>

      <SectionBox>
        <h1 className="text-2xl font-semibold text-theme-fg">{project.title}</h1>
        <p className="mt-4 text-sm leading-relaxed text-theme-muted whitespace-pre-wrap">
          {project.description}
        </p>
      </SectionBox>

      <SectionBox title="Materials">
        <MaterialsTable materials={project.materials} />
      </SectionBox>

      {project.wiring?.length > 0 && (
        <SectionBox title="Wiring">
          <WiringTable wiring={project.wiring} />
        </SectionBox>
      )}

      {project.schematic_url && (
        <SectionBox title="Schematic">
          <img
            src={project.schematic_url}
            alt="Schematic"
            className="w-full border border-theme-border object-contain bg-theme-bg"
          />
        </SectionBox>
      )}

      {project.simulation_embed_url && (
        <SectionBox title="Simulation">
          <SimulationEmbed embedUrl={project.simulation_embed_url} />
        </SectionBox>
      )}

      {libs.length > 0 && (
        <SectionBox title="Libraries / dependencies">
          <ul className="flex flex-wrap gap-2">
            {libs.map((lib) => (
              <li key={lib} className="border border-theme-border px-2 py-1 text-xs text-theme-muted">
                {lib}
              </li>
            ))}
          </ul>
        </SectionBox>
      )}

      {project.source_code && (
        <SectionBox title="Code">
          <CodeBox code={project.source_code} />
        </SectionBox>
      )}

      <ProjectComments projectId={project.id} initial={project.comments || []} />
      <ProjectContact projectId={project.id} />
    </div>
  )
}
