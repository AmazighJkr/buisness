import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from '../../context/LocaleContext.jsx'
import {
  adminCreatePostalCode,
  adminDeletePostalCode,
  adminFetchPostalCodes,
  adminFetchWilayas,
  adminUpdatePostalCode,
} from '../../api/client.js'

const emptyForm = {
  wilaya: '',
  postal_code: '',
  city: '',
  price_home_dzd: '',
  price_bureau_dzd: '',
  is_active: true,
}

export default function AdminShippingPostal({ onMessage }) {
  const { t } = useTranslation()
  const [wilayas, setWilayas] = useState([])
  const [rows, setRows] = useState([])
  const [filterWilaya, setFilterWilaya] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [w, postal] = await Promise.all([
        adminFetchWilayas(),
        adminFetchPostalCodes({ wilaya: filterWilaya, q: search }),
      ])
      setWilayas(w)
      setRows(postal)
    } catch (err) {
      onMessage?.('error', err.message)
    } finally {
      setLoading(false)
    }
  }, [filterWilaya, search, onMessage])

  useEffect(() => {
    load()
  }, [load])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (row) => {
    setEditingId(row.id)
    setForm({
      wilaya: row.wilaya,
      postal_code: row.postal_code,
      city: row.city || '',
      price_home_dzd: row.price_home_dzd ?? '',
      price_bureau_dzd: row.price_bureau_dzd ?? '',
      is_active: row.is_active,
    })
  }

  const save = async (e) => {
    e.preventDefault()
    const body = {
      wilaya: form.wilaya,
      postal_code: form.postal_code.trim(),
      city: form.city.trim(),
      is_active: form.is_active,
      price_home_dzd: form.price_home_dzd === '' ? null : Number(form.price_home_dzd),
      price_bureau_dzd: form.price_bureau_dzd === '' ? null : Number(form.price_bureau_dzd),
    }
    try {
      if (editingId) {
        await adminUpdatePostalCode(editingId, body)
        onMessage?.('ok', t('adminStore.postalUpdated'))
      } else {
        await adminCreatePostalCode(body)
        onMessage?.('ok', t('adminStore.postalAdded'))
      }
      resetForm()
      load()
    } catch (err) {
      onMessage?.('error', err.message)
    }
  }

  const remove = async (id) => {
    if (!window.confirm(t('adminStore.confirmDeletePostal'))) return
    try {
      await adminDeletePostalCode(id)
      onMessage?.('ok', t('adminStore.deleted'))
      if (editingId === id) resetForm()
      load()
    } catch (err) {
      onMessage?.('error', err.message)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-dark-muted">{t('adminStore.shippingLead')}</p>

      <div className="flex flex-wrap gap-2">
        <select
          value={filterWilaya}
          onChange={(e) => setFilterWilaya(e.target.value)}
          className="border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
        >
          <option value="">{t('adminStore.allWilayas')}</option>
          {wilayas.map((w) => (
            <option key={w.id} value={w.id}>
              {w.code} — {w.name}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder={t('adminStore.searchPostal')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[12rem] flex-1 border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
        />
      </div>

      <form onSubmit={save} className="panel grid gap-3 p-4 sm:grid-cols-2">
        <h3 className="sm:col-span-2 font-semibold text-sm">
          {editingId ? t('adminStore.editPostal') : t('adminStore.addPostal')}
        </h3>
        <label className="block text-xs text-dark-muted">
          {t('adminStore.wilaya')}
          <select
            required
            value={form.wilaya}
            onChange={(e) => setForm({ ...form, wilaya: e.target.value })}
            className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
          >
            <option value="">{t('adminStore.selectWilaya')}</option>
            {wilayas.map((w) => (
              <option key={w.id} value={w.id}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-dark-muted">
          {t('adminStore.postalCode')}
          <input
            required
            value={form.postal_code}
            onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
            className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm font-mono"
          />
        </label>
        <label className="block text-xs text-dark-muted">
          {t('adminStore.cityCommune')}
          <input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
          />
        </label>
        <label className="block text-xs text-dark-muted">
          {t('adminStore.homeDzd')}
          <input
            type="number"
            min="0"
            step="1"
            value={form.price_home_dzd}
            onChange={(e) => setForm({ ...form, price_home_dzd: e.target.value })}
            className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
            placeholder={t('adminStore.pricePlaceholder')}
          />
        </label>
        <label className="block text-xs text-dark-muted">
          {t('adminStore.bureauDzd')}
          <input
            type="number"
            min="0"
            step="1"
            value={form.price_bureau_dzd}
            onChange={(e) => setForm({ ...form, price_bureau_dzd: e.target.value })}
            className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
            placeholder={t('adminStore.pricePlaceholder')}
          />
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          {t('adminStore.activeOnSite')}
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button type="submit" className="btn-primary text-sm">
            {editingId ? t('adminStore.save') : t('adminStore.add')}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="btn-secondary text-sm">
              {t('adminStore.cancel')}
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-dark-muted animate-pulse">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto border border-dark-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-panel text-dark-muted">
              <tr>
                <th className="p-2">{t('adminStore.code')}</th>
                <th className="p-2">{t('adminStore.wilaya')}</th>
                <th className="p-2">{t('adminStore.city')}</th>
                <th className="p-2">{t('adminStore.home')}</th>
                <th className="p-2">{t('adminStore.bureau')}</th>
                <th className="p-2">{t('adminStore.active')}</th>
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-dark-muted">
                    {t('adminStore.noPostalRows')}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-dark-border">
                    <td className="p-2 font-mono">{row.postal_code}</td>
                    <td className="p-2">{row.wilaya_name}</td>
                    <td className="p-2">{row.city || '—'}</td>
                    <td className="p-2">{row.price_home_dzd ?? '—'}</td>
                    <td className="p-2">{row.price_bureau_dzd ?? '—'}</td>
                    <td className="p-2">{row.is_active ? t('common.active') : '—'}</td>
                    <td className="p-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="text-lab-cyan hover:underline"
                      >
                        {t('adminStore.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="ml-2 text-red-400 hover:underline"
                      >
                        {t('adminStore.delete')}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
