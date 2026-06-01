/** Lowest-tier pack id to suggest for subscription (entry pack for this project). */
export function primaryPackId(project) {
  const packs = project?.required_packs || []
  if (!packs.length) return null
  const sorted = [...packs].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  return sorted[0].id
}

export function subscriptionsUrlForProject(project, projectId) {
  const packId = primaryPackId(project)
  const params = new URLSearchParams()
  if (packId) params.set('pack', packId)
  if (projectId) params.set('project', projectId)
  const q = params.toString()
  return q ? `/subscriptions?${q}` : '/subscriptions'
}

export function accountUrlWithNext(path) {
  return `/account?next=${encodeURIComponent(path)}`
}
