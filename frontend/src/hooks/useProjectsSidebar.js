import { useCallback, useState } from 'react'

const STORAGE_KEY = 'embeddedgrid.projectsSidebar'

function readInitialOpen() {
  if (typeof window === 'undefined') return false
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved === '0' || saved === '1') return saved === '1'
  } catch {
    /* private mode */
  }
  return window.matchMedia('(min-width: 1024px)').matches
}

/** Persisted open/closed state for the projects category panel (mobile drawer + desktop column). */
export function useProjectsSidebar() {
  const [open, setOpenState] = useState(readInitialOpen)

  const setOpen = useCallback((value) => {
    setOpenState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value
      try {
        sessionStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return [open, setOpen]
}
