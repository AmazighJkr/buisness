import { useState } from 'react'
import { adminCreateCommandInvoice, adminSendCommandInvoice } from '../api/client.js'

const EMPTY_LINE = () => ({ label: '', description: '', qty: 1, unit_usd: '', unit_dzd: '' })

export default function AdminCommandInvoice({ commandId, invoices = [], onReload }) {
  const [title, setTitle] = useState('Upgrade / Facture')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([EMPTY_LINE()])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const updateLine = (index, key, val) => {
    setLines((rows) => rows.map((r, i) => (i === index ? { ...r, [key]: val } : r)))
  }

  const saveDraft = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    try {
      await adminCreateCommandInvoice(commandId, { title, notes, line_items: lines })
      setLines([EMPTY_LINE()])
      setMsg('Draft invoice saved.')
      onReload?.()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  const send = async (invoiceId) => {
    if (!window.confirm('Send this invoice to the client? They will be asked to pay.')) return
    setBusy(true)
    setMsg('')
    try {
      await adminSendCommandInvoice(commandId, invoiceId)
      setMsg('Invoice sent to client.')
      onReload?.()
    } catch (err) {
      setMsg(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 border border-dark-border p-3">
      <p className="text-xs font-semibold uppercase text-dark-muted">Payment facture / invoice</p>
      {invoices.length > 0 && (
        <ul className="space-y-2 text-xs">
          {invoices.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center justify-between gap-2 border border-dark-border p-2">
              <div>
                <p className="font-medium">{inv.title}</p>
                <p className="text-dark-muted">
                  {inv.status} · {inv.total_dzd ? `${inv.total_dzd} DZD` : ''}{' '}
                  {inv.total_usd ? `${inv.total_usd} USD` : ''}
                </p>
              </div>
              {inv.status === 'draft' && (
                <button type="button" onClick={() => send(inv.id)} disabled={busy} className="btn-primary text-xs">
                  Send to client
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={saveDraft} className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Invoice title"
          className="input-field text-xs"
        />
        {lines.map((line, i) => (
          <div key={i} className="grid gap-1 sm:grid-cols-2">
            <input
              value={line.label}
              onChange={(e) => updateLine(i, 'label', e.target.value)}
              placeholder="Line label *"
              className="input-field text-xs sm:col-span-2"
            />
            <input
              value={line.description}
              onChange={(e) => updateLine(i, 'description', e.target.value)}
              placeholder="Details"
              className="input-field text-xs sm:col-span-2"
            />
            <input
              type="number"
              min="1"
              value={line.qty}
              onChange={(e) => updateLine(i, 'qty', e.target.value)}
              placeholder="Qty"
              className="input-field text-xs"
            />
            <input
              value={line.unit_dzd}
              onChange={(e) => updateLine(i, 'unit_dzd', e.target.value)}
              placeholder="Unit DZD"
              className="input-field text-xs"
            />
            <input
              value={line.unit_usd}
              onChange={(e) => updateLine(i, 'unit_usd', e.target.value)}
              placeholder="Unit USD"
              className="input-field text-xs"
            />
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLines((r) => [...r, EMPTY_LINE()])} className="text-xs text-lab-cyan">
            + Line item
          </button>
        </div>
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes on invoice (terms, bank info…)"
          className="input-field resize-y text-xs"
        />
        <button type="submit" disabled={busy} className="btn-primary text-xs">
          Save draft invoice
        </button>
        {msg && <p className="text-xs text-dark-muted">{msg}</p>}
      </form>
    </div>
  )
}
