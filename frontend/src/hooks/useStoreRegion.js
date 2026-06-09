import { useEffect, useState } from 'react'
import { fetchPaymentConfig } from '../api/client.js'

/** Store catalog and checkout are Algeria-only; prices are always DZD. */
export function useStoreRegion() {
  const [state, setState] = useState({
    loading: true,
    isAlgeria: false,
    chargily: false,
    whatsappUrl: '',
    contactEmail: '',
  })

  useEffect(() => {
    let cancelled = false

    const apply = (cfg) => {
      const isDev = import.meta.env.DEV
      const isAlgeria = Boolean(cfg.store_available ?? cfg.is_algeria) || isDev
      setState({
        loading: false,
        isAlgeria,
        chargily: Boolean(cfg.chargily),
        whatsappUrl: cfg.whatsapp_support_url || '',
        contactEmail: cfg.contact_email || '',
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
      if (!cancelled) {
        setState({
          loading: false,
          isAlgeria: import.meta.env.DEV,
          chargily: false,
          whatsappUrl: '',
          contactEmail: '',
        })
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    ...state,
    useDzd: true,
    /** True only when geo resolved and visitor is in Algeria — use to hide store nav. */
    storeVisible: !state.loading && Boolean(state.isAlgeria),
  }
}
