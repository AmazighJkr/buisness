import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyTheme,
  getStoredPreference,
  getSystemTheme,
  resolveTheme,
  storePreference,
} from '../theme/theme.js'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => getStoredPreference())
  const [resolved, setResolved] = useState(() => resolveTheme(getStoredPreference()))

  useEffect(() => {
    const next = resolveTheme(preference)
    setResolved(next)
    applyTheme(next)
  }, [preference])

  useEffect(() => {
    if (preference !== 'system') return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = getSystemTheme()
      setResolved(next)
      applyTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [preference])

  const setThemePreference = useCallback((next) => {
    storePreference(next)
    setPreference(next)
  }, [])

  const toggleResolved = useCallback(() => {
    const next = resolved === 'dark' ? 'light' : 'dark'
    setThemePreference(next)
  }, [resolved, setThemePreference])

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setThemePreference,
      toggleResolved,
      isDark: resolved === 'dark',
    }),
    [preference, resolved, setThemePreference, toggleResolved],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
