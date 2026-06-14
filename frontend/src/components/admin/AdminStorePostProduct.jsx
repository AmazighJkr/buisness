import { useState } from 'react'
import AdminField, { adminInputCls } from './AdminField.jsx'
import {
  boolFormValue,
  categoryId,
  normalizeStoreSlug,
  safeInt,
  safeMoney,
  toStoreFormData,
} from './storeFormUtils.js'
import { adminAddProductGallery, adminCreateStoreProduct, validateUploadFile } from '../../api/client.js'
import RichTextEditor from '../RichTextEditor.jsx'
import { slugFromName } from '../../utils/slugFromName.js'

const EMPTY_VARIANT = { name: '', description: '', image: null }

const EMPTY = {
  parentCategory: '',
  subcategory: '',
  name: '',
  slug: '',
  short_description: '',
  description: '',
  price_usd: '0',
  price_dzd: '0',
  stock_qty: '1',
  is_active: true,
  is_featured: false,
  sort_order: '0',
}

export default function AdminStorePostProduct({ categories, onReload, onMessage, onGoManage }) {
  const [form, setForm] = useState(EMPTY)
  const [mainImage, setMainImage] = useState(null)
  const [galleryFiles, setGalleryFiles] = useState([])
  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }])
  const [slugAuto, setSlugAuto] = useState(true)
  const [saving, setSaving] = useState(false)

  const topCategories = [...categories].filter((c) => !c.parent).sort((a, b) => a.name.localeCompare(b.name))
  const subcategories = [...categories]
    .filter((c) => String(c.parent) === String(form.parentCategory))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))

  const reset = () => {
    setForm(EMPTY)
    setMainImage(null)
    setGalleryFiles([])
    setVariants([{ ...EMPTY_VARIANT }])
    setSlugAuto(true)
  }

  const save = async (e) => {
    e.preventDefault()
    onMessage('', '')

    if (!topCategories.length) {
      onMessage('error', 'Create at least one top-level category first (Categories tab).')
      return
    }
    if (!form.parentCategory) {
      onMessage('error', 'Choose a top-level category.')
      return
    }
    const categoryIdValue = form.subcategory || (subcategories.length ? '' : form.parentCategory)
    if (!categoryIdValue) {
      onMessage('error', 'Choose a subcategory.')
      return
    }
    if (!form.name.trim()) {
      onMessage('error', 'Product name is required.')
      return
    }
    const link = normalizeStoreSlug(form.slug || form.name)
    if (!link) {
      onMessage('error', 'Product page link is invalid — use letters and numbers in the name.')
      return
    }

    for (const file of [mainImage, ...galleryFiles].filter(Boolean)) {
      const err = validateUploadFile(file, 'Image')
      if (err) {
        onMessage('error', err)
        return
      }
    }

    setSaving(true)
    try {
      const payload = {
        category: categoryId(categoryIdValue),
        name: form.name.trim(),
        slug: link,
        short_description: form.short_description,
        description: form.description,
        price_usd: safeMoney(form.price_usd).toFixed(2),
        price_dzd: safeMoney(form.price_dzd).toFixed(2),
        stock_qty: safeInt(form.stock_qty, 0),
        sort_order: safeInt(form.sort_order, 0),
        is_active: boolFormValue(form.is_active),
        is_featured: boolFormValue(form.is_featured),
      }
      const fd = toStoreFormData(payload, mainImage)
      const variantRows = variants
        .map((v, index) => ({
          name: (v.name || '').trim(),
          description: (v.description || '').trim(),
          sort_order: index,
        }))
        .filter((v) => v.name)
      if (variantRows.length) {
        fd.append('variants_json', JSON.stringify(variantRows))
        variants.forEach((v, index) => {
          if (v.image) fd.append(`variant_image_${index}`, v.image)
        })
      }
      const created = await adminCreateStoreProduct(fd)
      if (galleryFiles.length > 0 && created?.id) {
        await adminAddProductGallery(created.id, galleryFiles)
      }
      reset()
      await onReload()
      onMessage('success', `Product "${created.name}" saved. You can edit prices and stock under Manage products.`)
      onGoManage?.()
    } catch (err) {
      onMessage('error', err.message || 'Could not save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="panel max-w-2xl space-y-3 p-4" noValidate>
      <h3 className="border-b border-dark-border pb-2 text-sm font-semibold">Post a new product</h3>

      {!topCategories.length && (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          No categories yet. Open the <strong>Categories</strong> tab and create one first.
        </p>
      )}

      <AdminField label="Top-level category" required hint="e.g. Embedded, PC Parts">
        <select
          value={form.parentCategory}
          onChange={(e) => setForm((f) => ({ ...f, parentCategory: e.target.value, subcategory: '' }))}
          className={adminInputCls}
        >
          <option value="">Select category…</option>
          {topCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </AdminField>

      {form.parentCategory && subcategories.length > 0 && (
        <AdminField label="Subcategory" required hint="e.g. Controllers, Sensors">
          <select
            value={form.subcategory}
            onChange={(e) => setForm((f) => ({ ...f, subcategory: e.target.value }))}
            className={adminInputCls}
          >
            <option value="">Select subcategory…</option>
            {subcategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </AdminField>
      )}

      <AdminField label="Product name" required>
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

      <AdminField label="Product page link" hint={`Store URL: /shop/${form.slug || '…'}`}>
        <input
          value={form.slug}
          onChange={(e) => {
            setSlugAuto(false)
            setForm((f) => ({ ...f, slug: e.target.value }))
          }}
          className={adminInputCls}
        />
      </AdminField>

      <AdminField label="Short description" hint="Shown under the title on the product page">
        <textarea
          rows={2}
          value={form.short_description}
          onChange={(e) => setForm((f) => ({ ...f, short_description: e.target.value }))}
          className={adminInputCls}
        />
      </AdminField>

      <AdminField label="Full description">
        <RichTextEditor
          value={form.description}
          onChange={(description) => setForm((f) => ({ ...f, description }))}
          placeholder="Titles, lists, emojis, details…"
          minHeight="12rem"
        />
      </AdminField>

      <div className="grid gap-3 sm:grid-cols-3">
        <AdminField label="Price USD">
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.price_usd}
            onChange={(e) => setForm((f) => ({ ...f, price_usd: e.target.value }))}
            className={adminInputCls}
          />
        </AdminField>
        <AdminField label="Price DZD">
          <input
            type="number"
            step="1"
            min="0"
            value={form.price_dzd}
            onChange={(e) => setForm((f) => ({ ...f, price_dzd: e.target.value }))}
            className={adminInputCls}
          />
        </AdminField>
        <AdminField label="Stock quantity">
          <input
            type="number"
            min="0"
            value={form.stock_qty}
            onChange={(e) => setForm((f) => ({ ...f, stock_qty: e.target.value }))}
            className={adminInputCls}
          />
        </AdminField>
      </div>

      <AdminField label="Main photo">
        <input
          type="file"
          accept="image/*"
          className="mt-1 block w-full text-xs"
          onChange={(e) => setMainImage(e.target.files?.[0] || null)}
        />
      </AdminField>

      <AdminField label="Extra photos" hint="Hold Ctrl (or Cmd) to select multiple images">
        <input
          type="file"
          accept="image/*"
          multiple
          className="mt-1 block w-full text-xs"
          onChange={(e) => setGalleryFiles(Array.from(e.target.files || []))}
        />
        {galleryFiles.length > 0 && (
          <p className="mt-1 text-[10px] text-lab-cyan">{galleryFiles.length} file(s) selected</p>
        )}
      </AdminField>

      <AdminField label="Product models / variants" hint="Optional — name and short note per model (e.g. Uno R3, Nano)">
        <div className="space-y-2">
          {variants.map((v, index) => (
            <div key={index} className="flex flex-wrap gap-2">
              <input
                placeholder="Model name"
                value={v.name}
                onChange={(e) => {
                  const name = e.target.value
                  setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, name } : row)))
                }}
                className="min-w-[8rem] flex-1 border border-dark-border bg-dark-bg px-2 py-1 text-sm"
              />
              <input
                placeholder="Note (e.g. I2C, male/female)"
                value={v.description}
                onChange={(e) => {
                  const description = e.target.value
                  setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, description } : row)))
                }}
                className="min-w-[10rem] flex-[2] border border-dark-border bg-dark-bg px-2 py-1 text-sm"
              />
              <label className="cursor-pointer border border-dark-border px-2 py-1 text-xs text-lab-cyan">
                {v.image ? v.image.name : 'Image'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const image = e.target.files?.[0] || null
                    setVariants((rows) => rows.map((row, i) => (i === index ? { ...row, image } : row)))
                  }}
                />
              </label>
              {variants.length > 1 && (
                <button
                  type="button"
                  className="text-xs text-red-400"
                  onClick={() => setVariants((rows) => rows.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="text-xs text-lab-cyan"
            onClick={() => setVariants((rows) => [...rows, { ...EMPTY_VARIANT }])}
          >
            + Add model
          </button>
        </div>
      </AdminField>

      <label className="flex items-center gap-2 text-sm text-dark-muted">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
        />
        Listed in store
      </label>
      <label className="flex items-center gap-2 text-sm text-dark-muted">
        <input
          type="checkbox"
          checked={form.is_featured}
          onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))}
        />
        Featured product
      </label>

      <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
        {saving ? 'Saving product…' : 'Save product'}
      </button>
    </form>
  )
}
