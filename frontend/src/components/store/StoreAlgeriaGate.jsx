import { Link } from 'react-router-dom'
import StoreHeader from '../StoreHeader.jsx'
import { useTranslation } from '../../context/LocaleContext.jsx'

export default function StoreAlgeriaGate({ loading, children }) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className="page-shell">
        <StoreHeader highlight="/shop" />
        <main className="mx-auto max-w-lg p-8 text-center text-sm text-dark-muted animate-pulse">
          {t('common.loading')}
        </main>
      </div>
    )
  }

  return children
}

export function StoreNotAvailableInRegion() {
  const { t } = useTranslation()

  return (
    <div className="page-shell">
      <StoreHeader highlight="/shop" />
      <main className="mx-auto max-w-lg p-8">
        <div className="panel p-6 text-center">
          <h1 className="text-lg font-semibold">{t('store.algeriaOnlyTitle')}</h1>
          <p className="mt-3 text-sm text-dark-muted leading-relaxed">{t('store.algeriaOnlyBody')}</p>
          <p className="mt-3 text-xs text-dark-muted">{t('store.algeriaOnlyHint')}</p>
          <Link to="/" className="btn-primary mt-6 inline-block">
            {t('store.backHome')}
          </Link>
        </div>
      </main>
    </div>
  )
}
