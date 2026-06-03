import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, ShoppingBag } from 'lucide-react'
import { useTranslation } from '../context/LocaleContext.jsx'
import { fetchStoreProducts } from '../api/client.js'
import { useCart } from '../hooks/useCart.js'
import { useStoreRegion } from '../hooks/useStoreRegion.js'

function parseQty(raw) {
  const n = parseInt(String(raw ?? '1'), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

export default function ProjectMaterialsSection({ materials = [] }) {
  const { t } = useTranslation()
  const { addItem } = useCart()
  const { isAlgeria, loading: regionLoading } = useStoreRegion()
  const [productsById, setProductsById] = useState({})
  const [addedIds, setAddedIds] = useState({})
  const [bulkMsg, setBulkMsg] = useState('')

  const rows = useMemo(
    () => materials.filter((r) => r?.component?.trim() || r?.part),
    [materials],
  )

  const storeIds = useMemo(
    () => [...new Set(rows.map((r) => r.store_product_id).filter(Boolean))],
    [rows],
  )

  useEffect(() => {
    if (!isAlgeria || !storeIds.length) {
      setProductsById({})
      return
    }
    fetchStoreProducts()
      .then((list) => {
        const map = {}
        for (const p of list) {
          if (storeIds.includes(p.id)) map[p.id] = p
        }
        setProductsById(map)
      })
      .catch(() => setProductsById({}))
  }, [isAlgeria, storeIds.join(',')])

  const flashAdded = (id) => {
    setAddedIds((prev) => ({ ...prev, [id]: true }))
    setTimeout(() => {
      setAddedIds((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }, 2000)
  }

  const addProductToCart = (product, qty) => {
    if (!product || product.stock_qty <= 0) return
    addItem(product, qty)
    flashAdded(product.id)
    setBulkMsg('')
  }

  const linkedStoreRows = rows.filter((r) => r.store_product_id)
  const allStoreLinked =
    rows.length > 0 && rows.every((r) => r.store_product_id && productsById[r.store_product_id])
  const allStoreInStock =
    allStoreLinked &&
    rows.every((r) => {
      const p = productsById[r.store_product_id]
      return p && p.stock_qty > 0
    })

  const amazonRows = rows.filter((r) => (r.amazon_url || '').trim())
  const allAmazonLinked = rows.length > 0 && rows.every((r) => (r.amazon_url || '').trim())

  const handleAddAllStore = () => {
    if (!allStoreInStock) return
    for (const row of rows) {
      const p = productsById[row.store_product_id]
      if (p) addItem(p, parseQty(row.quantity))
    }
    setBulkMsg(t('materials.addedAllStore'))
    setTimeout(() => setBulkMsg(''), 3000)
  }

  const handleOpenAllAmazon = () => {
    if (!allAmazonLinked) return
    for (const row of rows) {
      const url = (row.amazon_url || '').trim()
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
    }
    setBulkMsg(t('materials.openedAllAmazon'))
    setTimeout(() => setBulkMsg(''), 3000)
  }

  if (!rows.length) {
    return <p className="text-xs text-dark-muted">{t('materials.none')}</p>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="lab-table lab-table-simple">
          <thead>
            <tr>
              <th>{t('materials.component')}</th>
              <th>{t('materials.qty')}</th>
              <th>{t('materials.notes')}</th>
              {!regionLoading && (
                <th className="w-36">{isAlgeria ? t('materials.store') : t('materials.buy')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const product = row.store_product_id ? productsById[row.store_product_id] : null
              const amazon = (row.amazon_url || '').trim()
              const qty = parseQty(row.quantity ?? row.qty)
              return (
                <tr key={i}>
                  <td>{row.component || row.part}</td>
                  <td className="text-dark-muted">{row.quantity ?? row.qty ?? '1'}</td>
                  <td className="text-dark-muted">{row.notes}</td>
                  {!regionLoading && (
                    <td>
                      {isAlgeria ? (
                        row.store_product_id ? (
                          product ? (
                            product.stock_qty > 0 ? (
                              <button
                                type="button"
                                onClick={() => addProductToCart(product, qty)}
                                className={`inline-flex items-center gap-1 text-xs ${
                                  addedIds[product.id] ? 'text-lab-green' : 'text-lab-cyan hover:underline'
                                }`}
                              >
                                <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
                                {addedIds[product.id] ? t('materials.inBag') : t('materials.addToBag')}
                              </button>
                            ) : (
                              <span className="text-xs text-dark-muted">{t('materials.outOfStock')}</span>
                            )
                          ) : (
                            <span className="text-xs text-dark-muted">{t('materials.notInStore')}</span>
                          )
                        ) : (
                          <span className="text-xs text-dark-muted">—</span>
                        )
                      ) : amazon ? (
                        <a
                          href={amazon}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-lab-cyan hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Amazon
                        </a>
                      ) : (
                        <span className="text-xs text-dark-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {!regionLoading && (
        <div className="flex flex-wrap items-center gap-2">
          {isAlgeria ? (
            <>
              <button
                type="button"
                disabled={!allStoreInStock}
                onClick={handleAddAllStore}
                className="btn-primary text-xs disabled:opacity-40"
                title={
                  !allStoreLinked
                    ? t('materials.addAllStoreHint')
                    : !allStoreInStock
                      ? t('materials.addAllStoreStockHint')
                      : ''
                }
              >
                {t('materials.addAllStore')}
              </button>
              <Link to="/shop/cart" className="text-xs text-dark-muted underline hover:text-dark-text">
                {t('cart.title')} →
              </Link>
            </>
          ) : (
            <button
              type="button"
              disabled={!allAmazonLinked}
              onClick={handleOpenAllAmazon}
              className="border border-dark-border px-3 py-2 text-xs panel-hover disabled:opacity-40"
              title={!allAmazonLinked ? t('materials.addAllAmazonHint') : ''}
            >
              {t('materials.openAllAmazon')}
            </button>
          )}
          {bulkMsg && <p className="text-xs text-lab-green">{bulkMsg}</p>}
        </div>
      )}

      {isAlgeria && linkedStoreRows.length > 0 && linkedStoreRows.length < rows.length && (
        <p className="text-[10px] text-dark-muted">{t('materials.partialStoreLink')}</p>
      )}
    </div>
  )
}
