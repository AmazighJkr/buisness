import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PanelLeft } from 'lucide-react'
import CategorySidebar from '../components/CategorySidebar.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import ProjectDetailContent from '../components/ProjectDetailContent.jsx'
import { useProjectsSidebar } from '../hooks/useProjectsSidebar.js'
import { useUserSession } from '../hooks/useUserSession.js'
import { fetchCategories, fetchFeaturedProjects, fetchProject, fetchProjects } from '../api/client.js'
import { accountUrlWithNext, subscriptionsUrlForProject } from '../utils/projectAccess.js'

export default function ProjectsPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useProjectsSidebar()
  const { user, hasActivePack, isLoggedIn, loading: sessionLoading } = useUserSession()
  const accessKey = (user?.active_pack_ids || []).join(',')

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
  }, [selectedSubId, accessKey])

  useEffect(() => {
    if (!projectId) {
      setProject(null)
      return
    }
    fetchProject(projectId)
      .then(setProject)
      .catch(() => setProject(null))
  }, [projectId, accessKey])

  useEffect(() => {
    if (!projectId || !project?.locked || sessionLoading) return
    if (!isLoggedIn) {
      navigate(accountUrlWithNext(`/projects/${projectId}`), { replace: true })
      return
    }
    navigate(subscriptionsUrlForProject(project, projectId), { replace: true })
  }, [project, projectId, isLoggedIn, sessionLoading, navigate])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const lock = () => {
      if (mq.matches && sidebarOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
    }
    lock()
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  const toggleExpand = (catId) => {
    setExpanded((e) => ({ ...e, [catId]: !e[catId] }))
  }

  const closeSidebar = () => setSidebarOpen(false)
  const openSidebar = () => setSidebarOpen(true)

  const selectSub = (subId) => {
    setSelectedSubId(subId)
    navigate('/projects')
    if (window.innerWidth < 1024) closeSidebar()
  }

  const openProject = (id) => {
    const p = projects.find((pr) => pr.id === id)
    if (p?.locked) {
      if (!isLoggedIn) {
        navigate(accountUrlWithNext(`/projects/${id}`))
      } else {
        navigate(subscriptionsUrlForProject(p, id))
      }
      if (window.innerWidth < 1024) closeSidebar()
      return
    }
    navigate(`/projects/${id}`)
    if (window.innerWidth < 1024) closeSidebar()
  }

  return (
    <div className="page-shell flex min-h-screen min-h-[100dvh] flex-col">
      <PageHeader
        highlight="/projects"
        headerStart={
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="theme-toggle-btn site-header-categories-btn flex shrink-0 items-center gap-1.5 !px-2.5"
            aria-expanded={sidebarOpen}
            aria-controls="projects-category-sidebar"
            aria-label={sidebarOpen ? 'Hide categories' : 'Show categories'}
          >
            <PanelLeft className="h-5 w-5 shrink-0" />
            <span className="hidden text-xs lg:inline">{sidebarOpen ? 'Hide' : 'Categories'}</span>
          </button>
        }
      />

      {!sidebarOpen && (
        <button
          type="button"
          onClick={openSidebar}
          className="flex w-full items-center justify-center gap-2 border-b border-dark-border bg-dark-panel px-3 py-2.5 text-sm text-dark-text lg:hidden"
        >
          <PanelLeft className="h-4 w-4 text-dark-muted" />
          Browse categories
        </button>
      )}

      <div className="flex min-h-0 flex-1">
        <CategorySidebar
          id="projects-category-sidebar"
          categories={categories}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          selectedSubId={selectedSubId}
          onSelectSub={selectSub}
          open={sidebarOpen}
          onClose={closeSidebar}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {projectId && project && !project.locked ? (
            <div className="px-3 py-4 sm:px-6 lg:px-8">
              <ProjectDetailContent
                project={project}
                onBack={() => navigate('/projects')}
              />
            </div>
          ) : projectId && (sessionLoading || project?.locked) ? (
            <div className="p-6 text-sm text-dark-muted animate-pulse">Loading…</div>
          ) : (
            <div className="p-3 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h1 className="text-base font-semibold sm:text-lg">
                  {selectedSubId ? 'Projects' : 'Trending projects'}
                </h1>
                <p className="text-xs text-dark-muted">
                  {selectedSubId
                    ? 'Filtered by subcategory — free projects open without an account'
                    : 'Free projects need no sign-in. Pack projects unlock with your subscription.'}
                </p>
                {hasActivePack && (
                  <p className="mt-1 text-xs text-lab-cyan">
                    Signed in — your active pack{user.subscriptions?.length > 1 ? 's' : ''} unlock matching projects.
                  </p>
                )}
              </div>

              {loading ? (
                <p className="text-sm text-dark-muted animate-pulse">Loading...</p>
              ) : projects.length === 0 ? (
                <p className="text-sm text-dark-muted">No projects here yet.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
                  {projects.map((p) => (
                    <div key={p.id} onClick={() => openProject(p.id)} className="cursor-pointer">
                      <ProjectCard project={p} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
