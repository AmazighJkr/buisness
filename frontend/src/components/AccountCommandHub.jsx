import { useEffect, useState } from 'react'
import CommandChat from './CommandChat.jsx'
import CommandPaymentStatusBar from './CommandPaymentStatusBar.jsx'
import CommandStatusBar from './CommandStatusBar.jsx'
import CommandPaymentBill from './CommandPaymentBill.jsx'
import CommandInvoicesPanel from './CommandInvoicesPanel.jsx'
import { fetchMyCommand, postMyCommandMessage } from '../api/client.js'
import { paymentStatusLabel, statusLabel } from '../constants/commandStatus.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function AccountCommandHub({ commands = [] }) {
  const { t } = useTranslation()
  const [selectedId, setSelectedId] = useState(commands[0]?.id || null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      return
    }
    setLoading(true)
    fetchMyCommand(selectedId)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [selectedId])

  if (!commands.length) return null

  return (
    <div className="panel p-4">
      <h2 className="text-sm font-semibold">{t('account.commandChatTitle')}</h2>
      <p className="mt-1 text-xs text-dark-muted">{t('account.commandChatLead')}</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,12rem)_1fr]">
        <ul className="space-y-1 max-h-64 overflow-y-auto">
          {commands.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`w-full border px-2 py-2 text-left text-xs ${
                  selectedId === c.id ? 'border-lab-cyan bg-dark-panel' : 'border-dark-border'
                }`}
              >
                <span className="font-mono text-lab-cyan">{c.tracking_code || c.id.slice(0, 8)}</span>
                <span className="mt-1 block text-dark-muted">
                  {statusLabel(c.status, t)} · {paymentStatusLabel(c.payment_status, t)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="min-w-0 space-y-3">
          {loading ? (
            <p className="text-xs text-dark-muted animate-pulse">{t('common.loading')}</p>
          ) : detail ? (
            <>
              <CommandStatusBar status={detail.status} />
              <CommandPaymentStatusBar paymentStatus={detail.payment_status} />
              {detail.payment_due && <CommandPaymentBill command={detail} onUpdated={setDetail} />}
              <CommandInvoicesPanel invoices={detail.invoices} commandId={detail.id} />
              <CommandChat
                messages={detail.messages || []}
                sending={sending}
                placeholder={t('command.chatPlaceholder')}
                onSend={async (body) => {
                  setSending(true)
                  try {
                    await postMyCommandMessage(detail.id, body)
                    const fresh = await fetchMyCommand(detail.id)
                    setDetail(fresh)
                  } finally {
                    setSending(false)
                  }
                }}
              />
            </>
          ) : (
            <p className="text-xs text-dark-muted">{t('account.commandChatPick')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
