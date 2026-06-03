import { useEffect, useState } from 'react'
import { ExternalLink, Search } from 'lucide-react'
import { adminFetchStoreProducts } from '../../api/client.js'
import AmazonProductPickerModal from './AmazonProductPickerModal.jsx'
import StoreProductCombobox from './StoreProductCombobox.jsx'

export const EMPTY_MATERIAL_ROW = {
  component: '',
  quantity: '1',
  notes: '',
  store_product_id: '',
  amazon_url: '',
}

export default function ProjectMaterialsEditor({ rows, onChange }) {
  const [storeProducts, setStoreProducts] = useState([])
  const [amazonPickerRow, setAmazonPickerRow] = useState(null)

  useEffect(() => {
    adminFetchStoreProducts()
      .then(setStoreProducts)
      .catch(() => setStoreProducts([]))
  }, [])

  const updateRow = (idx, patch) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }

  const addRow = () => onChange([...rows, { ...EMPTY_MATERIAL_ROW }])
  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx))

  const onStorePick = (idx, productId) => {
    const product = storeProducts.find((p) => p.id === productId)
    updateRow(idx, {
      store_product_id: productId || '',
      component: product ? product.name : rows[idx]?.component || '',
    })
  }

  const onAmazonPick = (item) => {
    if (amazonPickerRow === null) return
    updateRow(amazonPickerRow, {
      amazon_url: item.url || '',
      component: rows[amazonPickerRow]?.component?.trim() || item.title || '',
    })
    setAmazonPickerRow(null)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-lab-cyan">Materials table</p>
      <p className="text-[10px] text-dark-muted">
        Link store products (Algeria) or pick Amazon listings for international visitors.
      </p>
      <div className="overflow-x-auto border border-lab-border">
        <table className="w-full text-xs">
          <thead className="border-b border-lab-border bg-dark-panel text-dark-muted">
            <tr>
              <th className="px-2 py-2 text-left font-normal">Component</th>
              <th className="px-2 py-2 text-left font-normal w-16">Qty</th>
              <th className="px-2 py-2 text-left font-normal">Notes</th>
              <th className="px-2 py-2 text-left font-normal min-w-[10rem]">Store product</th>
              <th className="px-2 py-2 text-left font-normal min-w-[9rem]">Amazon</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-lab-border/40 align-top">
                <td className="p-1">
                  <input
                    value={row.component || ''}
                    onChange={(e) => updateRow(ri, { component: e.target.value })}
                    className="w-full border border-lab-border bg-lab-bg px-2 py-1"
                    placeholder="Component"
                  />
                </td>
                <td className="p-1">
                  <input
                    value={row.quantity ?? ''}
                    onChange={(e) => updateRow(ri, { quantity: e.target.value })}
                    className="w-full border border-lab-border bg-lab-bg px-2 py-1"
                    placeholder="1"
                  />
                </td>
                <td className="p-1">
                  <input
                    value={row.notes || ''}
                    onChange={(e) => updateRow(ri, { notes: e.target.value })}
                    className="w-full border border-lab-border bg-lab-bg px-2 py-1"
                    placeholder="Notes"
                  />
                </td>
                <td className="p-1">
                  <StoreProductCombobox
                    products={storeProducts}
                    value={row.store_product_id || ''}
                    onChange={(productId) => onStorePick(ri, productId)}
                    placeholder="Search EmbeddedGrid store…"
                  />
                </td>
                <td className="p-1">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => setAmazonPickerRow(ri)}
                      className="inline-flex items-center justify-center gap-1 border border-lab-border px-2 py-1 text-lab-cyan hover:border-lab-cyan"
                    >
                      <Search className="h-3 w-3" aria-hidden />
                      Find on Amazon
                    </button>
                    {row.amazon_url ? (
                      <div className="flex items-center gap-1">
                        <a
                          href={row.amazon_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-w-0 flex-1 items-center gap-1 truncate text-[10px] text-dark-muted hover:text-lab-cyan"
                          title={row.amazon_url}
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="truncate">Linked</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => updateRow(ri, { amazon_url: '' })}
                          className="text-[10px] text-red-400 hover:text-red-300"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-dark-muted">No link</span>
                    )}
                  </div>
                </td>
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    className="text-red-400 hover:text-red-300"
                    aria-label="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={addRow}
        className="text-xs text-lab-cyan border border-lab-border px-3 py-1 hover:border-lab-cyan"
      >
        + Add row
      </button>

      <AmazonProductPickerModal
        open={amazonPickerRow !== null}
        initialQuery={amazonPickerRow !== null ? rows[amazonPickerRow]?.component || '' : ''}
        onClose={() => setAmazonPickerRow(null)}
        onSelect={onAmazonPick}
      />
    </div>
  )
}
