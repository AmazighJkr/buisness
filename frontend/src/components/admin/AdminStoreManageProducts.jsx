import { useMemo, useState } from 'react'
import AdminField, { adminInputCls } from './AdminField.jsx'
import {
  boolFormValue,
  categoryId,
  normalizeStoreSlug,
  safeInt,
  safeMoney,
  toStoreFormData,
} from './storeFormUtils.js'

import {
  adminAddProductGallery,
  adminDeleteProductGalleryImage,
  adminDeleteStoreProduct,
  adminPatchStoreProduct,
  adminUpdateStoreProduct,
  validateUploadFile,
} from '../../api/client.js'
import RichTextEditor from '../RichTextEditor.jsx'
const EMPTY_VARIANT = { name: '', description: '', price_usd: '', price_dzd: '', image: null, image_url: '' }
function rowFromProduct(p) {
  return {
    name: p.name || '',
    price_usd: String(p.price_usd ?? 0),
    price_dzd: String(p.price_dzd ?? 0),
    stock_qty: String(p.stock_qty ?? 0),
    is_active: !!p.is_active,
  }
}

export default function AdminStoreManageProducts({ categories, products, onReload, onMessage }) {
  const [query, setQuery] = useState('')
  const [rows, setRows] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [fullEditId, setFullEditId] = useState(null)
  const [fullForm, setFullForm] = useState(null)
  const [fullImage, setFullImage] = useState(null)
  const [fullGallery, setFullGallery] = useState([])
  const [fullSaving, setFullSaving] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category_name?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q),
    )
  }, [products, query])

  const getRow = (p) => rows[p.id] || rowFromProduct(p)

  const setRow = (id, patch) => {
    const product = products.find((x) => x.id === id)
    setRows((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || rowFromProduct(product)), ...patch },
    }))
  }

  const saveQuick = async (p) => {
    const row = getRow(p)
    onMessage('', '')
    if (!row.name.trim()) {
      onMessage('error', 'Product name cannot be empty.')
      return
    }
    setSavingId(p.id)
    try {
      await adminPatchStoreProduct(p.id, {
        name: row.name.trim(),
        price_usd: Number(row.price_usd || 0),
        price_dzd: Number(row.price_dzd || 0),
        stock_qty: Number(row.stock_qty || 0),
        is_active: row.is_active,
      })
      await onReload()
      onMessage('success', `Updated "${row.name.trim()}".`)
    } catch (err) {
      onMessage('error', err.message || 'Update failed.')
    } finally {
      setSavingId(null)
    }
  }

  const openFullEdit = (p) => {
    const cat = categories.find((c) => String(c.id) === String(p.category))
    setFullEditId(p.id)
    setFullForm({
      parentCategory: cat?.parent ? String(cat.parent) : String(cat?.id || ''),
      subcategory: cat?.parent ? String(cat.id) : '',
      name: p.name || '',
      slug: p.slug || '',
      short_description: p.short_description || '',
      description: p.description || '',
      price_usd: String(p.price_usd ?? 0),
      price_dzd: String(p.price_dzd ?? 0),
      stock_qty: String(p.stock_qty ?? 0),
      is_active: !!p.is_active,
      is_featured: !!p.is_featured,
      sort_order: String(p.sort_order ?? 0),
      gallery: p.gallery || [],
      variants: (p.variants?.length ? p.variants : [{ ...EMPTY_VARIANT }]).map((v) => ({
        name: v.name || '',
        description: v.description || '',
        price_usd: v.price_usd != null ? String(v.price_usd) : '',
        price_dzd: v.price_dzd != null ? String(v.price_dzd) : '',
        image: null,
        image_url: v.image_url || '',
      })),
    })
    setFullImage(null)
    setFullGallery([])
  }

  const saveFull = async (e) => {
    e.preventDefault()
    if (!fullForm || !fullEditId) return
    onMessage('', '')
    const link = normalizeStoreSlug(fullForm.slug || fullForm.name)
    const subs = categories.filter((c) => String(c.parent) === String(fullForm.parentCategory))
    const categoryIdValue = fullForm.subcategory || (subs.length ? '' : fullForm.parentCategory)
    if (!fullForm.parentCategory || !categoryIdValue || !fullForm.name.trim() || !link) {
      onMessage('error', 'Category, subcategory, name, and link are required.')
      return
    }
    for (const file of [fullImage, ...fullGallery].filter(Boolean)) {
      const err = validateUploadFile(file, 'Image')
      if (err) {
        onMessage('error', err)
        return
      }
    }
    setFullSaving(true)
    try {
      const payload = {
        category: categoryId(categoryIdValue),
        name: fullForm.name.trim(),
        slug: link,
        short_description: fullForm.short_description,
        description: fullForm.description,
        price_usd: safeMoney(fullForm.price_usd).toFixed(2),
        price_dzd: safeMoney(fullForm.price_dzd).toFixed(2),
        stock_qty: safeInt(fullForm.stock_qty, 0),
        sort_order: safeInt(fullForm.sort_order, 0),
        is_active: boolFormValue(fullForm.is_active),
        is_featured: boolFormValue(fullForm.is_featured),
      }
      const fd = toStoreFormData(payload, fullImage)
      const variantRows = (fullForm.variants || [])
        .map((v, index) => ({
          name: (v.name || '').trim(),
          description: (v.description || '').trim(),
          price_usd: v.price_usd === '' || v.price_usd == null ? null : String(v.price_usd),
          price_dzd: v.price_dzd === '' || v.price_dzd == null ? null : String(v.price_dzd),
          sort_order: index,
        }))
        .filter((v) => v.name)
      fd.append('variants_json', JSON.stringify(variantRows))
      ;(fullForm.variants || []).forEach((v, index) => {
        if (v.image) fd.append(`variant_image_${index}`, v.image)
      })
      await adminUpdateStoreProduct(fullEditId, fd)
      if (fullGallery.length > 0) {
        await adminAddProductGallery(fullEditId, fullGallery)
      }
      setFullEditId(null)
      setFullForm(null)
      await onReload()
      onMessage('success', 'Product updated.')
    } catch (err) {
      onMessage('error', err.message || 'Could not update product.')
    } finally {
      setFullSaving(false)
    }
  }

  const topCategories = [...categories].filter((c) => !c.parent).sort((a, b) => a.name.localeCompare(b.name))
  const fullSubcategories = fullForm
    ? categories.filter((c) => String(c.parent) === String(fullForm.parentCategory))
    : []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <AdminField label="Search products">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, category, link…"
            className={adminInputCls}
          />
        </AdminField>
        <p className="text-xs text-dark-muted pb-2">{filtered.length} product(s)</p>
      </div>

      <div className="overflow-x-auto border border-dark-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-dark-panel text-xs uppercase text-dark-muted">
            <tr>
              <th className="p-2">Name</th>
              <th className="p-2 w-24">USD</th>
              <th className="p-2 w-28">DZD</th>
              <th className="p-2 w-20">Stock</th>
              <th className="p-2 w-16">Live</th>
              <th className="p-2 w-40">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const row = getRow(p)
              return (
                <tr key={p.id} className="border-t border-dark-border align-top">
                  <td className="p-2">
                    <input
                      value={row.name}
                      onChange={(e) => setRow(p.id, { name: e.target.value })}
                      className="w-full min-w-[8rem] border border-dark-border bg-dark-bg px-2 py-1 text-sm"
                    />
                    <p className="mt-0.5 text-[10px] text-dark-muted">{p.category_name}</p>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.price_usd}
                      onChange={(e) => setRow(p.id, { price_usd: e.target.value })}
                      className="w-full border border-dark-border bg-dark-bg px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      value={row.price_dzd}
                      onChange={(e) => setRow(p.id, { price_dzd: e.target.value })}
                      className="w-full border border-dark-border bg-dark-bg px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min="0"
                      value={row.stock_qty}
                      onChange={(e) => setRow(p.id, { stock_qty: e.target.value })}
                      className="w-full border border-dark-border bg-dark-bg px-2 py-1 text-sm"
                    />
                  </td>
                  <td className="p-2 text-center">
                    <input
                      type="checkbox"
                      checked={row.is_active}
                      onChange={(e) => setRow(p.id, { is_active: e.target.checked })}
                    />
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        disabled={savingId === p.id}
                        onClick={() => saveQuick(p)}
                        className="rounded border border-lab-cyan px-2 py-1 text-xs text-lab-cyan"
                      >
                        {savingId === p.id ? '…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        onClick={() => openFullEdit(p)}
                        className="rounded border border-dark-border px-2 py-1 text-xs"
                      >
                        Full edit
                      </button>
                      <a
                        href={`/shop/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border border-dark-border px-2 py-1 text-xs text-lab-cyan"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(`Delete "${p.name}"?`)) return
                          try {
                            await adminDeleteStoreProduct(p.id)
                            await onReload()
                            onMessage('success', 'Product deleted.')
                          } catch (err) {
                            onMessage('error', err.message)
                          }
                        }}
                        className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-400"
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-dark-muted">No products yet. Use Add product tab.</p>
        )}
      </div>

      {fullForm && fullEditId && (
        <form onSubmit={saveFull} className="panel space-y-3 p-4" noValidate>
          <div className="flex items-center justify-between border-b border-dark-border pb-2">
            <h3 className="text-sm font-semibold">Full edit — {fullForm.name}</h3>
            <button type="button" onClick={() => { setFullEditId(null); setFullForm(null) }} className="text-xs text-dark-muted">
              Close
            </button>
          </div>
          <AdminField label="Top-level category" required>
            <select
              value={fullForm.parentCategory}
              onChange={(e) => setFullForm((f) => ({ ...f, parentCategory: e.target.value, subcategory: '' }))}
              className={adminInputCls}
            >
              {topCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </AdminField>
          {fullSubcategories.length > 0 && (
            <AdminField label="Subcategory" required>
              <select
                value={fullForm.subcategory}
                onChange={(e) => setFullForm((f) => ({ ...f, subcategory: e.target.value }))}
                className={adminInputCls}
              >
                <option value="">Select subcategory…</option>
                {fullSubcategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </AdminField>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField label="Name">
              <input
                value={fullForm.name}
                onChange={(e) => setFullForm((f) => ({ ...f, name: e.target.value }))}
                className={adminInputCls}
              />
            </AdminField>
            <AdminField label="Page link">
              <input
                value={fullForm.slug}
                onChange={(e) => setFullForm((f) => ({ ...f, slug: e.target.value }))}
                className={adminInputCls}
              />
            </AdminField>
          </div>
          <AdminField label="Short description">
            <textarea
              rows={2}
              value={fullForm.short_description}
              onChange={(e) => setFullForm((f) => ({ ...f, short_description: e.target.value }))}
              className={adminInputCls}
            />
          </AdminField>
          <AdminField label="Full description">
            <RichTextEditor
              value={fullForm.description}
              onChange={(description) => setFullForm((f) => ({ ...f, description }))}
              minHeight="12rem"
            />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminField label="USD">
              <input type="number" step="0.01" value={fullForm.price_usd} onChange={(e) => setFullForm((f) => ({ ...f, price_usd: e.target.value }))} className={adminInputCls} />
            </AdminField>
            <AdminField label="DZD">
              <input type="number" step="1" value={fullForm.price_dzd} onChange={(e) => setFullForm((f) => ({ ...f, price_dzd: e.target.value }))} className={adminInputCls} />
            </AdminField>
            <AdminField label="Stock">
              <input type="number" min="0" value={fullForm.stock_qty} onChange={(e) => setFullForm((f) => ({ ...f, stock_qty: e.target.value }))} className={adminInputCls} />
            </AdminField>
          </div>
          <AdminField label="Product models / variants">
            <div className="space-y-2">
              {(fullForm.variants || []).map((v, index) => (
                <div key={index} className="grid gap-2 border border-dark-border p-2 sm:grid-cols-2">
                  <input
                    placeholder="Model name"
                    value={v.name}
                    onChange={(e) => {
                      const name = e.target.value
                      setFullForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, i) => (i === index ? { ...row, name } : row)),
                      }))
                    }}
                    className="min-w-0 border border-dark-border bg-dark-bg px-2 py-1 text-sm sm:col-span-2"
                  />
                  <input
                    placeholder="Note (optional)"
                    value={v.description}
                    onChange={(e) => {
                      const description = e.target.value
                      setFullForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, i) => (i === index ? { ...row, description } : row)),
                      }))
                    }}
                    className="min-w-0 border border-dark-border bg-dark-bg px-2 py-1 text-sm sm:col-span-2"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Price USD (optional)"
                    value={v.price_usd}
                    onChange={(e) => {
                      const price_usd = e.target.value
                      setFullForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, i) => (i === index ? { ...row, price_usd } : row)),
                      }))
                    }}
                    className="min-w-0 border border-dark-border bg-dark-bg px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="Price DZD (optional)"
                    value={v.price_dzd}
                    onChange={(e) => {
                      const price_dzd = e.target.value
                      setFullForm((f) => ({
                        ...f,
                        variants: f.variants.map((row, i) => (i === index ? { ...row, price_dzd } : row)),
                      }))
                    }}
                    className="min-w-0 border border-dark-border bg-dark-bg px-2 py-1 text-sm"
                  />
                  <label className="cursor-pointer border border-dark-border px-2 py-1 text-xs text-lab-cyan sm:col-span-2">
                    {v.image ? v.image.name : v.image_url ? 'Replace image' : 'Model image (optional)'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const image = e.target.files?.[0] || null
                        setFullForm((f) => ({
                          ...f,
                          variants: f.variants.map((row, i) => (i === index ? { ...row, image } : row)),
                        }))
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {v.image_url && !v.image && (
                    <img src={v.image_url} alt="" className="h-8 w-8 rounded object-cover sm:col-span-2" />
                  )}
                  {fullForm.variants.length > 1 && (
                    <button
                      type="button"
                      className="text-xs text-red-400 sm:col-span-2 text-left"
                      onClick={() => setFullForm((f) => ({
                        ...f,
                        variants: f.variants.filter((_, i) => i !== index),
                      }))}
                    >
                      Remove model
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="text-xs text-lab-cyan"
                onClick={() => setFullForm((f) => ({
                  ...f,
                  variants: [...(f.variants || []), { ...EMPTY_VARIANT }],
                }))}
              >
                + Add model
              </button>
            </div>
          </AdminField>
          <AdminField label="Replace main photo" hint="Selected file uploads when you click Save full edit">
            <input
              type="file"
              accept="image/*"
              className="mt-1 block w-full text-xs"
              onChange={(e) => {
                setFullImage(e.target.files?.[0] || null)
                e.target.value = ''
              }}
            />
            {fullImage && (
              <p className="mt-1 text-[10px] text-lab-cyan">
                Ready to upload: {fullImage.name} ({(fullImage.size / 1024).toFixed(0)} KB)
              </p>
            )}
          </AdminField>
          <AdminField label="Add gallery photos" hint="New photos upload when you click Save full edit">
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-1 block w-full text-xs"
              onChange={(e) => {
                setFullGallery(Array.from(e.target.files || []))
                e.target.value = ''
              }}
            />
            {fullGallery.length > 0 && (
              <p className="mt-1 text-[10px] text-lab-cyan">
                {fullGallery.length} new photo(s) selected — click Save full edit to apply
              </p>
            )}
          </AdminField>
          {fullForm.gallery?.length > 0 && (
            <div>
              <p className="mb-2 text-xs text-dark-muted">Gallery</p>
              <ul className="flex flex-wrap gap-2">
                {fullForm.gallery.map((img) => (
                  <li key={img.id} className="relative">
                    <img src={img.image_url} alt="" className="h-14 w-14 object-cover rounded border border-dark-border" />
                    <button
                      type="button"
                      className="absolute -right-1 -top-1 rounded bg-red-600 px-1 text-[10px] text-white"
                      onClick={async () => {
                        if (!confirm('Remove photo?')) return
                        await adminDeleteProductGalleryImage(fullEditId, img.id)
                        setFullForm((f) => ({
                          ...f,
                          gallery: f.gallery.filter((g) => g.id !== img.id),
                        }))
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-[10px] text-dark-muted">
            Edit everything below, then save once — images are not uploaded until you click the button.
          </p>
          <button type="submit" disabled={fullSaving} className="btn-primary">
            {fullSaving ? 'Saving…' : 'Save full edit'}
          </button>
        </form>
      )}
    </div>
  )
}
