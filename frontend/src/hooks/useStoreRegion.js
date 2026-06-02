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
    fetchPaymentConfig({ forceRefresh: true })
      .then((cfg) => {
        if (cancelled) return
        setState({
          loading: false,
          isAlgeria: Boolean(cfg.store_available ?? cfg.is_algeria),
          chargily: Boolean(cfg.chargily),
        })
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, isAlgeria: false, chargily: false })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return {
    ...state,
    useDzd: true,
  }
}
