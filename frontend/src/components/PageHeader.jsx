import { Link } from 'react-router-dom'
import LanguageSwitcher from './LanguageSwitcher.jsx'
import NavAccount from './NavAccount.jsx'
import SiteBrand from './SiteBrand.jsx'
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
          <SiteBrand variant="lab" />

          <SiteNavDesktop />

          <div className="site-header-actions">
            {storeVisible && (
              <Link to="/store" className="store-entry-btn hidden sm:inline-flex">
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
