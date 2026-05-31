import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useUserSession } from '../hooks/useUserSession.js'

/** Always-visible sign in / account chip for the top navigation bar. */
export default function NavAccount({ compact = false }) {
  const { user, loading, hasActivePack } = useUserSession()

  if (loading) {
    return (
      <span className="inline-block h-9 w-16 animate-pulse rounded-md border border-dark-border bg-dark-panel" />
    )
  }

  if (!user) {
    return (
      <Link
        to="/account"
        className="btn-primary shrink-0 !px-2.5 !py-1.5 text-xs sm:!px-3 sm:text-sm"
      >
        <User className="h-4 w-4 shrink-0" />
        Sign in
      </Link>
    )
  }

  return (
    <Link
      to="/account"
      className="inline-flex max-w-[9rem] shrink-0 items-center gap-1.5 rounded-md border border-dark-border bg-dark-panel px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--eg-border-strong)] sm:max-w-[11rem] sm:text-sm"
      title="Your account"
    >
      <User className="h-4 w-4 shrink-0 text-lab-cyan" />
      <span className="truncate font-medium">{user.username}</span>
      {hasActivePack && !compact && (
        <span className="hidden shrink-0 rounded bg-[color-mix(in_srgb,var(--eg-accent)_18%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-lab-cyan sm:inline">
          Pro
        </span>
      )}
    </Link>
  )
}
