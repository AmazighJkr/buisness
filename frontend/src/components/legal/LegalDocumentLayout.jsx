import { Link } from 'react-router-dom'
import PageHeader from '../PageHeader.jsx'
import { useTranslation } from '../../context/LocaleContext.jsx'

export default function LegalDocumentLayout({ title, subtitle, children }) {
  const { t } = useTranslation()

  return (
    <div className="page-shell">
      <PageHeader highlight="" />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-xs text-dark-muted">
          <Link to="/shop" className="text-lab-cyan hover:underline">
            {t('legal.backToShop')}
          </Link>
        </p>
        <h1 className="mt-4 font-display text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-dark-muted">{subtitle}</p>}
        <article className="legal-document mt-8 space-y-6 text-sm leading-relaxed text-dark-text">
          {children}
        </article>
      </main>
    </div>
  )
}

export function LegalSection({ title, children }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-dark-text">{title}</h2>
      <div className="mt-2 space-y-3 text-dark-muted">{children}</div>
    </section>
  )
}

export function LegalP({ children }) {
  return <p>{children}</p>
}
