import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LocaleContext.jsx'

/** Text button back to the marketing homepage (used on store header). */
export default function MainSiteButton() {
  const { t } = useTranslation()
  return (
    <Link to="/" className="site-main-site-btn">
      {t('nav.mainSite')}
    </Link>
  )
}
