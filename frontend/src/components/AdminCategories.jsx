import { useEffect, useState } from 'react'
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminFetchCategories,
  adminUpdateCategory,
} from '../api/client.js'

export default function AdminCategories() {
  const [list, setList] = useState([])
  const [name, setName] = useState('')
  const [parent, setParent] = useState('')
  const [sortOrder, setSortOrder] = useState(0)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')

  const load = () => adminFetchCategories().then(setList).catch(() => [])

  useEffect(() => {
    load()
  }, [])

  const topLevel = list.filter((c) => !c.parent)
  const subcats = list.filter((c) => c.parent)

  const reset = () => {
    setName('')
    setParent('')
    setSortOrder(0)
    setEditId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg('')
    try {
      const body = {
        name,
        parent: parent || null,
        sort_order: Number(sortOrder) || 0,
      }
      if (editId) {
        await adminUpdateCategory(editId, body)
        setMsg('Category updated.')
      } else {
        await adminCreateCategory(body)
        setMsg('Category created.')
      }
      reset()
      load()
    } catch (err) {
      setMsg(err.message)
    }
  }

  const startEdit = (c) => {
    setEditId(c.id)
    setName(c.name)
    setParent(c.parent || '')
    setSortOrder(c.sort_order || 0)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <form onSubmit={handleSubmit} className="panel space-y-3 p-4" autoComplete="off">
        <h3 className="text-sm font-medium">{editId ? 'Edit category' : 'New category'}</h3>
        <input
          required
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
        />
        <select
          value={parent}
          onChange={(e) => setParent(e.target.value)}
          className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
        >
          <option value="">Top-level category (e.g. Arduino)</option>
          {topLevel.map((c) => (
            <option key={c.id} value={c.id}>
              Sub of: {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Sort order"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button type="submit" className="border border-theme-border px-4 py-2 text-sm">
            {editId ? 'Update' : 'Create'}
          </button>
          {editId && (
            <button type="button" onClick={reset} className="text-sm text-dark-muted">
              Cancel
            </button>
          )}
        </div>
        {msg && <p className="text-xs text-dark-muted">{msg}</p>}
      </form>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs uppercase text-dark-muted">Top-level</p>
          <ul className="space-y-2">
            {topLevel.map((c) => (
              <li key={c.id} className="panel flex justify-between px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => startEdit(c)} className="text-dark-muted hover:text-dark-text">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Delete?')) {
                        await adminDeleteCategory(c.id)
                        load()
                      }
                    }}
                    className="text-dark-muted hover:text-dark-text"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase text-dark-muted">Subcategories</p>
          <ul className="space-y-2">
            {subcats.map((c) => (
              <li key={c.id} className="panel flex justify-between px-3 py-2 text-sm">
                <span>
                  {c.parent_name} → {c.name}
                </span>
                <span className="flex gap-2">
                  <button type="button" onClick={() => startEdit(c)} className="text-dark-muted hover:text-dark-text">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm('Delete?')) {
                        await adminDeleteCategory(c.id)
                        load()
                      }
                    }}
                    className="text-dark-muted hover:text-dark-text"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
