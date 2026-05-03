import { useState, useEffect, useCallback } from 'react'
import { getMe, logout as apiLogout } from '../api/auth'
import type { User } from '../types/user'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('token')))

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const u = await getMe()
      setUser(u)
    } catch {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!localStorage.getItem('token')) return

    let cancelled = false

    void getMe()
      .then((u) => {
        if (!cancelled) setUser(u)
      })
      .catch(() => {
        localStorage.removeItem('token')
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const logout = () => {
    apiLogout()
    setUser(null)
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout,
    refresh: checkAuth,
  }
}
