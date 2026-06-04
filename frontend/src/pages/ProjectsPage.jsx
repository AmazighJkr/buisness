import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import CategorySidebar from '../components/CategorySidebar.jsx'
import PageHeader from '../components/PageHeader.jsx'
import ProjectCard from '../components/ProjectCard.jsx'
import ProjectDetailContent from '../components/ProjectDetailContent.jsx'
import SearchBar from '../components/SearchBar.jsx'
import SidebarRail from '../components/SidebarRail.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useProjectsSidebar } from '../hooks/useProjectsSidebar.js'
import { useUserSession } from '../hooks/useUserSession.js'
import { fetchCategories, fetchProject, fetchProjects } from '../api/client.js'
import { accountUrlWithNext, subscriptionsUrlForProject } from '../utils/projectAccess.js'

export default function ProjectsPage() {
  const { t } = useTranslation()
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useProjectsSidebar()
  const { user, hasActivePack, isLoggedIn, loading: sessionLoading } = useUserSession()
  const accessKey = (user?.active_pack_ids || []).join(',')

  const [categories, setCategories] = useState([])
  const [expanded, setExpanded] = useState({})
  const [selectedSubId, setSelectedSubId] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    setLoadError('')
    fetchCategories()
      .then(setCategories)
      .catch((err) => {
        setCategories([])
        setLoadError(err.message || t('projects.categoriesError'))
      })
  }, [t])

  useEffect(() => {
    setLoading(true)
    setLoadError('')
    fetchProjects(selectedSubId || null, { q: searchQuery.trim() })
      .then(setProjects)
      .catch((err) => {
        setProjects([])
        setLoadError(err.message || t('projects.loadError'))
      })
      .finally(() => setLoading(false))
  }, [selectedSubId, searchQuery, accessKey, t])

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

  const selectSub = (subId) => {
    setSelectedSubId(subId)
    navigate('/projects')
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  const openProject = (id) => {
    const p = projects.find((pr) => pr.id === id)
    if (p?.locked) {
      if (!isLoggedIn) {
        navigate(accountUrlWithNext(`/projects/${id}`))
      } else {
        navigate(subscriptionsUrlForProject(p, id))
      }
      if (window.innerWidth < 1024) setSidebarOpen(false)
      return
    }
    navigate(`/projects/${id}`)
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <div className="page-shell flex min-h-screen min-h-[100dvh] flex-col">
      <PageHeader
        highlight="/projects"
        subheader={
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t('projects.searchPlaceholder')}
            ariaLabel={t('projects.searchPlaceholder')}
          />
        }
      />

      <div className="flex min-h-0 flex-1">
        {!sidebarOpen && (
          <SidebarRail onOpen={() => setSidebarOpen(true)} controlsId="projects-category-sidebar" />
        )}

        <CategorySidebar
          id="projects-category-sidebar"
          categories={categories}
          expanded={expanded}
          onToggleExpand={toggleExpand}
          selectedSubId={selectedSubId}
          onSelectSub={selectSub}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
          {projectId && project && !project.locked ? (
            <div className="px-3 py-4 sm:px-6 lg:px-8">
              <ProjectDetailContent project={project} onBack={() => navigate('/projects')} />
            </div>
          ) : projectId && (sessionLoading || project?.locked) ? (
            <div className="p-6 text-sm text-dark-muted animate-pulse">{t('common.loading')}</div>
          ) : (
            <div className="p-3 sm:p-6">
              <div className="mb-4 sm:mb-6">
                <h1 className="text-base font-semibold sm:text-lg">
                  {searchQuery.trim()
                    ? `${t('projects.title')} — “${searchQuery.trim()}”`
                    : selectedSubId
                      ? t('projects.title')
                      : t('projects.allProjects')}
                </h1>
                <p className="text-xs text-dark-muted">
                  {selectedSubId ? t('projects.filtered') : t('projects.intro')}
                </p>
                {hasActivePack && (
                  <p className="mt-1 text-xs text-lab-cyan">
                    {(user.subscriptions?.length || 0) > 1
                      ? t('projects.signedInPacks')
                      : t('projects.signedInPack')}
                  </p>
                )}
              </div>

              {loadError && (
                <p className="mb-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {loadError}
                </p>
              )}

              {loading ? (
                <p className="text-sm text-dark-muted animate-pulse">{t('common.loading')}</p>
              ) : !loadError && projects.length === 0 ? (
                <p className="text-sm text-dark-muted">
                  {searchQuery.trim() ? t('projects.noResults') : t('projects.noProjects')}
                </p>
              ) : (
                <div className="projects-grid">
                  {projects.map((p) => (
                    <div key={p.id} onClick={() => openProject(p.id)} className="projects-grid__item cursor-pointer">
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
