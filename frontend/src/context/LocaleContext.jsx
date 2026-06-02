import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { detectBrowserLocale, resolveMessage } from '../i18n/translations.js'

const STORAGE_KEY = 'eg_locale'

const LocaleContext = createContext(null)

function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'fr') return stored
  } catch {
    /* ignore */
  }
  return detectBrowserLocale()
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale)

  const setLocale = useCallback((next) => {
    const value = next === 'fr' ? 'fr' : 'en'
    setLocaleState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = value
  }, [])

  const t = useCallback((key) => resolveMessage(locale, key), [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export function useTranslation() {
  return useLocale()
}
