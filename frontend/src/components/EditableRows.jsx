export default function EditableRows({ columns, rows, onChange, emptyRow }) {
  const updateCell = (rowIdx, key, value) => {
    const next = rows.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r))
    onChange(next)
  }

  const addRow = () => onChange([...rows, { ...emptyRow }])
  const removeRow = (idx) => onChange(rows.filter((_, i) => i !== idx))

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-lab-border">
        <table className="w-full text-xs">
          <thead className="border-b border-lab-border bg-dark-panel text-dark-muted">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-2 py-2 text-left font-normal">
                  {c.label}
                </th>
              ))}
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-lab-border/40">
                {columns.map((c) => (
                  <td key={c.key} className="p-1">
                    <input
                      value={row[c.key] || ''}
                      onChange={(e) => updateCell(ri, c.key, e.target.value)}
                      className="w-full border border-lab-border bg-lab-bg px-2 py-1 outline-none focus:border-lab-cyan"
                      placeholder={c.label}
                    />
                  </td>
                ))}
                <td className="p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(ri)}
                    className="text-red-400 hover:text-red-300"
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
