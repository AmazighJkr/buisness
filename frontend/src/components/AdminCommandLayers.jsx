import { useEffect, useState } from 'react'
import {
  adminCreateCommandLayer,
  adminDeleteCommandLayer,
  adminFetchCommandLayers,
  adminUpdateCommandLayer,
} from '../api/client.js'

const GROUPS = [
  { value: 'firmware', label: 'Firmware & embedded' },
  { value: 'mobile', label: 'Mobile apps' },
  { value: 'cloud', label: 'Server & web' },
  { value: 'wireless', label: 'Wireless' },
]

const EMPTY = {
  slug: '',
  name: '',
  description: '',
  group: 'firmware',
  price_usd: '',
  price_dzd: '',
  is_required: false,
  is_active: true,
  sort_order: 0,
}

export default function AdminCommandLayers() {
  const [layers, setLayers] = useState([])
  const [form, setForm] = useState({ ...EMPTY })
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const load = () =>
    adminFetchCommandLayers()
      .then(setLayers)
      .catch((e) => setMsg({ type: 'error', text: e.message }))

  useEffect(() => {
    load()
  }, [])

  const reset = () => {
    setForm({ ...EMPTY })
    setEditId(null)
  }

  const startEdit = (layer) => {
    setEditId(layer.id)
    setForm({
      slug: layer.slug,
      name: layer.name,
      description: layer.description || '',
      group: layer.group || 'firmware',
      price_usd: String(layer.price_usd ?? ''),
      price_dzd: String(layer.price_dzd ?? ''),
      is_required: !!layer.is_required,
      is_active: layer.is_active !== false,
      sort_order: layer.sort_order || 0,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg({ type: '', text: '' })
    const body = {
      ...form,
      price_usd: Number(form.price_usd || 0),
      price_dzd: Number(form.price_dzd || 0),
      sort_order: Number(form.sort_order || 0),
    }
    try {
      if (editId) await adminUpdateCommandLayer(editId, body)
      else await adminCreateCommandLayer(body)
      setMsg({ type: 'success', text: editId ? 'Layer updated.' : 'Layer created.' })
      reset()
      await load()
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-sm font-medium">Command layers</h2>
        <p className="mt-1 text-xs text-dark-muted">
          Priced building blocks clients combine on Submit command. Required layers are always included.
        </p>
      </div>

      {msg.text && (
        <p className={`text-xs ${msg.type === 'error' ? 'text-red-400' : 'text-lab-green'}`}>{msg.text}</p>
      )}

      <form onSubmit={handleSubmit} className="panel space-y-3 p-4 text-xs">
        <h3 className="font-medium">{editId ? 'Edit layer' : 'New layer'}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            required
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="input-field"
          />
          <input
            placeholder="Slug (auto if empty)"
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            className="input-field"
          />
        </div>
        <textarea
          rows={2}
          placeholder="Description shown to clients"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          className="input-field resize-y"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <select
            value={form.group}
            onChange={(e) => setForm((f) => ({ ...f, group: e.target.value }))}
            className="input-field"
          >
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="USD"
            value={form.price_usd}
            onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))}
            className="input-field"
          />
          <input
            type="number"
            step="1"
            min="0"
            placeholder="DZD"
            value={form.price_dzd}
            onChange={(e) => setForm((f) => ({ ...f, price_dzd: e.target.value }))}
            className="input-field"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_required}
              onChange={(e) => setForm((f) => ({ ...f, is_required: e.target.checked }))}
            />
            Required (always included)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Active
          </label>
          <input
            type="number"
            min="0"
            placeholder="Sort order"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            className="w-24 input-field"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary text-xs">
            {editId ? 'Save' : 'Add layer'}
          </button>
          {editId && (
            <button type="button" onClick={reset} className="btn-secondary text-xs">
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="space-y-2 text-xs">
        {layers.map((layer) => (
          <li
            key={layer.id}
            className="flex flex-wrap items-center justify-between gap-2 border border-dark-border px-3 py-2"
          >
            <div>
              <span className="font-medium">{layer.name}</span>
              {!layer.is_active && <span className="ml-2 text-dark-muted">(inactive)</span>}
              {layer.is_required && <span className="ml-2 text-lab-cyan">required</span>}
              <p className="text-dark-muted">
                ${layer.price_usd} · {layer.price_dzd} DZD
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(layer)} className="text-lab-cyan">
                Edit
              </button>
              {!layer.is_required && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Delete "${layer.name}"?`)) return
                    await adminDeleteCommandLayer(layer.id)
                    await load()
                  }}
                  className="text-red-400"
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
