import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { getAccessToken, subscribeToToken } from "@/lib/api/tokenStore"
import { refreshAccessToken } from "@/lib/api/client"
import { getMe } from "@/lib/api/users"
import type { User } from "@/lib/api/types"

type AuthContextValue = {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  setUser: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(getAccessToken())
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToToken(setToken)
    return unsubscribe
  }, [])

  useEffect(() => {
    refreshAccessToken()
      .then((newToken) => {
        if (newToken) {
          return getMe().then(setUser).catch(() => setUser(null))
        }
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (token) {
      getMe().then(setUser).catch(() => setUser(null))
    } else {
      setUser(null)
    }
  }, [token])

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token, isLoading, user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}