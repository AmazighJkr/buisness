import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cpu, LogOut, Plus, Search } from 'lucide-react'
import AdminProjectComments from '../components/admin/AdminProjectComments.jsx'
import AdminCommandInvoice from '../components/AdminCommandInvoice.jsx'
import CommandPaymentStatusBar from '../components/CommandPaymentStatusBar.jsx'
import ThemeToggle from '../components/ThemeToggle.jsx'
import {
  adminCreateProject,
  adminDeleteComment,
  adminDeleteProject,
  adminFetchCategories,
  adminFetchCommand,
  adminFetchCommands,
  adminFetchComments,
  adminFetchProjects,
  adminFetchPacks,
  adminLogin,
  adminLogout,
  adminRespondCommand,
  adminSendCommandMessage,
  adminUpdateProject,
  adminRetryProjectModel3d,
  fetchAdminMe,
  staffCanEditStore,
  staffCanManageLayers,
  staffCanManageStoreOrders,
  staffCanPostStore,
  staffCanViewContactMessages,
  staffHasStoreAccess,
  validateModel3dFile,
  validateUploadFile,
} from '../api/client.js'
import AdminActivityLog from '../components/admin/AdminActivityLog.jsx'
import AdminContactMessages from '../components/admin/AdminContactMessages.jsx'
import AdminDashboard from '../components/admin/AdminDashboard.jsx'
import AdminEconomics from '../components/admin/AdminEconomics.jsx'
import AdminStaff from '../components/admin/AdminStaff.jsx'
import AdminCategories from '../components/AdminCategories.jsx'
import AdminCommandLayers from '../components/AdminCommandLayers.jsx'
import AdminCustomers from '../components/AdminCustomers.jsx'
import AdminPacks from '../components/AdminPacks.jsx'
import AdminStore from '../components/AdminStore.jsx'
import AdminLegal from '../components/admin/AdminLegal.jsx'
import AdminStoreOrders from '../components/AdminStoreOrders.jsx'
import PageHeader from '../components/PageHeader.jsx'
import CommandComposer from '../components/CommandComposer.jsx'
import CommandLayersSummary from '../components/CommandLayersSummary.jsx'
import CommandStatusBar from '../components/CommandStatusBar.jsx'
import ProjectBlocksEditor from '../components/admin/ProjectBlocksEditor.jsx'
import { blocksFromLegacy, newBlock } from '../utils/projectBlocks.js'
import { COMMAND_STATUSES, PAYMENT_STATUSES } from '../constants/commandStatus.js'

const EMPTY_MAT = { component: '', quantity: '1', notes: '', store_product_id: '', amazon_url: '' }

function buildProjectFormData(form, contentBlocks, blockFiles, cover, model3d, packIds) {
  const fd = new FormData()
  fd.append('subcategory', form.subcategory)
  fd.append('is_featured', form.is_featured ? 'true' : 'false')
  fd.append('is_free', form.is_free ? 'true' : 'false')
  fd.append('featured_order', String(form.featured_order || 0))
  fd.append('title', form.title)
  const firstRich = contentBlocks.find((b) => b.type === 'rich_text' && b.html?.trim())
  fd.append('description', firstRich ? firstRich.html.replace(/<[^>]+>/g, ' ').trim() : form.description || '')
  fd.append('libraries', form.libraries || '')
  fd.append('content_blocks_json', JSON.stringify(contentBlocks))
  Object.entries(blockFiles || {}).forEach(([blockId, file]) => {
    if (file) fd.append(`block_image_${blockId}`, file)
  })
  fd.append('code_files_json', '[]')
  fd.append('materials_json', '[]')
  fd.append('wiring_json', '[]')
  fd.append('simulation_url', '')
  fd.append('video_url', '')
  fd.append('pack_ids_json', JSON.stringify(packIds || []))
  if (cover) fd.append('cover_image', cover)
  if (model3d) fd.append('model_3d_file', model3d)
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
  const [contentBlocks, setContentBlocks] = useState([newBlock('rich_text')])
  const [blockFiles, setBlockFiles] = useState({})
  const [cover, setCover] = useState(null)
  const [existingCoverUrl, setExistingCoverUrl] = useState('')
  const [model3d, setModel3d] = useState(null)
  const [existingModel3dUrl, setExistingModel3dUrl] = useState('')
  const [existingModel3dPending, setExistingModel3dPending] = useState(false)
  const [existingModel3dConversionError, setExistingModel3dConversionError] = useState('')
  const [editId, setEditId] = useState(null)

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
    await Promise.all(tasks)
  }

  const loadAdmin = async () => {
    const me = await fetchAdminMe()
    setUser(me)
    if (me) {
      await loadData(me)
      setTab('dashboard')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadAdmin()
  }, [])

  useEffect(() => {
    if (!editId || !existingModel3dPending || existingModel3dConversionError) return undefined
    const poll = async () => {
      try {
        const list = await adminFetchProjects()
        const p = list.find((row) => row.id === editId)
        if (!p) return
        setExistingModel3dUrl(p.model_3d_url || '')
        setExistingModel3dPending(!!p.model_3d_pending)
        setExistingModel3dConversionError(p.model_3d_conversion_error || '')
      } catch {
        /* ignore poll errors */
      }
    }
    poll()
    const id = window.setInterval(poll, 12000)
    return () => window.clearInterval(id)
  }, [editId, existingModel3dPending, existingModel3dConversionError])

  useEffect(() => {
    const onExpired = () => {
      adminLogout()
      setUser(null)
      setLoginError('Session expired. Please sign in again.')
    }
    window.addEventListener('admin-session-expired', onExpired)
    return () => window.removeEventListener('admin-session-expired', onExpired)
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
    setContentBlocks([newBlock('rich_text')])
    setBlockFiles({})
    setCover(null)
    setExistingCoverUrl('')
    setModel3d(null)
    setExistingModel3dUrl('')
    setExistingModel3dPending(false)
    setExistingModel3dConversionError('')
    setSelectedPackIds([])
    setEditId(null)
  }

  const handleSaveProject = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setMsg({ type: '', text: '' })
    const coverErr = validateUploadFile(cover, 'Cover image')
    if (coverErr) {
      setMsg({ type: 'error', text: coverErr })
      setSubmitting(false)
      return
    }
    for (const file of Object.values(blockFiles)) {
      if (!file) continue
      const err = validateUploadFile(file, 'Block image')
      if (err) {
        setMsg({ type: 'error', text: err })
        setSubmitting(false)
        return
      }
    }
    const modelErr = validateModel3dFile(model3d, '3D model')
    if (modelErr) {
      setMsg({ type: 'error', text: modelErr })
      setSubmitting(false)
      return
    }
    try {
      const fd = buildProjectFormData(
        form, contentBlocks, blockFiles, cover, model3d, selectedPackIds,
      )
      const converting3d = Boolean(model3d)
      const isGlbUpload = converting3d && /\.(glb|gltf)$/i.test(model3d.name)
      const convertMsg = isGlbUpload
        ? 'Project saved. GLB preview is ready on the project page.'
        : 'Project saved. Converting 3D to GLB in the background — refresh the project page in 1–3 minutes.'
      if (editId) {
        await adminUpdateProject(editId, fd)
        setMsg({
          type: 'success',
          text: converting3d ? convertMsg : 'Project updated.',
        })
      } else {
        await adminCreateProject(fd)
        setMsg({
          type: 'success',
          text: converting3d
            ? convertMsg.replace('Project saved.', 'Project published.')
            : 'Project published.',
        })
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
    setCover(null)
    setExistingCoverUrl(p.cover_url || '')
    setModel3d(null)
    setExistingModel3dUrl(p.model_3d_url || '')
    setExistingModel3dPending(!!p.model_3d_pending)
    setExistingModel3dConversionError(p.model_3d_conversion_error || '')
    setSelectedPackIds(p.pack_ids || [])
    const legacyMaterials = p.materials?.length
      ? p.materials.map((r) => ({
          component: r.component || r.part || '',
          quantity: String(r.quantity ?? r.qty ?? '1'),
          notes: r.notes || '',
          store_product_id: r.store_product_id || '',
          amazon_url: r.amazon_url || '',
        }))
      : [{ ...EMPTY_MAT }]
    const legacyWiring = p.wiring || []
    const legacyCode = p.code_files?.length
      ? p.code_files
      : p.source_code?.trim()
        ? [{ title: 'main', code: p.source_code }]
        : [{ title: 'main', code: '' }]
    setContentBlocks(
      p.content_blocks?.length
        ? p.content_blocks
        : blocksFromLegacy(p, legacyMaterials, legacyWiring, legacyCode, {
            description: p.description || '',
            libraries: p.libraries || '',
            simulation_url: p.simulation_url || '',
            video_url: p.video_url || '',
          }),
    )
    setBlockFiles({})
    setTab('post')
    window.scrollTo(0, 0)
  }

  const openCommand = async (id) => {
    try {
      const c = await adminFetchCommand(id)
      setSelectedCommand(c)
      setStatusDraft(c.status)
      const estUsd = c.estimated_total_usd != null ? String(c.estimated_total_usd) : ''
      const estDzd = c.estimated_total_dzd != null ? String(c.estimated_total_dzd) : ''
      setQuotedPriceDraft(
        c.quoted_price != null ? String(c.quoted_price) : estUsd || '',
      )
      setQuotedPriceDzdDraft(
        c.quoted_price_dzd != null ? String(c.quoted_price_dzd) : estDzd || '',
      )
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

  const tabs = [['dashboard', 'Dashboard']]
  if (hasPerm(user, 'post_project') || hasPerm(user, 'edit_project')) tabs.push(['post', 'Post / Edit'])
  if (hasPerm(user, 'edit_project') || hasPerm(user, 'post_project')) tabs.push(['projects', 'Projects'])
  if (hasPerm(user, 'view_commands')) tabs.push(['commands', 'Commands'])
  if (staffCanViewContactMessages(user)) tabs.push(['messages', 'Messages'])
  if (staffCanManageLayers(user)) tabs.push(['command-layers', 'Layers'])
  if (hasPerm(user, 'moderate_comment')) tabs.push(['comments', 'Project reviews'])
  if (hasPerm(user, 'manage_categories')) tabs.push(['categories', 'Categories'])
  if (hasPerm(user, 'edit_project') || user.is_superuser) tabs.push(['packs', 'Packs'])
  if (staffHasStoreAccess(user)) tabs.push(['store', 'Store'])
  if (staffCanManageStoreOrders(user)) tabs.push(['store-orders', 'Orders'])
  if (hasPerm(user, 'manage_store') || user.is_superuser) tabs.push(['legal', 'Legal'])
  if (user.is_superuser) tabs.push(['economics', 'Economics'])
  if (user.is_superuser) tabs.push(['clients', 'Clients'])
  if (user.is_superuser) tabs.push(['users', 'Staff'])
  if (user.is_superuser) tabs.push(['activity', 'Activity'])

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

      <ProjectBlocksEditor
        blocks={contentBlocks}
        onChange={setContentBlocks}
        blockFiles={blockFiles}
        onBlockFileChange={(blockId, file) =>
          setBlockFiles((prev) => {
            const next = { ...prev }
            if (file) next[blockId] = file
            else delete next[blockId]
            return next
          })
        }
      />

      <label className="block text-xs text-dark-muted">
        Cover image — project card thumbnail (PNG/JPG/WebP, max 5 MB)
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
          className="mt-1 block w-full text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            const err = validateUploadFile(file, 'Cover image')
            if (err) {
              setMsg({ type: 'error', text: err })
              e.target.value = ''
              setCover(null)
              return
            }
            setCover(file)
          }}
        />
        {cover && (
          <span className="mt-1 block text-[10px] text-lab-cyan">
            Selected: {cover.name} ({(cover.size / 1024).toFixed(0)} KB)
          </span>
        )}
        {!cover && existingCoverUrl && (
          <span className="mt-1 block text-[10px] text-lab-cyan">Cover on server — upload to replace</span>
        )}
      </label>

      <label className="block text-xs text-dark-muted">
        3D hardware model (optional — GLB/STL recommended on Render; STEP may timeout, max 25 MB)
        <input
          type="file"
          accept=".glb,.gltf,.obj,.stl,.step,.stp,.fbx,model/gltf-binary,model/gltf+json,model/stl"
          className="mt-1 block w-full text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0] || null
            const err = validateModel3dFile(file, '3D model')
            if (err) {
              setMsg({ type: 'error', text: err })
              e.target.value = ''
              setModel3d(null)
              return
            }
            setModel3d(file)
          }}
        />
        {model3d && (
          <span className="mt-1 block text-[10px] text-lab-cyan">
            Selected: {model3d.name} ({(model3d.size / (1024 * 1024)).toFixed(1)} MB)
          </span>
        )}
        {!model3d && existingModel3dUrl && (
          <span className="mt-1 block text-[10px] text-lab-cyan">
            GLB preview ready — upload a new file to replace
          </span>
        )}
        {!model3d && existingModel3dConversionError && editId && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="block text-[10px] text-red-400">
              Conversion failed: {existingModel3dConversionError}
            </span>
            <button
              type="button"
              className="text-[10px] text-lab-cyan underline"
              onClick={async () => {
                try {
                  const updated = await adminRetryProjectModel3d(editId)
                  setExistingModel3dConversionError(updated.model_3d_conversion_error || '')
                  setExistingModel3dPending(!!updated.model_3d_pending)
                  setMsg({ type: 'success', text: 'Retrying GLB conversion in the background…' })
                } catch (err) {
                  setMsg({ type: 'error', text: err.message })
                }
              }}
            >
              Retry conversion
            </button>
          </div>
        )}
        {!model3d && existingModel3dConversionError && !editId && (
          <span className="mt-1 block text-[10px] text-red-400">
            Conversion failed: {existingModel3dConversionError} — upload GLB for instant preview.
          </span>
        )}
        {!model3d && existingModel3dPending && !existingModel3dConversionError && (
          <span className="mt-1 block text-[10px] text-amber-400">
            Converting to GLB in the background — refresh the project page in 1–3 minutes.
          </span>
        )}
      </label>

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

      {tab === 'dashboard' && (
        <AdminDashboard
          user={user}
          onNavigate={(id) => {
            setTab(id)
            window.scrollTo(0, 0)
          }}
        />
      )}

      {tab === 'post' && (hasPerm(user, 'post_project') || hasPerm(user, 'edit_project')) && projectForm}

      {tab === 'categories' && hasPerm(user, 'manage_categories') && <AdminCategories />}

      {tab === 'packs' && (hasPerm(user, 'edit_project') || user.is_superuser) && <AdminPacks />}
      {tab === 'store' && staffHasStoreAccess(user) && (
        <AdminStore
          user={user}
          canPost={staffCanPostStore(user)}
          canEdit={staffCanEditStore(user)}
        />
      )}
      {tab === 'legal' && (hasPerm(user, 'manage_store') || user.is_superuser) && <AdminLegal />}

      {tab === 'store-orders' && staffCanManageStoreOrders(user) && <AdminStoreOrders />}

      {tab === 'economics' && user.is_superuser && <AdminEconomics />}

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

      {tab === 'command-layers' && staffCanManageLayers(user) && <AdminCommandLayers />}

      {tab === 'messages' && staffCanViewContactMessages(user) && (
        <AdminContactMessages user={user} onMessage={(type, text) => setMsg({ type, text })} />
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
                    <span className="text-lab-copper shrink-0">
                      {c.status} · {c.payment_status || 'none'}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-gray-500">
                    {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                  </p>
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
                  <p className="mt-1 text-[10px] text-gray-500">
                    Submitted {selectedCommand.created_at
                      ? new Date(selectedCommand.created_at).toLocaleString()
                      : '—'}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedCommand(null)} className="text-gray-500">
                  Close
                </button>
              </div>
              <p className="text-dark-text whitespace-pre-wrap">{selectedCommand.idea_description}</p>

              {selectedCommand.selected_layers?.length > 0 && (
                <CommandLayersSummary
                  layers={selectedCommand.selected_layers}
                  totalUsd={selectedCommand.estimated_total_usd}
                  totalDzd={selectedCommand.estimated_total_dzd}
                />
              )}

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
              <CommandPaymentStatusBar paymentStatus={selectedCommand.payment_status} />

              {hasPerm(user, 'respond_commands') && (
                <AdminCommandInvoice
                  commandId={selectedCommand.id}
                  invoices={selectedCommand.invoices || []}
                  onReload={() => openCommand(selectedCommand.id)}
                />
              )}

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
        <AdminProjectComments
          comments={comments}
          onReload={async () => setComments(await adminFetchComments())}
        />
      )}

      {tab === 'users' && user.is_superuser && (
        <AdminStaff
          isSuperuser={user.is_superuser}
          onMessage={(type, text) => setMsg({ type, text })}
        />
      )}

      {tab === 'activity' && user.is_superuser && <AdminActivityLog />}
    </div>
    </div>
  )
}
