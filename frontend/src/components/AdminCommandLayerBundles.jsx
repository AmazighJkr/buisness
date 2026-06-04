import { useEffect, useState } from 'react'
import {
  adminCreateCommandLayerBundle,
  adminDeleteCommandLayerBundle,
  adminFetchCommandLayerBundles,
  adminFetchCommandLayers,
  adminUpdateCommandLayerBundle,
} from '../api/client.js'

const EMPTY = {
  slug: '',
  name: '',
  description: '',
  layer_ids: [],
  is_active: true,
  sort_order: 0,
}

export default function AdminCommandLayerBundles() {
  const [bundles, setBundles] = useState([])
  const [layers, setLayers] = useState([])
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const load = () =>
    Promise.all([adminFetchCommandLayerBundles(), adminFetchCommandLayers()])
      .then(([b, l]) => {
        setBundles(b)
        setLayers(l)
      })
      .catch((e) => setMsg({ type: 'error', text: e.message }))

  useEffect(() => {
    load()
  }, [])

  const reset = () => {
    setForm({ ...EMPTY, layer_ids: [] })
    setEditId(null)
  }

  const toggleLayer = (id) => {
    setForm((f) => {
      const set = new Set(f.layer_ids)
      if (set.has(id)) set.delete(id)
      else set.add(id)
      return { ...f, layer_ids: [...set] }
    })
  }

  const save = async (e) => {
    e.preventDefault()
    const body = {
      ...form,
      sort_order: Number(form.sort_order) || 0,
      layer_ids: form.layer_ids,
    }
    try {
      if (editId) {
        await adminUpdateCommandLayerBundle(editId, body)
        setMsg({ type: 'ok', text: 'Bundle updated.' })
      } else {
        await adminCreateCommandLayerBundle(body)
        setMsg({ type: 'ok', text: 'Bundle created.' })
      }
      reset()
      load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  const startEdit = (b) => {
    setEditId(b.id)
    setForm({
      slug: b.slug,
      name: b.name,
      description: b.description || '',
      layer_ids: [...(b.layer_ids || [])],
      is_active: b.is_active !== false,
      sort_order: b.sort_order || 0,
    })
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this bundle?')) return
    try {
      await adminDeleteCommandLayerBundle(id)
      if (editId === id) reset()
      load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {msg.text && (
        <p
          className={`rounded px-3 py-2 text-sm ${
            msg.type === 'error' ? 'text-red-300 border border-red-500/50' : 'text-lab-green'
          }`}
        >
          {msg.text}
        </p>
      )}

      <form onSubmit={save} className="panel space-y-3 p-4 text-sm">
        <h3 className="font-semibold">{editId ? 'Edit bundle' : 'New recommended bundle'}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-dark-muted">
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5"
            />
          </label>
          <label className="block text-xs text-dark-muted">
            Slug
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 font-mono"
            />
          </label>
        </div>
        <label className="block text-xs text-dark-muted">
          Description
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5"
          />
        </label>
        <fieldset>
          <legend className="text-xs text-dark-muted mb-2">Layers in this preset</legend>
          <div className="flex flex-wrap gap-2">
            {layers.map((layer) => {
              const on = form.layer_ids.includes(layer.id)
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => toggleLayer(layer.id)}
                  className={`rounded border px-2 py-1 text-xs ${
                    on ? 'border-lab-cyan bg-lab-cyan/10' : 'border-dark-border'
                  }`}
                >
                  {layer.name}
                </button>
              )
            })}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active on command form
        </label>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-sm">
            {editId ? 'Save' : 'Create'}
          </button>
          {editId && (
            <button type="button" onClick={reset} className="btn-secondary text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="space-y-2 text-sm">
        {bundles.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 border border-dark-border p-3">
            <div>
              <p className="font-medium">{b.name}</p>
              <p className="text-xs text-dark-muted font-mono">{b.slug}</p>
              <p className="text-xs text-dark-muted mt-1">
                {(b.layer_ids || []).length} layer(s)
                {!b.is_active && ' · inactive'}
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(b)} className="text-lab-cyan text-xs">
                Edit
              </button>
              <button type="button" onClick={() => remove(b.id)} className="text-red-400 text-xs">
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
