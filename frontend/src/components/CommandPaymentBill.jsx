import { Link } from 'react-router-dom'
import { CreditCard, Lock } from 'lucide-react'
import { payCommand, payMyCommand } from '../api/client.js'
import { paymentStatusLabel } from '../constants/commandStatus.js'

export default function CommandPaymentBill({ command, onUpdated, useAccountApi = false }) {
  const paying = command.payment_due || (
    command.status === 'Accepted' &&
    command.quoted_price > 0 &&
    command.payment_status === 'pending'
  )

  if (!command.quoted_price || command.quoted_price <= 0) return null

  const handlePay = async () => {
    try {
      const result = useAccountApi
        ? await payMyCommand(command.id)
        : await payCommand(command.tracking_code)
      if (result.checkout_url) {
        window.location.href = result.checkout_url
        return
      }
      if (result.mode === 'manual') {
        alert(result.instructions || 'Contact us to complete payment.')
        return
      }
      onUpdated?.(result)
    } catch (err) {
      alert(err.message)
    }
  }

  return (
    <div className="rounded border border-dark-border bg-dark-panel p-4">
      <div className="flex items-start gap-3">
        <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-lab-cyan" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium">Payment bill</h3>
          <p className="mt-1 text-xs text-dark-muted">
            Your command was accepted. Complete payment to start development.
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">
            ${Number(command.quoted_price).toFixed(2)}
          </p>
          <p className="mt-1 text-xs text-dark-muted">
            Status: {paymentStatusLabel(command.payment_status)}
          </p>
          {paying && (
            <button
              type="button"
              onClick={handlePay}
              className="mt-4 border border-lab-cyan px-4 py-2 text-sm text-lab-cyan panel-hover"
            >
              Pay now
            </button>
          )}
          {command.payment_status === 'paid' && (
            <p className="mt-3 text-xs text-lab-green">Payment received — thank you.</p>
          )}
          {command.payment_status === 'waived' && (
            <p className="mt-3 text-xs text-dark-muted">Payment waived for this command.</p>
          )}
        </div>
      </div>
      {!paying && command.payment_status === 'pending' && (
        <p className="mt-3 flex items-center gap-1 text-xs text-dark-muted">
          <Lock className="h-3 w-3" />
          Waiting for admin to finalize the bill.
        </p>
      )}
      <p className="mt-3 text-[10px] text-dark-muted">
        Need an account for subscriptions?{' '}
        <Link to="/account" className="text-dark-text underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
