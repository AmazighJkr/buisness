import { Link } from 'react-router-dom'
import { User } from 'lucide-react'
import { useUserSession } from '../hooks/useUserSession.js'

/** Always-visible sign in / account chip for the top navigation bar. */
export default function NavAccount({ compact = false }) {
  const { user, loading, hasActivePack } = useUserSession()

  if (loading) {
    return (
      <span className="inline-block h-9 w-16 animate-pulse rounded border border-dark-border bg-dark-panel" />
    )
  }

  if (!user) {
    return (
      <Link
        to="/account"
        className="inline-flex shrink-0 items-center gap-1.5 rounded border border-lab-cyan px-2.5 py-1.5 text-xs font-medium text-lab-cyan sm:px-3 sm:text-sm"
      >
        <User className="h-4 w-4 shrink-0" />
        {compact ? 'Sign in' : 'Sign in'}
      </Link>
    )
  }

  return (
    <Link
      to="/account"
      className="inline-flex max-w-[9rem] shrink-0 items-center gap-1.5 rounded border border-dark-border bg-dark-panel px-2.5 py-1.5 text-xs sm:max-w-[11rem] sm:text-sm"
      title="Your account"
    >
      <User className="h-4 w-4 shrink-0 text-lab-cyan" />
      <span className="truncate font-medium text-dark-text">{user.username}</span>
      {hasActivePack && (
        <span className="hidden shrink-0 rounded bg-lab-cyan/15 px-1.5 py-0.5 text-[10px] text-lab-cyan sm:inline">
          Active
        </span>
      )}
    </Link>
  )
}
