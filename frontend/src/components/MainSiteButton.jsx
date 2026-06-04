import { Link } from 'react-router-dom'
import { useTranslation } from '../context/LocaleContext.jsx'

/** Text button back to the marketing homepage (used on store header). */
export default function MainSiteButton() {
  const { t } = useTranslation()
  return (
    <Link to="/" className="site-main-site-btn">
      <span className="site-main-site-btn__arrow" aria-hidden>
        ←
      </span>
      <span className="site-main-site-btn__label">{t('nav.mainSite')}</span>
    </Link>
  )
}
