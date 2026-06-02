import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useTranslation } from '../context/LocaleContext.jsx'
import { useUserSession } from '../hooks/useUserSession.js'

export default function NavAccount() {
  const { t } = useTranslation()
  const { user, loading, hasActivePack } = useUserSession()

  if (loading) {
    return (
      <span className="inline-block h-9 w-20 animate-pulse rounded-md border border-dark-border bg-dark-panel" />
    )
  }

  if (!user) {
    return (
      <Link to="/account" className="nav-sign-in-btn">
        <User className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">{t('common.signIn')}</span>
      </Link>
    )
  }

  return (
    <Link to="/account" className="nav-account-chip" title={t('nav.account')}>
      <User className="h-4 w-4 shrink-0 text-lab-cyan" />
      <span className="max-w-[6rem] truncate font-medium sm:max-w-[8rem]">{user.username}</span>
      {hasActivePack && (
        <span className="nav-account-badge hidden sm:inline">{t('common.active')}</span>
      )}
    </Link>
  )
}
