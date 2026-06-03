import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useTranslation } from '../context/LocaleContext.jsx'

/** Icon home control — marketing site (`/`). Compact for all locales. */
export default function SiteHomeButton() {
  const { t } = useTranslation()
  return (
    <Link
      to="/"
      className="site-home-btn"
      title={t('nav.mainSite')}
      aria-label={t('nav.mainSite')}
    >
      <Home className="h-4 w-4 shrink-0" aria-hidden />
    </Link>
  )
}
