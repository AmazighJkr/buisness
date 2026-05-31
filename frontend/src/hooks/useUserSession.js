import { useCallback, useEffect, useState } from 'react'
import { fetchUserMe, userLogout } from '../api/client.js'

export function notifyUserSessionChanged() {
  window.dispatchEvent(new Event('user-session-changed'))
}

export function useUserSession() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const me = await fetchUserMe()
    setUser(me)
    return me
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
    const onChange = () => {
      refresh()
    }
    window.addEventListener('user-session-changed', onChange)
    return () => window.removeEventListener('user-session-changed', onChange)
  }, [refresh])

  const logout = useCallback(() => {
    userLogout()
    setUser(null)
    notifyUserSessionChanged()
  }, [])

  return {
    user,
    loading,
    refresh,
    logout,
    isLoggedIn: Boolean(user),
    hasActivePack: Boolean(user?.subscriptions?.length),
  }
}
