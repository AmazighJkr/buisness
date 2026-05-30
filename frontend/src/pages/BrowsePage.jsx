import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { fetchCategories, fetchProjects } from '../api/client.js'
import ProjectCard from '../components/ProjectCard.jsx'

function findInTree(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return { node, isTop: true }
    for (const child of node.children || []) {
      if (child.id === id) return { node: child, parent: node, isTop: false }
    }
  }
  return null
}

export default function BrowsePage() {
  const { categoryId } = useParams()
  const [tree, setTree] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const match = findInTree(tree, categoryId)
  const node = match?.node
  const parent = match?.parent
  const isTop = match?.isTop
  const children = isTop ? node?.children || [] : []
  const isLeaf = !isTop

  useEffect(() => {
    setLoading(true)
    fetchCategories()
      .then((data) => {
        setTree(data)
        const m = findInTree(data, categoryId)
        if (m && !m.isTop) {
          return fetchProjects(m.node.id).then(setProjects)
        }
        return []
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [categoryId])

  if (loading) {
    return <p className="text-sm text-theme-muted animate-pulse">Loading...</p>
  }

  if (!node) {
    return (
      <div>
        <Link to="/" className="text-sm text-theme-muted hover:text-theme-fg">← Home</Link>
        <p className="mt-4 text-theme-muted">Category not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          to={parent ? `/browse/${parent.id}` : '/'}
          className="inline-flex items-center gap-1 text-sm text-theme-muted hover:text-theme-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          {parent ? parent.name : 'Home'}
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-theme-fg">{node.name}</h1>
        {isLeaf && parent && (
          <p className="mt-1 text-sm text-theme-muted">{parent.name}</p>
        )}
      </div>

      {error && <p className="text-sm text-theme-muted">{error}</p>}

      {isTop && children.length > 0 && (
        <ul className="space-y-3">
          {children.map((sub) => (
            <li key={sub.id}>
              <Link
                to={`/browse/${sub.id}`}
                className="panel panel-hover flex items-center justify-between px-5 py-4"
              >
                <div>
                  <span className="font-medium text-theme-fg">{sub.name}</span>
                  <p className="mt-1 text-xs text-theme-muted">
                    {sub.project_count} project{sub.project_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-theme-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {isLeaf && (
        <div className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-sm text-theme-muted">No projects in this subcategory yet.</p>
          ) : (
            projects.map((p) => <ProjectCard key={p.id} project={p} />)
          )}
        </div>
      )}
    </div>
  )
}
