import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'

const MODES = [
  { id: 'light', icon: Sun, label: 'Light' },
  { id: 'dark', icon: Moon, label: 'Dark' },
  { id: 'system', icon: Monitor, label: 'System' },
]

export default function ThemeToggle({ compact = false }) {
  const { preference, setThemePreference, toggleResolved, isDark } = useTheme()

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleResolved}
        className="theme-toggle-btn"
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Light mode' : 'Dark mode'}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    )
  }

  return (
    <div className="theme-toggle-group" role="group" aria-label="Color theme">
      {MODES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => setThemePreference(id)}
          className={`theme-toggle-option ${preference === id ? 'theme-toggle-option-active' : ''}`}
          aria-pressed={preference === id}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="sr-only">{label}</span>
        </button>
      ))}
    </div>
  )
}
