import { PanelLeft } from 'lucide-react'
import { useTranslation } from '../context/LocaleContext.jsx'

/** Narrow strip to reopen a collapsed category sidebar (desktop + mobile). */
export default function SidebarRail({ onOpen, controlsId }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      className="sidebar-rail"
      aria-expanded="false"
      aria-controls={controlsId}
      aria-label={t('nav.showCategories')}
      title={t('nav.showCategories')}
    >
      <PanelLeft className="h-5 w-5 shrink-0" aria-hidden />
    </button>
  )
}
