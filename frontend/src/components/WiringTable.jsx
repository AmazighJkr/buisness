export default function WiringTable({ wiring = [] }) {
  return (
    <table className="lab-table lab-table-simple">
      <thead>
        <tr>
          <th>From</th>
          <th>To</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        {wiring.map((row, i) => (
          <tr key={i}>
            <td>{row.from_pin}</td>
            <td className="text-dark-muted">{row.to_pin}</td>
            <td className="text-dark-muted">{row.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
