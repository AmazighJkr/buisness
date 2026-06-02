import { Link } from 'react-router-dom'
import StoreHeader from '../StoreHeader.jsx'

export default function StoreAlgeriaGate({ loading, children }) {
  if (loading) {
    return (
      <div className="page-shell">
        <StoreHeader highlight="/shop" />
        <main className="mx-auto max-w-lg p-8 text-center text-sm text-dark-muted animate-pulse">
          Checking store availability…
        </main>
      </div>
    )
  }

  return children
}

export function StoreNotAvailableInRegion() {
  return (
    <div className="page-shell">
      <StoreHeader highlight="/shop" />
      <main className="mx-auto max-w-lg p-8">
        <div className="panel p-6 text-center">
          <h1 className="text-lg font-semibold">Store — Algeria only</h1>
          <p className="mt-3 text-sm text-dark-muted leading-relaxed">
            The EmbeddedGrid store ships within Algeria. Prices are in{' '}
            <strong className="text-dark-text">DZD</strong>. Checkout supports{' '}
            <strong className="text-dark-text">pay on delivery</strong> and{' '}
            <strong className="text-dark-text">card payment via Chargily</strong> (Edahabia / CIB).
          </p>
          <p className="mt-3 text-xs text-dark-muted">
            If you are in Algeria and still see this message, wait a moment and refresh — we detect
            your region from your connection.
          </p>
          <Link to="/" className="btn-primary mt-6 inline-block">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}
