import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CategorySidebar from '../components/CategorySidebar.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import ProjectDetailContent from '../components/ProjectDetailContent.jsx'
import { fetchCategories, fetchFeaturedProjects, fetchProject, fetchProjects } from '../api/client.js'

export default function ProjectsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const [categories, setCategories] = useState([])
  const [expanded, setExpanded] = useState({})
  const [selectedSubId, setSelectedSubId] = useState(null)
  const [projects, setProjects] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => [])
  }, [])

  useEffect(() => {
    setLoading(true)
    const loadList = selectedSubId
      ? fetchProjects(selectedSubId)
      : fetchFeaturedProjects()
    loadList
      .then(setProjects)
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [selectedSubId])

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      return
    }
    fetchProject(projectId)
      .then(setProject)
      .catch(() => setProject(null))
  }, [projectId])

  const toggleExpand = (catId) => {
    setExpanded((e) => ({ ...e, [catId]: !e[catId] }))
  }

  const selectSub = (subId) => {
    setSelectedSubId(subId)
    navigate('/projects')
  }

  const openProject = (id) => {
    navigate(`/projects/${id}`)
  }

  return (
    <div className="flex min-h-screen flex-col bg-dark-bg text-dark-text">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-dark-border bg-dark-bg px-4 py-3">
        <Link to="/" className="text-sm font-semibold tracking-wide">
          EmbeddedGrid
        </Link>
        <nav className="flex gap-4 text-sm text-dark-muted">
          <Link to="/" className="hover:text-dark-text">Home</Link>
          <span className="text-dark-text">Projects</span>
          <Link to="/command" className="hover:text-dark-text">Submit command</Link>
          <Link to="/track" className="hover:text-dark-text">Track</Link>
        </nav>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <CategorySidebar
          categories={categories}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          selectedSubId={selectedSubId}
          onSelectSub={selectSub}
        />

        <main className="flex-1 overflow-y-auto">
          {projectId && project ? (
            <div className="px-4 py-6 sm:px-8">
              <ProjectDetailContent
                project={project}
                onBack={() => navigate('/projects')}
              />
            </div>
          ) : (
            <div className="p-4 sm:p-6">
            <>
              <div className="mb-6">
                <h1 className="text-lg font-semibold">
                  {selectedSubId ? 'Projects' : 'Trending projects'}
                </h1>
                <p className="text-xs text-dark-muted">
                  {selectedSubId
                    ? 'Filtered by subcategory'
                    : 'Featured modules — set in admin when publishing'}
                </p>
              </div>

              {loading ? (
                <p className="text-sm text-dark-muted animate-pulse">Loading...</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-dark-muted">No projects here yet.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((p) => (
                    <div key={p.id} onClick={() => openProject(p.id)} className="cursor-pointer">
                      <ProjectCard project={p} />
                    </div>
                  ))}
                </div>
              )}
            </>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
