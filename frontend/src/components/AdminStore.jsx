import { useEffect, useMemo, useState } from 'react'
import {
  adminCreateStoreCategory,
  adminCreateStoreProduct,
  adminDeleteStoreCategory,
  adminDeleteStoreProduct,
  adminFetchStoreCategories,
  adminFetchStoreProducts,
  adminUpdateStoreCategory,
  adminUpdateStoreProduct,
  validateUploadFile,
} from '../api/client.js'

const EMPTY_CATEGORY = {
  name: '',
  slug: '',
  description: '',
  is_active: true,
  sort_order: 0,
}

const EMPTY_PRODUCT = {
  category: '',
  name: '',
  slug: '',
  short_description: '',
  description: '',
  price_usd: '0',
  price_dzd: '0',
  stock_qty: '0',
  is_active: true,
  is_featured: false,
  sort_order: '0',
}

function toFormData(body, image, imageKey = 'image') {
  const fd = new FormData()
  Object.entries(body).forEach(([k, v]) => {
    if (v === null || v === undefined) return
    fd.append(k, String(v))
  })
  if (image) fd.append(imageKey, image)
  return fd
}

export default function AdminStore() {
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState(null)
  const [editingProductId, setEditingProductId] = useState(null)
  const [categoryImage, setCategoryImage] = useState(null)
  const [productImage, setProductImage] = useState(null)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY)
  const [productForm, setProductForm] = useState(EMPTY_PRODUCT)

  const load = async () => {
    setLoading(true)
    try {
      const [c, p] = await Promise.all([adminFetchStoreCategories(), adminFetchStoreProducts()])
      setCategories(c)
      setProducts(p)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load().catch((e) => setMsg(e.message))
  }, [])

  const categoryOptions = useMemo(
    () => categories.filter((c) => c.is_active).sort((a, b) => a.name.localeCompare(b.name)),
    [categories],
  )

  const submitCategory = async (e) => {
    e.preventDefault()
    setMsg('')
    const err = validateUploadFile(categoryImage, 'Category image')
    if (err) {
      setMsg(err)
      return
    }
    const payload = {
      ...categoryForm,
      is_active: categoryForm.is_active ? 'true' : 'false',
      sort_order: Number(categoryForm.sort_order || 0),
    }
    const fd = toFormData(payload, categoryImage)
    try {
      if (editingCategoryId) await adminUpdateStoreCategory(editingCategoryId, fd)
      else await adminCreateStoreCategory(fd)
      setCategoryForm(EMPTY_CATEGORY)
      setCategoryImage(null)
      setEditingCategoryId(null)
      await load()
      setMsg('Category saved.')
    } catch (error) {
      setMsg(error.message)
    }
  }

  const submitProduct = async (e) => {
    e.preventDefault()
    setMsg('')
    const err = validateUploadFile(productImage, 'Product image')
    if (err) {
      setMsg(err)
      return
    }
    const payload = {
      ...productForm,
      price_usd: Number(productForm.price_usd || 0),
      price_dzd: Number(productForm.price_dzd || 0),
      stock_qty: Number(productForm.stock_qty || 0),
      sort_order: Number(productForm.sort_order || 0),
      is_active: productForm.is_active ? 'true' : 'false',
      is_featured: productForm.is_featured ? 'true' : 'false',
    }
    const fd = toFormData(payload, productImage)
    try {
      if (editingProductId) await adminUpdateStoreProduct(editingProductId, fd)
      else await adminCreateStoreProduct(fd)
      setProductForm(EMPTY_PRODUCT)
      setProductImage(null)
      setEditingProductId(null)
      await load()
      setMsg('Product saved.')
    } catch (error) {
      setMsg(error.message)
    }
  }

  const startEditCategory = (c) => {
    setEditingCategoryId(c.id)
    setCategoryForm({
      name: c.name || '',
      slug: c.slug || '',
      description: c.description || '',
      is_active: !!c.is_active,
      sort_order: c.sort_order || 0,
    })
    setCategoryImage(null)
  }

  const startEditProduct = (p) => {
    setEditingProductId(p.id)
    setProductForm({
      category: p.category || '',
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
    })
    setProductImage(null)
  }

  return (
    <div className="space-y-6">
      {msg && <p className="text-xs text-dark-muted">{msg}</p>}
      {loading && <p className="text-sm text-dark-muted animate-pulse">Loading store data...</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitCategory} className="panel space-y-3 p-4">
          <h3 className="text-sm font-medium">{editingCategoryId ? 'Edit category' : 'New category'}</h3>
          <input required placeholder="Name" value={categoryForm.name} onChange={(e) => setCategoryForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <input required placeholder="Slug" value={categoryForm.slug} onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <textarea rows={2} placeholder="Description" value={categoryForm.description} onChange={(e) => setCategoryForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <input type="number" placeholder="Sort order" value={categoryForm.sort_order} onChange={(e) => setCategoryForm((f) => ({ ...f, sort_order: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm((f) => ({ ...f, is_active: e.target.checked }))} />
            Active
          </label>
          <input type="file" accept="image/*" className="block w-full text-xs" onChange={(e) => setCategoryImage(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 border border-lab-cyan py-2 text-sm text-lab-cyan">Save category</button>
            {editingCategoryId && <button type="button" onClick={() => { setEditingCategoryId(null); setCategoryForm(EMPTY_CATEGORY); setCategoryImage(null) }} className="border border-dark-border px-3 text-xs">Cancel</button>}
          </div>
        </form>

        <form onSubmit={submitProduct} className="panel space-y-3 p-4">
          <h3 className="text-sm font-medium">{editingProductId ? 'Edit product' : 'New product'}</h3>
          <select required value={productForm.category} onChange={(e) => setProductForm((f) => ({ ...f, category: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm">
            <option value="">Category...</option>
            {categoryOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input required placeholder="Name" value={productForm.name} onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <input required placeholder="Slug" value={productForm.slug} onChange={(e) => setProductForm((f) => ({ ...f, slug: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <input placeholder="Short description" value={productForm.short_description} onChange={(e) => setProductForm((f) => ({ ...f, short_description: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <textarea rows={3} placeholder="Long description" value={productForm.description} onChange={(e) => setProductForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <div className="grid gap-2 sm:grid-cols-3">
            <input type="number" step="0.01" min="0" placeholder="USD" value={productForm.price_usd} onChange={(e) => setProductForm((f) => ({ ...f, price_usd: e.target.value }))} className="border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
            <input type="number" step="1" min="0" placeholder="DZD" value={productForm.price_dzd} onChange={(e) => setProductForm((f) => ({ ...f, price_dzd: e.target.value }))} className="border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
            <input type="number" min="0" placeholder="Stock qty" value={productForm.stock_qty} onChange={(e) => setProductForm((f) => ({ ...f, stock_qty: e.target.value }))} className="border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          </div>
          <input type="number" placeholder="Sort order" value={productForm.sort_order} onChange={(e) => setProductForm((f) => ({ ...f, sort_order: e.target.value }))} className="w-full border border-dark-border bg-dark-bg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm((f) => ({ ...f, is_active: e.target.checked }))} />Active</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={productForm.is_featured} onChange={(e) => setProductForm((f) => ({ ...f, is_featured: e.target.checked }))} />Featured</label>
          <input type="file" accept="image/*" className="block w-full text-xs" onChange={(e) => setProductImage(e.target.files?.[0] || null)} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 border border-lab-cyan py-2 text-sm text-lab-cyan">Save product</button>
            {editingProductId && <button type="button" onClick={() => { setEditingProductId(null); setProductForm(EMPTY_PRODUCT); setProductImage(null) }} className="border border-dark-border px-3 text-xs">Cancel</button>}
          </div>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase text-dark-muted">Categories</p>
          <ul className="space-y-2">
            {categories.map((c) => (
              <li key={c.id} className="panel flex items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-dark-muted">{c.slug} · {c.product_count || 0} products</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEditCategory(c)} className="text-xs text-lab-copper">Edit</button>
                  <button type="button" onClick={async () => { if (confirm('Delete category?')) { await adminDeleteStoreCategory(c.id); await load() } }} className="text-xs text-red-400">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase text-dark-muted">Products</p>
          <ul className="space-y-2">
            {products.map((p) => (
              <li key={p.id} className="panel flex items-center justify-between gap-2 p-3 text-sm">
                <div>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-dark-muted">{p.category_name} · ${Number(p.price_usd || 0).toFixed(2)} · stock {p.stock_qty}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => startEditProduct(p)} className="text-xs text-lab-copper">Edit</button>
                  <button type="button" onClick={async () => { if (confirm('Delete product?')) { await adminDeleteStoreProduct(p.id); await load() } }} className="text-xs text-red-400">Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
