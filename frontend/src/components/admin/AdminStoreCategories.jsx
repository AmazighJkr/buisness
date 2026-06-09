import { useState } from 'react'
import AdminField, { adminInputCls } from './AdminField.jsx'
import { boolFormValue, normalizeStoreSlug, safeInt, toStoreFormData } from './storeFormUtils.js'
import {
  adminCreateStoreCategory,
  adminDeleteStoreCategory,
  adminUpdateStoreCategory,
  validateUploadFile,
} from '../../api/client.js'
import { slugFromName } from '../../utils/slugFromName.js'

const EMPTY = {
  parent: '',
  name: '',
  slug: '',
  description: '',
  is_active: true,
  sort_order: 0,
}

export default function AdminStoreCategories({ categories, onReload, onMessage }) {
  const [form, setForm] = useState(EMPTY)
  const [image, setImage] = useState(null)
  const [editId, setEditId] = useState(null)
  const [slugAuto, setSlugAuto] = useState(true)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setForm(EMPTY)
    setImage(null)
    setEditId(null)
    setSlugAuto(true)
  }

  const save = async (e) => {
    e.preventDefault()
    onMessage('', '')
    const link = normalizeStoreSlug(form.slug || form.name)
    if (!form.name.trim()) {
      onMessage('error', 'Category name is required.')
      return
    }
    if (!link) {
      onMessage('error', 'Could not build a store link from that name.')
      return
    }
    const fileErr = validateUploadFile(image, 'Category image')
    if (fileErr) {
      onMessage('error', fileErr)
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: link,
        description: form.description,
        is_active: boolFormValue(form.is_active),
        sort_order: safeInt(form.sort_order, 0),
      }
      if (form.parent) payload.parent = form.parent
      else if (editId) payload.parent = ''
      const fd = toStoreFormData(payload, image)
      if (editId) await adminUpdateStoreCategory(editId, fd)
      else await adminCreateStoreCategory(fd)
      reset()
      await onReload()
      onMessage('success', editId ? 'Category updated.' : 'Category created.')
    } catch (err) {
      onMessage('error', err.message || 'Could not save category.')
    } finally {
      setSaving(false)
    }
  }

  const startEdit = (c) => {
    setEditId(c.id)
    setSlugAuto(false)
    setForm({
      parent: c.parent ? String(c.parent) : '',
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      is_active: !!c.is_active,
      sort_order: c.sort_order || 0,
    })
    setImage(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const topLevel = categories.filter((c) => !c.parent && c.id !== editId)

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="panel space-y-3 p-4" noValidate>
        <h3 className="border-b border-dark-border pb-2 text-sm font-semibold">
          {editId ? 'Edit store category' : 'New store category'}
        </h3>
        <AdminField label="Type" hint="Top-level = Embedded, PC Parts. Subcategory = Controllers, Sensors, …">
          <select
            value={form.parent}
            onChange={(e) => setForm((f) => ({ ...f, parent: e.target.value }))}
            className={adminInputCls}
          >
            <option value="">— Top level —</option>
            {topLevel.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </AdminField>
        <AdminField label="Category name" required>
          <input
            value={form.name}
            onChange={(e) => {
              const name = e.target.value
              setForm((f) => {
                const next = { ...f, name }
                if (slugAuto) next.slug = slugFromName(name)
                return next
              })
            }}
            className={adminInputCls}
          />
        </AdminField>
        <AdminField
          label="Store link"
          hint="Used in the shop sidebar filter, e.g. ?category=arduino"
          required
        >
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugAuto(false)
              setForm((f) => ({ ...f, slug: e.target.value }))
            }}
            className={adminInputCls}
          />
        </AdminField>
        <AdminField label="Description">
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className={adminInputCls}
          />
        </AdminField>
        <AdminField label="Sort order" hint="Lower = shown first">
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
            className={adminInputCls}
          />
        </AdminField>
        <AdminField label="Category image (optional)">
          <input
            type="file"
            accept="image/*"
            className="mt-1 block w-full text-xs"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </AdminField>
        <label className="flex items-center gap-2 text-sm text-dark-muted">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
          />
          Visible in store
        </label>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : editId ? 'Update category' : 'Save category'}
          </button>
          {editId && (
            <button type="button" onClick={reset} className="border border-dark-border px-3 text-xs">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-dark-muted">
          All categories ({categories.length})
        </h3>
        <ul className="max-h-[32rem] space-y-2 overflow-y-auto">
          {categories.map((c) => (
            <li key={c.id} className="panel flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-dark-muted">
                  {c.parent_name ? `${c.parent_name} → ` : ''}{c.slug} · {c.product_count ?? 0} products · {c.is_active ? 'active' : 'hidden'}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button type="button" onClick={() => startEdit(c)} className="text-xs text-lab-copper">
                  Edit
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!confirm(`Delete "${c.name}"?`)) return
                    try {
                      await adminDeleteStoreCategory(c.id)
                      await onReload()
                      onMessage('success', 'Category deleted.')
                    } catch (err) {
                      onMessage('error', err.message)
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
    </div>
  )
}
