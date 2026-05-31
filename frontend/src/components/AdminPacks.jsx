import { useEffect, useState } from 'react'
import {
  adminCreatePack,
  adminDeletePack,
  adminFetchPacks,
  adminFetchProjects,
  adminUpdatePack,
} from '../api/client.js'

const EMPTY = {
  name: '',
  slug: '',
  description: '',
  price: '9.99',
  duration_days: 30,
  is_active: true,
  sort_order: 0,
  project_ids: [],
}

export default function AdminPacks() {
  const [packs, setPacks] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async () => {
    const [p, proj] = await Promise.all([adminFetchPacks(), adminFetchProjects()])
    setPacks(p)
    setProjects(proj)
  }

  useEffect(() => {
    load().catch(() => {})
  }, [])

  const reset = () => {
    setForm({ ...EMPTY })
    setEditId(null)
  }

  const toggleProject = (id) => {
    setForm((f) => {
      const ids = f.project_ids.includes(id)
        ? f.project_ids.filter((x) => x !== id)
        : [...f.project_ids, id]
      return { ...f, project_ids: ids }
    })
  }

  const save = async (e) => {
    e.preventDefault()
    setMsg('')
    const body = {
      ...form,
      price: Number(form.price) || 0,
      duration_days: Number(form.duration_days) || 30,
      sort_order: Number(form.sort_order) || 0,
      project_ids_json: JSON.stringify(form.project_ids),
    }
    try {
      if (editId) {
        await adminUpdatePack(editId, body)
        setMsg('Pack updated.')
      } else {
        await adminCreatePack(body)
        setMsg('Pack created.')
      }
      reset()
      await load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const startEdit = (pack) => {
    setEditId(pack.id)
    setForm({
      name: pack.name,
      slug: pack.slug,
      description: pack.description || '',
      price: String(pack.price),
      duration_days: pack.duration_days,
      is_active: pack.is_active,
      sort_order: pack.sort_order,
      project_ids: pack.project_ids || [],
    })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2 max-w-5xl">
      <form onSubmit={save} className="panel space-y-3 p-4">
        <h2 className="text-sm font-medium">{editId ? 'Edit pack' : 'New subscription pack'}</h2>
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="Slug (e.g. starter)"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm"
        />
        <textarea
          rows={3}
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            className="w-full border border-lab-border bg-lab-bg px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Days"
            value={form.duration_days}
            onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))}
            className="w-24 border border-lab-border bg-lab-bg px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          Active
        </label>
        <div className="max-h-40 overflow-y-auto border border-lab-border p-2 text-xs">
          <p className="mb-2 text-dark-muted">Projects in this pack</p>
          {projects.map((p) => (
            <label key={p.id} className="mb-1 flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.project_ids.includes(p.id)}
                onChange={() => toggleProject(p.id)}
              />
              <span>{p.title}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="submit" className="flex-1 border border-lab-cyan py-2 text-sm text-lab-cyan">
            {editId ? 'Update' : 'Create'}
          </button>
          {editId && (
            <button type="button" onClick={reset} className="border border-lab-border px-3 text-xs">
              Cancel
            </button>
          )}
        </div>
        {msg && <p className="text-xs text-lab-green">{msg}</p>}
      </form>

      <ul className="space-y-2">
        {packs.map((pack) => (
          <li key={pack.id} className="panel flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">{pack.name}</p>
              <p className="text-xs text-dark-muted">
                ${Number(pack.price).toFixed(2)} · {pack.project_count} projects
                {!pack.is_active && ' · inactive'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(pack)} className="text-xs text-lab-copper">
                Edit
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Delete pack?')) {
                    await adminDeletePack(pack.id)
                    await load()
                  }
                }}
                className="text-xs text-red-400"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
