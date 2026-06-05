import { Fragment, useCallback, useEffect, useState } from 'react'
import { adminFetchStaffActivity } from '../../api/client.js'

const RESOURCE_OPTIONS = [
  '',
  'projects',
  'categories',
  'commands',
  'comments',
  'users',
  'packs',
  'command-layers',
  'command-layer-bundles',
  'store/categories',
  'store/products',
  'store/orders',
  'store/postal-codes',
  'legal',
]

const ACTION_OPTIONS = ['', 'create', 'update', 'delete', 'respond', 'message', 'upload', 'invoice']

function formatWhen(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

export default function AdminActivityLog() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [staff, setStaff] = useState('')
  const [resource, setResource] = useState('')
  const [action, setAction] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminFetchStaffActivity({ staff, resource, action })
      setRows(data)
    } catch (e) {
      setError(e.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [staff, resource, action])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="max-w-4xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Staff activity log</h2>
        <p className="mt-1 text-sm text-dark-muted">
          Every create, update, delete, and command response by staff is recorded here.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="Filter by staff username"
          value={staff}
          onChange={(e) => setStaff(e.target.value)}
          className="min-w-[10rem] flex-1 border border-dark-border bg-dark-bg px-3 py-1.5 text-sm"
        />
        <select
          value={resource}
          onChange={(e) => setResource(e.target.value)}
          className="border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
        >
          {RESOURCE_OPTIONS.map((r) => (
            <option key={r || 'all'} value={r}>
              {r ? r : 'All resources'}
            </option>
          ))}
        </select>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border border-dark-border bg-dark-bg px-2 py-1.5 text-sm"
        >
          {ACTION_OPTIONS.map((a) => (
            <option key={a || 'all'} value={a}>
              {a ? a : 'All actions'}
            </option>
          ))}
        </select>
        <button type="button" onClick={load} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      {loading ? (
        <p className="text-sm text-dark-muted animate-pulse">Loading activity…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-dark-muted">No staff actions recorded yet.</p>
      ) : (
        <div className="max-h-[36rem] overflow-y-auto border border-dark-border">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-dark-panel">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Staff</th>
                <th className="p-2">Action</th>
                <th className="p-2">Summary</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <Fragment key={row.id}>
                  <tr
                    className="cursor-pointer border-t border-dark-border hover:bg-dark-bg"
                    onClick={() => setExpandedId((id) => (id === row.id ? null : row.id))}
                  >
                    <td className="p-2 whitespace-nowrap text-dark-muted">{formatWhen(row.created_at)}</td>
                    <td className="p-2 text-lab-cyan">{row.actor}</td>
                    <td className="p-2">
                      <span className="text-lab-copper">{row.action}</span>
                      <span className="text-dark-muted"> · {row.resource}</span>
                    </td>
                    <td className="p-2">{row.summary}</td>
                  </tr>
                  {expandedId === row.id && (
                    <tr className="border-t border-dark-border bg-dark-bg">
                      <td colSpan={4} className="p-3 font-mono text-[10px] text-dark-muted">
                        <p>{row.method} {row.path}</p>
                        {row.ip_address && <p>IP: {row.ip_address}</p>}
                        {row.metadata && Object.keys(row.metadata).length > 0 && (
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(row.metadata, null, 2)}
                          </pre>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
