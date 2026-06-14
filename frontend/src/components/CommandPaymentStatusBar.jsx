import { PAYMENT_STATUSES, paymentStatusLabel } from '../constants/commandStatus.js'
import { useTranslation } from '../context/LocaleContext.jsx'

export default function CommandPaymentStatusBar({ paymentStatus = 'none' }) {
  const { t } = useTranslation()
  const current = PAYMENT_STATUSES.find((s) => s.value === paymentStatus)?.value || 'none'
  const currentIndex = PAYMENT_STATUSES.findIndex((s) => s.value === current)

  return (
    <div>
      <p className="mb-3 text-sm text-dark-muted">
        {t('command.paymentStatusLabel')}:{' '}
        <span className="text-dark-text">{paymentStatusLabel(paymentStatus, t)}</span>
      </p>
      <ol className="flex flex-wrap gap-2">
        {PAYMENT_STATUSES.map((step, i) => {
          const done = i <= currentIndex && current !== 'none'
          const active = i === currentIndex
          return (
            <li
              key={step.value}
              className={`border px-2 py-1 text-xs ${
                active
                  ? 'border-lab-green text-lab-green'
                  : done
                    ? 'border-dark-border text-dark-text'
                    : 'border-dark-border text-dark-muted'
              }`}
            >
              {paymentStatusLabel(step.value, t)}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
