import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, LogOut, Plus, Search, Users } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle.jsx'
import {
  PERM_LABELS,
  adminCreateProject,
  adminCreateUser,
  adminDeleteComment,
  adminDeleteProject,
  adminFetchCategories,
  adminFetchCommand,
  adminFetchCommands,
  adminFetchComments,
  adminFetchProjects,
  adminFetchPacks,
  adminFetchUsers,
  adminLogin,
  adminLogout,
  adminRespondCommand,
  adminSendCommandMessage,
  adminUpdateProject,
  fetchAdminMe,
  validateUploadFile,
} from '../api/client.js'
import AdminCategories from '../components/AdminCategories.jsx'
import AdminCustomers from '../components/AdminCustomers.jsx'
import AdminPacks from '../components/AdminPacks.jsx'
import AdminStore from '../components/AdminStore.jsx'
import AdminStoreOrders from '../components/AdminStoreOrders.jsx'
import PageHeader from '../components/PageHeader.jsx'
import CodeFilesEditor from '../components/CodeFilesEditor.jsx'
import CommandComposer from '../components/CommandComposer.jsx'
import CommandStatusBar from '../components/CommandStatusBar.jsx'
import EditableRows from '../components/EditableRows.jsx'
import { COMMAND_STATUSES, PAYMENT_STATUSES } from '../constants/commandStatus.js'

const ALL_PERMS = Object.keys(PERM_LABELS)
const EMPTY_MAT = { component: '', quantity: '', notes: '' }
const EMPTY_WIRE = { from_pin: '', to_pin: '', notes: '' }
const EMPTY_CODE = { title: '', code: '' }

function normalizeUrl(raw) {
  const v = (raw || '').trim()
  if (!v) return ''
  return /^https?:\/\//i.test(v) ? v : `https://${v}`
}

function buildProjectFormData(form, materials, wiring, codeFiles, schematic, packIds) {
  const fd = new FormData()
  fd.append('subcategory', form.subcategory)
  fd.append('is_featured', form.is_featured ? 'true' : 'false')
  fd.append('is_free', form.is_free ? 'true' : 'false')
  fd.append('featured_order', String(form.featured_order || 0))
  fd.append('title', form.title)
  fd.append('description', form.description)
  fd.append('libraries', form.libraries)
  fd.append(
    'code_files_json',
    JSON.stringify(codeFiles.filter((f) => f.title?.trim() || f.code?.trim())),
  )
  fd.append('materials_json', JSON.stringify(materials.filter((r) => r.component?.trim())))
  fd.append('wiring_json', JSON.stringify(wiring.filter((r) => r.from_pin?.trim() || r.to_pin?.trim())))
  fd.append('simulation_url', normalizeUrl(form.simulation_url) || '')
  fd.append('video_url', normalizeUrl(form.video_url) || '')
  fd.append('pack_ids_json', JSON.stringify(packIds || []))
  if (schematic) fd.append('schematic_image', schematic)
  return fd
}

function hasPerm(user, perm) {
  return user?.is_superuser || user?.permissions?.includes(perm)
}

export default function AdminPanelPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [tab, setTab] = useState('post')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [submitting, setSubmitting] = useState(false)

  const [projects, setProjects] = useState([])
  const [projectSearch, setProjectSearch] = useState('')
  const [commands, setCommands] = useState([])
  const [comments, setComments] = useState([])
  const [staffUsers, setStaffUsers] = useState([])

  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    categoryId: '',
    subcategory: '',
    title: '',
    description: '',
    libraries: '',
    simulation_url: '',
    video_url: '',
    is_featured: false,
    is_free: false,
    featured_order: 0,
  })
  const [materials, setMaterials] = useState([{ ...EMPTY_MAT }])
  const [wiring, setWiring] = useState([])
  const [codeFiles, setCodeFiles] = useState([{ ...EMPTY_CODE }])
  const [schematic, setSchematic] = useState(null)
  const [editId, setEditId] = useState(null)

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    permissions: [],
  })

  const [selectedCommand, setSelectedCommand] = useState(null)
  const [statusDraft, setStatusDraft] = useState('Pending')
  const [quotedPriceDraft, setQuotedPriceDraft] = useState('')
  const [quotedPriceDzdDraft, setQuotedPriceDzdDraft] = useState('')
  const [paymentStatusDraft, setPaymentStatusDraft] = useState('none')
  const [selectedPackIds, setSelectedPackIds] = useState([])
  const [adminPacks, setAdminPacks] = useState([])
  const [chatSending, setChatSending] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const loadData = async (me) => {
    const tasks = []
    if (hasPerm(me, 'edit_project') || hasPerm(me, 'post_project')) {
      tasks.push(adminFetchProjects().then(setProjects).catch(() => []))
      tasks.push(adminFetchCategories().then(setCategories).catch(() => []))
      tasks.push(adminFetchPacks().then(setAdminPacks).catch(() => []))
    }
    if (hasPerm(me, 'manage_categories')) {
      tasks.push(adminFetchCategories().then(setCategories).catch(() => []))
    }
    if (hasPerm(me, 'view_commands')) {
      tasks.push(adminFetchCommands().then(setCommands).catch(() => []))
    }
    if (hasPerm(me, 'moderate_comment')) {
      tasks.push(adminFetchComments().then(setComments).catch(() => []))
    }
    if (me?.is_superuser) {
      tasks.push(adminFetchUsers().then(setStaffUsers).catch(() => []))
    }
    await Promise.all(tasks)
  }

  const loadAdmin = async () => {
    const me = await fetchAdminMe()
    setUser(me)
    if (me) {
      await loadData(me)
      if (hasPerm(me, 'post_project')) setTab('post')
      else if (hasPerm(me, 'view_commands')) setTab('commands')
      else if (hasPerm(me, 'manage_store')) setTab('store')
      else if (me.is_superuser) setTab('users')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAdmin()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoginError('')
    try {
      await adminLogin(username, password)
      setLoading(true)
      await loadAdmin()
    } catch (err) {
      setLoginError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const topCategories = categories.filter((c) => !c.parent)
  const subcategoryOptions = categories.filter(
    (c) => c.parent && c.parent === form.categoryId,
  )

  const resetProjectForm = () => {
    setForm({
      categoryId: '',
      subcategory: '',
      title: '',
      description: '',
      libraries: '',
      simulation_url: '',
      video_url: '',
      is_featured: false,
      is_free: false,
      featured_order: 0,
    })
    setMaterials([{ ...EMPTY_MAT }])
    setWiring([])
    setCodeFiles([{ ...EMPTY_CODE }])
    setSchematic(null)
    setSelectedPackIds([])
    setEditId(null)
  }

  const handleSaveProject = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg({ type: '', text: '' })
    const fileErr = validateUploadFile(schematic, 'Schematic image')
    if (fileErr) {
      setMsg({ type: 'error', text: fileErr })
      setSubmitting(false)
      return
    }
    try {
      const fd = buildProjectFormData(form, materials, wiring, codeFiles, schematic, selectedPackIds)
      if (editId) {
        await adminUpdateProject(editId, fd)
        setMsg({ type: 'success', text: 'Project updated.' })
      } else {
        await adminCreateProject(fd)
        setMsg({ type: 'success', text: 'Project published.' })
      }
      resetProjectForm()
      const p = await adminFetchProjects()
      setProjects(p)
      setTab('projects')
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (p) => {
    setEditId(p.id)
    const sub = categories.find((c) => c.id === p.subcategory)
    setForm({
      categoryId: sub?.parent || '',
      subcategory: p.subcategory || '',
      title: p.title || '',
      description: p.description || '',
      libraries: p.libraries || '',
      simulation_url: p.simulation_url || '',
      video_url: p.video_url || '',
      is_featured: !!p.is_featured,
      is_free: !!p.is_free,
      featured_order: p.featured_order || 0,
    })
    setSelectedPackIds(p.pack_ids || [])
    setMaterials(p.materials?.length ? p.materials : [{ ...EMPTY_MAT }])
    setWiring(p.wiring || [])
    setCodeFiles(
      p.code_files?.length
        ? p.code_files
        : p.source_code?.trim()
          ? [{ title: 'main', code: p.source_code }]
          : [{ ...EMPTY_CODE }],
    )
    setTab('post')
    window.scrollTo(0, 0)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg({ type: '', text: '' })
    try {
      await adminCreateUser(newUser)
      setMsg({ type: 'success', text: `User "${newUser.username}" created.` })
      setNewUser({ username: '', password: '', email: '', permissions: [] })
      setStaffUsers(await adminFetchUsers())
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleNewUserPerm = (perm) => {
    setNewUser((u) => ({
      ...u,
      permissions: u.permissions.includes(perm)
        ? u.permissions.filter((p) => p !== perm)
        : [...u.permissions, perm],
    }))
  }

  const openCommand = async (id) => {
    try {
      const c = await adminFetchCommand(id)
      setSelectedCommand(c)
      setStatusDraft(c.status)
      setQuotedPriceDraft(c.quoted_price != null ? String(c.quoted_price) : '')
      setQuotedPriceDzdDraft(c.quoted_price_dzd != null ? String(c.quoted_price_dzd) : '')
      setPaymentStatusDraft(c.payment_status || 'none')
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  const handleUpdateStatus = async (e) => {
    e.preventDefault()
    if (!selectedCommand || !hasPerm(user, 'respond_commands')) return
    setSubmitting(true)
    try {
      const body = {
        status: statusDraft,
        staff_response: '',
      }
      if (quotedPriceDraft !== '') {
        body.quoted_price = Number(quotedPriceDraft)
      }
      if (quotedPriceDzdDraft !== '') {
        body.quoted_price_dzd = Number(quotedPriceDzdDraft)
      }
      if (paymentStatusDraft) {
        body.payment_status = paymentStatusDraft
      }
      const updated = await adminRespondCommand(selectedCommand.id, body)
      setSelectedCommand(updated)
      setCommands(await adminFetchCommands())
      setMsg({ type: 'success', text: 'Status updated.' })
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdminChat = async ({ text, link_url, image }) => {
    if (!selectedCommand) return
    setChatSending(true)
    try {
      await adminSendCommandMessage(selectedCommand.id, { text, link_url, image })
      const refreshed = await adminFetchCommand(selectedCommand.id)
      setSelectedCommand(refreshed)
      setCommands(await adminFetchCommands())
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setChatSending(false)
    }
  }

  const copyClientLink = () => {
    if (!selectedCommand?.tracking_code) return
    const url = `${window.location.origin}/track?code=${encodeURIComponent(selectedCommand.tracking_code)}`
    navigator.clipboard.writeText(url)
    setMsg({ type: 'success', text: 'Tracking link copied.' })
  }

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase()
    if (!q) return projects
    return projects.filter((p) => (p.title || '').toLowerCase().includes(q))
  }, [projects, projectSearch])

  if (loading) {
    return <p className="text-sm text-gray-500 animate-pulse p-8">Loading admin panel...</p>
  }

  if (!user) {
    return (
      <div className="page-shell mx-auto max-w-md space-y-6 p-8 min-h-screen">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-display text-2xl font-bold">Admin panel</h1>
          <ThemeToggle compact />
        </div>
        <form onSubmit={handleLogin} className="panel space-y-4 p-6">
          <input
            required
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
          />
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />
          {loginError && <p className="text-xs text-red-400">{loginError}</p>}
          <button type="submit" className="btn-primary w-full border-lab-copper text-lab-copper">
            Sign in
          </button>
        </form>
      </div>
    )
  }

  const tabs = []
  if (hasPerm(user, 'post_project') || hasPerm(user, 'edit_project')) tabs.push(['post', 'Post / Edit'])
  if (hasPerm(user, 'edit_project') || hasPerm(user, 'post_project')) tabs.push(['projects', 'Projects'])
  if (hasPerm(user, 'view_commands')) tabs.push(['commands', 'Commands'])
  if (hasPerm(user, 'moderate_comment')) tabs.push(['comments', 'Comments'])
  if (hasPerm(user, 'manage_categories')) tabs.push(['categories', 'Categories'])
  if (hasPerm(user, 'edit_project') || user.is_superuser) tabs.push(['packs', 'Packs'])
  if (hasPerm(user, 'manage_store') || user.is_superuser) {
    tabs.push(['store', 'Store'])
    tabs.push(['store-orders', 'Orders'])
  }
  if (user.is_superuser) tabs.push(['clients', 'Clients'])
  if (user.is_superuser) tabs.push(['users', 'Staff'])

  const projectForm = (
    <form onSubmit={handleSaveProject} autoComplete="off" className="panel max-w-3xl space-y-4 p-6">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Plus className="h-4 w-4" />
        {editId ? 'Edit project' : 'New project'}
      </h2>

      <label className="block text-xs text-dark-muted">
        1. Category *
        <select
          required
          value={form.categoryId}
          onChange={(e) =>
            setForm((f) => ({ ...f, categoryId: e.target.value, subcategory: '' }))
          }
          className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
        >
          <option value="">Select category...</option>
          {topCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-dark-muted">
        2. Subcategory *
        <select
          required
          disabled={!form.categoryId}
          value={form.subcategory}
          onChange={update('subcategory')}
          className="mt-1 w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm disabled:opacity-40"
        >
          <option value="">Select subcategory...</option>
          {subcategoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-dark-muted">
        <input
          type="checkbox"
          checked={form.is_free}
          onChange={(e) => setForm((f) => ({ ...f, is_free: e.target.checked }))}
        />
        Free project (no subscription required)
      </label>

      {!form.is_free && adminPacks.length > 0 && (
        <div className="border border-dark-border p-3 text-xs">
          <p className="mb-2 text-dark-muted">Subscription packs (pick one or more)</p>
          {adminPacks.map((pack) => (
            <label key={pack.id} className="mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedPackIds.includes(pack.id)}
                onChange={() =>
                  setSelectedPackIds((ids) =>
                    ids.includes(pack.id) ? ids.filter((x) => x !== pack.id) : [...ids, pack.id],
                  )
                }
              />
              <span>{pack.name}</span>
            </label>
          ))}
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-dark-muted">
        <input
          type="checkbox"
          checked={form.is_featured}
          onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
        />
        Show in trending (default grid before a subcategory is picked)
      </label>

      {form.is_featured && (
        <input
          type="number"
          min={0}
          placeholder="Trending order (higher = first)"
          value={form.featured_order}
          onChange={(e) => setForm((f) => ({ ...f, featured_order: e.target.value }))}
          className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
        />
      )}

      <input required placeholder="Title *" value={form.title} onChange={update('title')}
        className="w-full border border-theme-border bg-theme-bg px-3 py-2 text-sm" />

      <textarea required rows={4} placeholder="Description *" value={form.description} onChange={update('description')}
        className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm outline-none focus:border-lab-cyan" />

      <div>
        <p className="mb-2 text-xs text-lab-cyan">Materials table</p>
        <EditableRows
          columns={[
            { key: 'component', label: 'Component' },
            { key: 'quantity', label: 'Qty' },
            { key: 'notes', label: 'Notes' },
          ]}
          rows={materials}
          onChange={setMaterials}
          emptyRow={EMPTY_MAT}
        />
      </div>

      <div>
        <p className="mb-2 text-xs text-dark-muted">Wiring (optional)</p>
        <EditableRows
          columns={[
            { key: 'from_pin', label: 'From' },
            { key: 'to_pin', label: 'To' },
            { key: 'notes', label: 'Notes' },
          ]}
          rows={wiring}
          onChange={setWiring}
          emptyRow={EMPTY_WIRE}
        />
      </div>

      <label className="block text-xs text-dark-muted">
        Schematic image (PNG/JPG/WebP, max 5 MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          className="mt-1 block w-full text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            const err = validateUploadFile(file, 'Schematic image')
            if (err) {
              setMsg({ type: 'error', text: err })
              e.target.value = ''
              setSchematic(null)
              return
            }
            setSchematic(file)
          }}
        />
        {schematic && (
          <span className="mt-1 block text-[10px] text-lab-cyan">
            Selected: {schematic.name} ({(schematic.size / 1024).toFixed(0)} KB)
          </span>
        )}
      </label>

      <input type="text" placeholder="Simulation: Wokwi, Tinkercad embed iframe, or Cirkit Designer link" value={form.simulation_url}
        onChange={update('simulation_url')}
        className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm outline-none focus:border-lab-cyan" />

      <input type="text" placeholder="Video URL (optional — YouTube, Vimeo, etc.)" value={form.video_url}
        onChange={update('video_url')}
        className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm outline-none focus:border-lab-cyan" />

      <input placeholder="Libraries / dependencies (comma-separated)" value={form.libraries}
        onChange={update('libraries')}
        className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm outline-none focus:border-lab-cyan" />

      <div>
        <p className="mb-2 text-xs text-dark-muted">Code files (optional — add multiple with titles)</p>
        <CodeFilesEditor
          files={codeFiles}
          onChange={setCodeFiles}
          emptyFile={EMPTY_CODE}
        />
      </div>

      {msg.text && (
        <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-lab-green'}`}>{msg.text}</p>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting || (!editId && !hasPerm(user, 'post_project'))}
          className="flex-1 border border-lab-copper py-2 text-sm text-lab-copper disabled:opacity-50">
          {submitting ? 'SAVING...' : editId ? 'UPDATE' : 'PUBLISH'}
        </button>
        {editId && (
          <button type="button" onClick={resetProjectForm}
            className="border border-lab-border px-4 text-xs text-dark-muted">Cancel</button>
        )}
      </div>
    </form>
  )

  return (
    <div className="page-shell">
      <PageHeader highlight="/admin-panel" />
    <div className="mx-auto max-w-4xl space-y-6 overflow-x-hidden p-3 sm:p-6 lg:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-dark-border pb-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-lab-copper" />
          <h1 className="font-display text-2xl font-bold">Admin panel</h1>
          <span className="text-xs text-lab-green">[{user.username}]</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle compact />
          <button
            type="button"
            onClick={() => {
              adminLogout()
              setUser(null)
            }}
            className="btn-secondary flex items-center gap-1 !px-3 !py-1 text-xs hover:!text-red-400"
          >
            <LogOut className="h-3 w-3" /> Logout
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              tab === id
                ? 'border-lab-cyan bg-[color-mix(in_srgb,var(--eg-accent)_12%,var(--eg-panel))] text-lab-cyan'
                : 'border-dark-border text-dark-muted hover:text-dark-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'post' && (hasPerm(user, 'post_project') || hasPerm(user, 'edit_project')) && projectForm}

      {tab === 'categories' && hasPerm(user, 'manage_categories') && <AdminCategories />}

      {tab === 'packs' && (hasPerm(user, 'edit_project') || user.is_superuser) && <AdminPacks />}
      {tab === 'store' && (hasPerm(user, 'manage_store') || user.is_superuser) && <AdminStore />}
      {tab === 'store-orders' && (hasPerm(user, 'manage_store') || user.is_superuser) && (
        <AdminStoreOrders />
      )}

      {tab === 'clients' && user.is_superuser && <AdminCustomers />}

      {tab === 'projects' && (
        <div className="max-w-3xl space-y-3">
          <div className="store-search-bar max-w-md">
            <Search className="store-search-bar__icon h-4 w-4" aria-hidden />
            <input
              type="search"
              value={projectSearch}
              onChange={(e) => setProjectSearch(e.target.value)}
              placeholder="Search projects…"
              className="store-search-bar__input"
              aria-label="Search projects"
            />
          </div>
          <ul className="space-y-2">
          {filteredProjects.length === 0 && projectSearch.trim() ? (
            <li className="text-sm text-dark-muted">No projects match your search.</li>
          ) : null}
          {filteredProjects.map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-2 border border-lab-border bg-lab-surface px-4 py-3 text-sm">
              <span>{p.title}</span>
              <div className="flex gap-2">
                <Link to={`/projects/${p.id}`} className="text-xs text-lab-cyan">View</Link>
                {hasPerm(user, 'edit_project') && (
                  <button type="button" onClick={() => startEdit(p)} className="text-xs text-lab-copper">Edit</button>
                )}
                {hasPerm(user, 'edit_project') && (
                  <button type="button" onClick={async () => {
                    if (confirm('Delete project?')) {
                      await adminDeleteProject(p.id)
                      setProjects(await adminFetchProjects())
                    }
                  }} className="text-xs text-red-400">Delete</button>
                )}
              </div>
            </li>
          ))}
          </ul>
        </div>
      )}

      {tab === 'commands' && hasPerm(user, 'view_commands') && (
        <div className="grid gap-6 lg:grid-cols-2 max-w-5xl">
          <ul className="space-y-2">
            {commands.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => openCommand(c.id)}
                  className={`w-full border px-4 py-3 text-left text-xs ${
                    selectedCommand?.id === c.id
                      ? 'border-lab-cyan bg-lab-surface'
                      : 'border-lab-border bg-lab-surface hover:border-lab-cyan/50'
                  }`}
                >
                  <div className="flex justify-between gap-2">
                    <span className="text-dark-text">{c.client_name || c.client_email || 'Anonymous'}</span>
                    <span className="text-lab-copper shrink-0">{c.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-gray-500">{c.idea_description}</p>
                </button>
              </li>
            ))}
          </ul>

          {selectedCommand ? (
            <div className="space-y-4 border border-lab-border bg-lab-surface p-4 text-xs">
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-lab-cyan">{selectedCommand.client_name || 'Client'}</p>
                  <p className="text-gray-500">{selectedCommand.client_email}</p>
                </div>
                <button type="button" onClick={() => setSelectedCommand(null)} className="text-gray-500">
                  Close
                </button>
              </div>
              <p className="text-dark-text whitespace-pre-wrap">{selectedCommand.idea_description}</p>

              {selectedCommand.tracking_code && (
                <div className="border border-lab-border bg-lab-bg p-3 space-y-2">
                  <p className="text-gray-500">Client tracking code:</p>
                  <p className="font-mono text-lab-cyan">{selectedCommand.tracking_code}</p>
                  <button type="button" onClick={copyClientLink} className="text-lab-cyan border border-lab-border px-2 py-1">
                    Copy tracking link
                  </button>
                </div>
              )}

              <CommandStatusBar status={selectedCommand.status} />

              {hasPerm(user, 'respond_commands') && (
                <form onSubmit={handleUpdateStatus} className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value)}
                      className="min-w-[8rem] flex-1 border border-lab-border bg-lab-bg px-2 py-1"
                    >
                      {COMMAND_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="USD"
                      title="Quoted price USD (Stripe)"
                      value={quotedPriceDraft}
                      onChange={(e) => setQuotedPriceDraft(e.target.value)}
                      className="w-24 border border-lab-border bg-lab-bg px-2 py-1"
                    />
                    <input
                      type="number"
                      step="1"
                      min="0"
                      placeholder="DZD"
                      title="Quoted price DZD (Chargily)"
                      value={quotedPriceDzdDraft}
                      onChange={(e) => setQuotedPriceDzdDraft(e.target.value)}
                      className="w-24 border border-lab-border bg-lab-bg px-2 py-1"
                    />
                    <select
                      value={paymentStatusDraft}
                      onChange={(e) => setPaymentStatusDraft(e.target.value)}
                      className="border border-lab-border bg-lab-bg px-2 py-1"
                    >
                      {PAYMENT_STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="border border-lab-cyan px-3 py-1 text-lab-cyan disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Accepted + set USD and/or DZD bill amounts (Stripe / Chargily).
                  </p>
                </form>
              )}

              {hasPerm(user, 'respond_commands') && (
                <div>
                  <p className="mb-2 text-gray-500">Private chat with client</p>
                  <CommandComposer
                    messages={selectedCommand.messages || []}
                    onSend={handleAdminChat}
                    sending={chatSending}
                    adminView
                    enterpriseLabel="EmbeddedGrid"
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">Select a command to manage status and chat.</p>
          )}
        </div>
      )}

      {tab === 'comments' && hasPerm(user, 'moderate_comment') && (
        <ul className="space-y-2 max-w-3xl">
          {comments.map((c) => (
            <li key={c.id} className="flex justify-between gap-2 border border-lab-border bg-lab-surface p-3 text-xs">
              <div>
                <span className="text-lab-cyan">{c.author_name}</span> on <span className="text-lab-copper">{c.project_title}</span>
                <p className="text-dark-muted mt-1">{c.text}</p>
              </div>
              <button type="button" onClick={async () => {
                await adminDeleteComment(c.id)
                setComments(await adminFetchComments())
              }} className="text-red-400 shrink-0">Delete</button>
            </li>
          ))}
        </ul>
      )}

      {tab === 'users' && user.is_superuser && (
        <div className="grid gap-8 lg:grid-cols-2 max-w-4xl">
          <form onSubmit={handleCreateUser} className="border border-lab-border bg-lab-surface chamfer p-6 space-y-4">
            <h2 className="flex items-center gap-2 text-sm text-lab-cyan"><Users className="h-4 w-4" /> CREATE_ACCOUNT</h2>
            <input required placeholder="Username" value={newUser.username}
              onChange={(e) => setNewUser((u) => ({ ...u, username: e.target.value }))}
              className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm" />
            <input type="email" placeholder="Email" value={newUser.email}
              onChange={(e) => setNewUser((u) => ({ ...u, email: e.target.value }))}
              className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm" />
            <input required type="password" minLength={8} placeholder="Password" value={newUser.password}
              onChange={(e) => setNewUser((u) => ({ ...u, password: e.target.value }))}
              className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm" />
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Permissions</p>
              {ALL_PERMS.map((perm) => (
                <label key={perm} className="flex items-center gap-2 text-xs text-dark-text">
                  <input type="checkbox" checked={newUser.permissions.includes(perm)}
                    onChange={() => toggleNewUserPerm(perm)} />
                  {PERM_LABELS[perm]}
                </label>
              ))}
            </div>
            <button type="submit" disabled={submitting}
              className="w-full border border-lab-cyan py-2 text-sm text-lab-cyan">CREATE_USER</button>
          </form>
          <ul className="space-y-2 text-xs">
            {staffUsers.map((u) => (
              <li key={u.id} className="border border-lab-border p-3">
                <span className="text-lab-cyan">{u.username}</span>
                {u.is_superuser && <span className="ml-2 text-lab-copper">superuser</span>}
                <p className="mt-1 text-gray-500">{(u.permissions || []).map((p) => PERM_LABELS[p] || p).join(' · ')}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </div>
  )
}
