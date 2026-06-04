import { useEffect, useState } from 'react'
import { fetchPaymentConfig } from '../api/client.js'

/** Store catalog and checkout are Algeria-only; prices are always DZD. */
export function useStoreRegion() {
  const [state, setState] = useState({
    loading: true,
    isAlgeria: false,
    chargily: false,
  })

  useEffect(() => {
    let cancelled = false

    const apply = (cfg) => {
      setState({
        loading: false,
        isAlgeria: Boolean(cfg.store_available ?? cfg.is_algeria),
        chargily: Boolean(cfg.chargily),
      })
    }

    const load = async (retries = 2) => {
      for (let attempt = 0; attempt < retries; attempt += 1) {
        try {
          const cfg = await fetchPaymentConfig({ forceRefresh: attempt > 0 })
          if (!cancelled) apply(cfg)
          return
        } catch {
          if (attempt < retries - 1) {
            await new Promise((r) => setTimeout(r, 1500))
          }
        }
      }
      if (!cancelled) setState({ loading: false, isAlgeria: false, chargily: false })
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    ...state,
    useDzd: true,
  }
}
