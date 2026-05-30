import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
]

const PAGE_LINKS = [
  { to: '/projects', label: 'Projects' },
  { to: '/command', label: 'Submit command' },
  { to: '/track', label: 'Track command' },
]

export default function LandingNav() {
  const [active, setActive] = useState('home')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY + 120
      for (const s of [...SECTIONS].reverse()) {
        const el = document.getElementById(s.id)
        if (el && el.offsetTop <= y) {
          setActive(s.id)
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const scrollTo = (id) => {
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-dark-border bg-dark-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => scrollTo('home')}
          className="truncate text-sm font-semibold tracking-wide text-dark-text"
        >
          EmbeddedGrid
        </button>

        <nav className="hidden items-center gap-5 lg:flex">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollTo(s.id)}
              className={`text-sm ${
                active === s.id ? 'text-dark-text underline underline-offset-4' : 'text-dark-muted hover:text-dark-text'
              }`}
            >
              {s.label}
            </button>
          ))}
          {PAGE_LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="text-sm text-dark-muted hover:text-dark-text">
              {label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          className="rounded border border-dark-border p-2 text-dark-muted hover:text-dark-text lg:hidden"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-[53px] z-40 bg-black/60 lg:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="relative z-50 max-h-[calc(100vh-53px)] overflow-y-auto border-b border-dark-border bg-dark-panel px-4 py-3 lg:hidden">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-dark-muted">Page</p>
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => scrollTo(s.id)}
                className={`mb-1 block w-full rounded px-3 py-2.5 text-left text-sm ${
                  active === s.id ? 'bg-dark-border text-dark-text' : 'text-dark-muted'
                }`}
              >
                {s.label}
              </button>
            ))}
            <p className="mb-2 mt-4 text-[10px] font-medium uppercase tracking-wider text-dark-muted">Lab</p>
            {PAGE_LINKS.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setMenuOpen(false)}
                className="mb-1 block rounded px-3 py-2.5 text-sm text-dark-muted hover:bg-dark-border/40 hover:text-dark-text"
              >
                {label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  )
}
