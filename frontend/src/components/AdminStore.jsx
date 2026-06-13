import { useEffect, useMemo, useState } from 'react'
import { adminFetchStoreCategories, adminFetchStoreProducts } from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'
import AdminStoreComments from './admin/AdminStoreComments.jsx'
import AdminShippingPostal from './admin/AdminShippingPostal.jsx'
import AdminStoreCategories from './admin/AdminStoreCategories.jsx'
import AdminStoreManageProducts from './admin/AdminStoreManageProducts.jsx'
import AdminStorePostProduct from './admin/AdminStorePostProduct.jsx'

export default function AdminStore({ canPost = true, canEdit = true }) {
  const { t } = useTranslation()
  const storeViews = useMemo(
    () =>
      [
        canEdit && { id: 'categories', label: t('adminStore.categories') },
        canPost && { id: 'add', label: t('adminStore.addProduct') },
        canEdit && { id: 'manage', label: t('adminStore.manageProducts') },
        canEdit && { id: 'comments', label: t('adminStoreComments.tab') },
        canEdit && { id: 'shipping', label: t('adminStore.shippingPostal') },
      ].filter(Boolean),
    [canEdit, canPost, t],
  )
  const [view, setView] = useState(storeViews[0]?.id || 'categories')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const load = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const [c, p] = await Promise.all([adminFetchStoreCategories(), adminFetchStoreProducts()])
      setCategories(c)
      setProducts(p)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load().catch((e) => setMsg({ type: 'error', text: e.message }))
    const onFocus = () => load({ silent: true }).catch(() => {})
    const id = window.setInterval(() => load({ silent: true }).catch(() => {}), 60000)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    if (!storeViews.some((v) => v.id === view)) {
      setView(storeViews[0]?.id || 'categories')
    }
  }, [storeViews, view])

  const onMessage = (type, text) => setMsg({ type, text })

  return (
    <div className="space-y-4 max-w-5xl">
      <div>
        <h2 className="font-display text-lg font-semibold">{t('adminStore.title')}</h2>
        <p className="mt-1 text-sm text-dark-muted">{t('adminStore.lead')}</p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-dark-border pb-3">
        {storeViews.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setView(id)
              setMsg({ type: '', text: '' })
            }}
            className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
              view === id
                ? 'border-lab-cyan bg-[color-mix(in_srgb,var(--eg-accent)_12%,var(--eg-panel))] text-lab-cyan'
                : 'border-dark-border text-dark-muted hover:text-dark-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {msg.text && (
        <p
          className={`rounded px-3 py-2 text-sm ${
            msg.type === 'error'
              ? 'border border-red-500/50 bg-red-500/15 text-red-300'
              : 'border border-lab-green/40 bg-lab-green/10 text-lab-green'
          }`}
          role="alert"
        >
          {msg.text}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-dark-muted animate-pulse">{t('adminStore.loading')}</p>
      ) : (
        <>
          {view === 'categories' && (
            <AdminStoreCategories categories={categories} onReload={load} onMessage={onMessage} />
          )}
          {view === 'add' && (
            <AdminStorePostProduct
              categories={categories}
              onReload={load}
              onMessage={onMessage}
              onGoManage={() => setView('manage')}
            />
          )}
          {view === 'manage' && (
            <AdminStoreManageProducts
              categories={categories}
              products={products}
              onReload={load}
              onMessage={onMessage}
            />
          )}
          {view === 'comments' && <AdminStoreComments onMessage={onMessage} />}
          {view === 'shipping' && <AdminShippingPostal onMessage={onMessage} />}
        </>
      )}
    </div>
  )
}
