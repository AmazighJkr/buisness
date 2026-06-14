import { FileText } from 'lucide-react'
import { commandInvoicePdfUrl } from '../api/client.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function CommandInvoicesPanel({ invoices = [], trackingCode, commandId }) {
  const { t } = useTranslation()
  const visible = invoices.filter((inv) => inv.status === 'sent' || inv.status === 'paid')
  if (!visible.length) return null

  return (
    <div className="space-y-2">
      {visible.map((inv) => (
        <div key={inv.id} className="flex flex-wrap items-start justify-between gap-3 rounded border border-dark-border bg-dark-panel p-3">
          <div className="flex min-w-0 gap-2">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-lab-cyan" />
            <div>
              <p className="text-sm font-medium">{inv.title}</p>
              <p className="text-xs text-dark-muted">
                {inv.status === 'paid' ? t('command.invoicePaid') : t('command.invoiceDue')}
                {inv.total_dzd ? ` · ${inv.total_dzd} DZD` : ''}
                {inv.total_usd ? ` · ${inv.total_usd} USD` : ''}
              </p>
              {inv.notes && <p className="mt-1 text-xs text-dark-muted whitespace-pre-wrap">{inv.notes}</p>}
            </div>
          </div>
          <a
            href={commandInvoicePdfUrl(inv.id, { code: trackingCode, commandId })}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 border border-dark-border px-3 py-1.5 text-xs panel-hover"
          >
            {t('command.downloadInvoice')}
          </a>
        </div>
      ))}
    </div>
  )
}
