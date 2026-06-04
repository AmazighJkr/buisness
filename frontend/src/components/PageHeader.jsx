import { Link } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import NavAccount from './NavAccount.jsx'
import SiteHomeButton from './SiteHomeButton.jsx'
import SiteSubheader from './SiteSubheader.jsx'
import { SiteNavDesktop, SiteNavMobile, SiteNavProvider } from './SiteNav.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useStoreRegion } from '../hooks/useStoreRegion.js'

export default function PageHeader({ highlight = '', subheader = null }) {
  const { t } = useTranslation()
  const { storeVisible } = useStoreRegion()

  return (
    <SiteNavProvider highlight={highlight}>
      <header className="site-header lab-header">
        <div className="site-header-inner lab-header__inner">
          <SiteHomeButton />

          <Link to="/projects" className="site-logo site-header-brand">
            Embedded<span>Grid</span>
          </Link>

          <SiteNavDesktop />

          <div className="site-header-actions">
            {storeVisible && (
              <Link to="/shop" className="store-entry-btn hidden sm:inline-flex">
                {t('nav.store')}
              </Link>
            )}
            <LanguageSwitcher compact />
            <ThemeToggle compact />
            <NavAccount />
            <SiteNavMobile />
          </div>
        </div>
        <SiteSubheader>{subheader}</SiteSubheader>
      </header>
    </SiteNavProvider>
  )
}
