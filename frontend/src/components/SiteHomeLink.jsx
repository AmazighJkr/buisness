import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LocaleContext.jsx'

/** Far-left link back to the marketing site (not the lab/projects area). */
export default function SiteHomeLink({ className = '' }) {
  const { t } = useTranslation()
  return (
    <Link to="/" className={`site-header-home-link ${className}`.trim()}>
      ← {t('nav.mainSite')}
    </Link>
  )
}
