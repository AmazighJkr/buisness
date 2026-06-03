import { useEffect, useState } from 'react'
import { adminFetchStoreProducts } from '../../api/client.js'

export const EMPTY_MATERIAL_ROW = {
  component: '',
  quantity: '1',
  notes: '',
  store_product_id: '',
  amazon_url: '',
}

export default function ProjectMaterialsEditor({ rows, onChange }) {
  const [storeProducts, setStoreProducts] = useState([])

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

  return (
    <div className="space-y-2">
      <p className="text-xs text-lab-cyan">Materials table</p>
      <p className="text-[10px] text-dark-muted">
        Link store products (Algeria checkout) and/or Amazon URLs (international visitors).
      </p>
      <div className="overflow-x-auto border border-lab-border">
        <table className="w-full text-xs">
          <thead className="border-b border-lab-border bg-dark-panel text-dark-muted">
            <tr>
              <th className="px-2 py-2 text-left font-normal">Component</th>
              <th className="px-2 py-2 text-left font-normal w-16">Qty</th>
              <th className="px-2 py-2 text-left font-normal">Notes</th>
              <th className="px-2 py-2 text-left font-normal min-w-[10rem]">Store product</th>
              <th className="px-2 py-2 text-left font-normal min-w-[8rem]">Amazon URL</th>
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
                  <select
                    value={row.store_product_id || ''}
                    onChange={(e) => onStorePick(ri, e.target.value)}
                    className="w-full border border-lab-border bg-lab-bg px-2 py-1"
                  >
                    <option value="">— None —</option>
                    {storeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.stock_qty <= 0 ? ' (out of stock)' : ''}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <input
                    value={row.amazon_url || ''}
                    onChange={(e) => updateRow(ri, { amazon_url: e.target.value })}
                    className="w-full border border-lab-border bg-lab-bg px-2 py-1"
                    placeholder="https://amazon…"
                  />
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
    </div>
  )
}
