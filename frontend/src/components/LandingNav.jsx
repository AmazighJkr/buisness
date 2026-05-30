import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'services', label: 'Services' },
  { id: 'contact', label: 'Contact' },
]

export default function LandingNav() {
  const [active, setActive] = useState('home')

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

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-dark-border bg-dark-bg/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => scrollTo('home')}
          className="text-sm font-semibold tracking-wide text-dark-text"
        >
          EmbeddedGrid
        </button>

        <nav className="hidden items-center gap-6 sm:flex">
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
          <Link
            to="/projects"
            className="text-sm text-dark-muted hover:text-dark-text"
          >
            Projects
          </Link>
          <Link
            to="/command"
            className="text-sm text-dark-muted hover:text-dark-text"
          >
            Submit command
          </Link>
          <Link
            to="/track"
            className="text-sm text-dark-muted hover:text-dark-text"
          >
            Track command
          </Link>
        </nav>

        <div className="flex gap-3 sm:hidden">
          <Link to="/command" className="text-sm text-dark-muted">
            Command
          </Link>
          <Link to="/track" className="text-sm text-dark-muted">
            Track
          </Link>
          <Link to="/projects" className="text-sm text-dark-muted">
            Projects
          </Link>
        </div>
      </div>
    </header>
  )
}
