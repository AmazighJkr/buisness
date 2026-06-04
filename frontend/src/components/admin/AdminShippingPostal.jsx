import { useCallback, useEffect, useMemo, useState } from 'react'
import { Home, MapPin, Package, Plus, Store } from 'lucide-react'
import { useTranslation } from '../../context/LocaleContext.jsx'
import {
  adminCreatePostalCode,
  adminDeletePostalCode,
  adminFetchPostalCodes,
  adminFetchWilayas,
  adminUpdatePostalCode,
} from '../../api/client.js'

const STATUS_FILTERS = [
  { id: 'all', labelKey: 'filterAll' },
  { id: 'configured', labelKey: 'filterConfigured' },
  { id: 'no_rates', labelKey: 'filterNoRates' },
  { id: 'home_only', labelKey: 'filterHomeOnly' },
  { id: 'bureau_only', labelKey: 'filterBureauOnly' },
  { id: 'inactive', labelKey: 'filterInactive' },
]

function deliveryStatus(row) {
  if (!row.is_active) return 'inactive'
  if (row.has_home && row.has_bureau) return 'both'
  if (row.has_home) return 'home_only'
  if (row.has_bureau) return 'bureau_only'
  return 'no_rates'
}

function emptyForm(wilayaId = '') {
  return {
    wilaya: wilayaId,
    postal_code: '',
    city: '',
    home_enabled: false,
    price_home_dzd: '',
    bureau_enabled: false,
    price_bureau_dzd: '',
    is_active: true,
  }
}

function formFromRow(row) {
  return {
    wilaya: row.wilaya,
    postal_code: row.postal_code,
    city: row.city || '',
    home_enabled: Boolean(row.has_home),
    price_home_dzd: row.price_home_dzd ?? '',
    bureau_enabled: Boolean(row.has_bureau),
    price_bureau_dzd: row.price_bureau_dzd ?? '',
    is_active: row.is_active,
  }
}

function bodyFromForm(form) {
  const homePrice =
    form.home_enabled && form.price_home_dzd !== '' ? Number(form.price_home_dzd) : null
  const bureauPrice =
    form.bureau_enabled && form.price_bureau_dzd !== '' ? Number(form.price_bureau_dzd) : null
  return {
    wilaya: form.wilaya,
    postal_code: form.postal_code.trim(),
    city: form.city.trim(),
    is_active: form.is_active,
    price_home_dzd: form.home_enabled ? homePrice : null,
    price_bureau_dzd: form.bureau_enabled ? bureauPrice : null,
  }
}

function StatusBadge({ status, t }) {
  const labels = {
    both: t('adminStore.statusBoth'),
    home_only: t('adminStore.statusHomeOnly'),
    bureau_only: t('adminStore.statusBureauOnly'),
    no_rates: t('adminStore.statusNoRates'),
    inactive: t('adminStore.statusInactive'),
  }
  const classes = {
    both: 'bg-emerald-500/15 text-emerald-300',
    home_only: 'bg-sky-500/15 text-sky-300',
    bureau_only: 'bg-violet-500/15 text-violet-300',
    no_rates: 'bg-amber-500/15 text-amber-300',
    inactive: 'bg-dark-panel text-dark-muted',
  }
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${classes[status] || ''}`}>
      {labels[status] || status}
    </span>
  )
}

export default function AdminShippingPostal({ onMessage }) {
  const { t } = useTranslation()
  const [wilayas, setWilayas] = useState([])
  const [wilayaSearch, setWilayaSearch] = useState('')
  const [selectedWilayaId, setSelectedWilayaId] = useState('')
  const [postalRows, setPostalRows] = useState([])
  const [postalCount, setPostalCount] = useState(0)
  const [postalSearch, setPostalSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loadingWilayas, setLoadingWilayas] = useState(true)
  const [loadingPostal, setLoadingPostal] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const selectedWilaya = useMemo(
    () => wilayas.find((w) => w.id === selectedWilayaId) || null,
    [wilayas, selectedWilayaId],
  )

  const filteredWilayas = useMemo(() => {
    const q = wilayaSearch.trim().toLowerCase()
    if (!q) return wilayas
    return wilayas.filter(
      (w) =>
        w.code.includes(q) ||
        (w.name || '').toLowerCase().includes(q),
    )
  }, [wilayas, wilayaSearch])

  useEffect(() => {
    let cancelled = false
    setLoadingWilayas(true)
    adminFetchWilayas()
      .then((rows) => {
        if (!cancelled) setWilayas(rows)
      })
      .catch((err) => onMessage?.('error', err.message))
      .finally(() => {
        if (!cancelled) setLoadingWilayas(false)
      })
    return () => {
      cancelled = true
    }
  }, [onMessage])

  const loadPostal = useCallback(async () => {
    if (!selectedWilayaId) {
      setPostalRows([])
      setPostalCount(0)
      return
    }
    setLoadingPostal(true)
    try {
      const { rows, count } = await adminFetchPostalCodes({
        wilaya: selectedWilayaId,
        q: postalSearch,
        status: statusFilter === 'all' ? '' : statusFilter,
      })
      setPostalRows(rows)
      setPostalCount(count)
    } catch (err) {
      onMessage?.('error', err.message)
    } finally {
      setLoadingPostal(false)
    }
  }, [selectedWilayaId, postalSearch, statusFilter, onMessage])

  useEffect(() => {
    const timer = setTimeout(loadPostal, postalSearch ? 280 : 0)
    return () => clearTimeout(timer)
  }, [loadPostal, postalSearch])

  const selectWilaya = (id) => {
    setSelectedWilayaId(id)
    setPostalSearch('')
    setStatusFilter('all')
    setEditingId(null)
    setForm(emptyForm(id))
  }

  const selectPostal = (row) => {
    setEditingId(row.id)
    setForm(formFromRow(row))
  }

  const startAdd = () => {
    setEditingId(null)
    setForm(emptyForm(selectedWilayaId))
  }

  const resetEditor = () => {
    setEditingId(null)
    setForm(emptyForm(selectedWilayaId))
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.wilaya) {
      onMessage?.('error', t('adminStore.pickWilayaFirst'))
      return
    }
    if (form.home_enabled && form.price_home_dzd === '') {
      onMessage?.('error', t('adminStore.homePriceRequired'))
      return
    }
    if (form.bureau_enabled && form.price_bureau_dzd === '') {
      onMessage?.('error', t('adminStore.bureauPriceRequired'))
      return
    }
    setSaving(true)
    try {
      const body = bodyFromForm(form)
      if (editingId) {
        await adminUpdatePostalCode(editingId, body)
        onMessage?.('ok', t('adminStore.postalUpdated'))
      } else {
        const created = await adminCreatePostalCode(body)
        onMessage?.('ok', t('adminStore.postalAdded'))
        setEditingId(created.id)
      }
      await loadPostal()
      adminFetchWilayas().then(setWilayas).catch(() => {})
    } catch (err) {
      onMessage?.('error', err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!editingId || !window.confirm(t('adminStore.confirmDeletePostal'))) return
    try {
      await adminDeletePostalCode(editingId)
      onMessage?.('ok', t('adminStore.deleted'))
      resetEditor()
      loadPostal()
      adminFetchWilayas().then(setWilayas).catch(() => {})
    } catch (err) {
      onMessage?.('error', err.message)
    }
  }

  return (
    <div className="admin-shipping-postal space-y-3">
      <p className="text-sm text-dark-muted">{t('adminStore.shippingLead')}</p>

      <div className="grid border border-dark-border lg:grid-cols-[minmax(11rem,14rem)_minmax(14rem,1fr)_minmax(17rem,22rem)]">
        {/* Wilayas */}
        <aside className="flex flex-col border-b border-dark-border lg:border-b-0 lg:border-r">
          <div className="border-b border-dark-border bg-dark-panel px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted">
              {t('adminStore.wilayas')}
            </p>
            <input
              type="search"
              value={wilayaSearch}
              onChange={(e) => setWilayaSearch(e.target.value)}
              placeholder={t('adminStore.searchWilaya')}
              className="mt-2 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-xs"
            />
          </div>
          <ul className="max-h-64 flex-1 overflow-y-auto lg:max-h-[28rem]">
            {loadingWilayas ? (
              <li className="p-3 text-xs text-dark-muted animate-pulse">{t('common.loading')}</li>
            ) : (
              filteredWilayas.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => selectWilaya(w.id)}
                    className={`w-full px-3 py-2 text-left text-xs transition-colors hover:bg-dark-panel ${
                      selectedWilayaId === w.id ? 'bg-dark-panel text-lab-cyan' : ''
                    }`}
                  >
                    <span className="font-mono text-dark-muted">{w.code}</span>{' '}
                    <span className="font-medium">{w.name}</span>
                    <span className="mt-0.5 block text-[10px] text-dark-muted">
                      {t('adminStore.wilayaPostalStats', {
                        configured: w.configured_count ?? 0,
                        total: w.postal_count ?? 0,
                      })}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* Postal list */}
        <section className="flex flex-col border-b border-dark-border lg:border-b-0 lg:border-r">
          <div className="border-b border-dark-border bg-dark-panel px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted">
                {selectedWilaya
                  ? `${selectedWilaya.code} — ${selectedWilaya.name}`
                  : t('adminStore.postalCodes')}
              </p>
              {selectedWilayaId && (
                <button
                  type="button"
                  onClick={startAdd}
                  className="flex items-center gap-1 text-[10px] text-lab-cyan hover:underline"
                >
                  <Plus className="h-3 w-3" aria-hidden />
                  {t('adminStore.addPostal')}
                </button>
              )}
            </div>
            {selectedWilayaId ? (
              <>
                <input
                  type="search"
                  value={postalSearch}
                  onChange={(e) => setPostalSearch(e.target.value)}
                  placeholder={t('adminStore.searchPostal')}
                  className="mt-2 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-xs"
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {STATUS_FILTERS.map(({ id, labelKey }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setStatusFilter(id)}
                      className={`rounded border px-1.5 py-0.5 text-[10px] ${
                        statusFilter === id
                          ? 'border-lab-cyan text-lab-cyan'
                          : 'border-dark-border text-dark-muted hover:border-dark-muted'
                      }`}
                    >
                      {t(`adminStore.${labelKey}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-2 text-xs text-dark-muted">{t('adminStore.selectWilayaHint')}</p>
            )}
          </div>
          <ul className="max-h-64 flex-1 overflow-y-auto lg:max-h-[28rem]">
            {!selectedWilayaId ? (
              <li className="p-4 text-xs text-dark-muted">{t('adminStore.selectWilayaHint')}</li>
            ) : loadingPostal ? (
              <li className="p-3 text-xs text-dark-muted animate-pulse">{t('common.loading')}</li>
            ) : postalRows.length === 0 ? (
              <li className="p-4 text-xs text-dark-muted">{t('adminStore.noPostalInWilaya')}</li>
            ) : (
              postalRows.map((row) => {
                const status = deliveryStatus(row)
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => selectPostal(row)}
                      className={`w-full border-b border-dark-border px-3 py-2 text-left text-xs hover:bg-dark-panel ${
                        editingId === row.id ? 'bg-dark-panel' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono font-medium">{row.postal_code}</span>
                        <StatusBadge status={status} t={t} />
                      </div>
                      {row.city && (
                        <span className="mt-0.5 block truncate text-dark-muted">{row.city}</span>
                      )}
                      {(row.has_home || row.has_bureau) && (
                        <span className="mt-1 block text-[10px] text-dark-muted">
                          {row.has_home && `${t('adminStore.home')}: ${row.price_home_dzd}`}
                          {row.has_home && row.has_bureau && ' · '}
                          {row.has_bureau && `${t('adminStore.bureau')}: ${row.price_bureau_dzd}`}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })
            )}
          </ul>
          {selectedWilayaId && !loadingPostal && (
            <p className="border-t border-dark-border px-3 py-1.5 text-[10px] text-dark-muted">
              {t('adminStore.postalListCount', { count: postalCount })}
            </p>
          )}
        </section>

        {/* Editor */}
        <section className="flex flex-col">
          <div className="border-b border-dark-border bg-dark-panel px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted">
              {editingId ? t('adminStore.editPostal') : t('adminStore.addPostal')}
            </p>
          </div>
          {!selectedWilayaId ? (
            <p className="p-4 text-xs text-dark-muted">{t('adminStore.selectWilayaToEdit')}</p>
          ) : (
            <form onSubmit={save} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs text-dark-muted sm:col-span-2">
                  {t('adminStore.postalCode')}
                  <input
                    required
                    value={form.postal_code}
                    onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                    disabled={Boolean(editingId)}
                    className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 font-mono text-sm disabled:opacity-60"
                  />
                </label>
                <label className="block text-xs text-dark-muted sm:col-span-2">
                  {t('adminStore.cityCommune')}
                  <input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
                  />
                </label>
              </div>

              <fieldset className="rounded border border-dark-border p-3">
                <legend className="px-1 text-xs font-semibold text-dark-text">
                  {t('adminStore.deliveryOptions')}
                </legend>

                <label className="mt-2 flex cursor-pointer items-start gap-2 rounded border border-dark-border p-2 has-[:checked]:border-lab-cyan">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <MapPin className="h-3.5 w-3.5" aria-hidden />
                      {t('adminStore.validForCheckout')}
                    </span>
                    <span className="block text-[10px] text-dark-muted">
                      {t('adminStore.validForCheckoutHint')}
                    </span>
                  </span>
                </label>

                <label className="mt-2 flex cursor-pointer items-start gap-2 rounded border border-dark-border p-2 has-[:checked]:border-sky-500/50">
                  <input
                    type="checkbox"
                    checked={form.home_enabled}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        home_enabled: e.target.checked,
                        price_home_dzd: e.target.checked ? form.price_home_dzd : '',
                      })
                    }
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <Home className="h-3.5 w-3.5" aria-hidden />
                      {t('adminStore.enableHome')}
                    </span>
                    {form.home_enabled && (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={form.price_home_dzd}
                        onChange={(e) => setForm({ ...form, price_home_dzd: e.target.value })}
                        placeholder={t('adminStore.priceDzd')}
                        className="mt-2 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
                      />
                    )}
                  </span>
                </label>

                <label className="mt-2 flex cursor-pointer items-start gap-2 rounded border border-dark-border p-2 has-[:checked]:border-violet-500/50">
                  <input
                    type="checkbox"
                    checked={form.bureau_enabled}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        bureau_enabled: e.target.checked,
                        price_bureau_dzd: e.target.checked ? form.price_bureau_dzd : '',
                      })
                    }
                    className="mt-0.5"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <Store className="h-3.5 w-3.5" aria-hidden />
                      {t('adminStore.enableBureau')}
                    </span>
                    {form.bureau_enabled && (
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={form.price_bureau_dzd}
                        onChange={(e) => setForm({ ...form, price_bureau_dzd: e.target.value })}
                        placeholder={t('adminStore.priceDzd')}
                        className="mt-2 w-full border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
                      />
                    )}
                  </span>
                </label>

                {!form.home_enabled && !form.bureau_enabled && form.is_active && (
                  <p className="mt-2 flex items-start gap-1 text-[10px] text-amber-300">
                    <Package className="h-3 w-3 shrink-0 mt-0.5" aria-hidden />
                    {t('adminStore.noDeliveryWarning')}
                  </p>
                )}
              </fieldset>

              <div className="mt-auto flex flex-wrap gap-2">
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  {saving ? t('common.loading') : editingId ? t('adminStore.save') : t('adminStore.add')}
                </button>
                {editingId && (
                  <>
                    <button type="button" onClick={resetEditor} className="btn-secondary text-sm">
                      {t('adminStore.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={remove}
                      className="text-sm text-red-400 hover:underline"
                    >
                      {t('adminStore.delete')}
                    </button>
                  </>
                )}
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  )
}
