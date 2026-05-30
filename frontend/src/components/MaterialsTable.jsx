export default function MaterialsTable({ materials = [] }) {
  if (!materials.length) {
    return <p className="text-xs text-dark-muted">No materials listed.</p>
  }

  return (
    <table className="lab-table lab-table-simple">
      <thead>
        <tr>
          <th>Component</th>
          <th>Qty</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {materials.map((row, i) => (
          <tr key={i}>
            <td>{row.component || row.part}</td>
            <td className="text-dark-muted">{row.quantity ?? row.qty ?? '1'}</td>
            <td className="text-dark-muted">{row.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
