// src/context/CacheContext.tsx
import { createContext, useContext, useRef, type ReactNode } from "react"

interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
}

type Listener = () => void

interface CacheContextValue {
  get: <T>(key: string, ttlMs: number) => T | null
  set: <T>(key: string, data: T) => void
  invalidate: (key: string) => void
  subscribe: (key: string, listener: Listener) => () => void
}

const CacheContext = createContext<CacheContextValue | null>(null)

export function CacheProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef(new Map<string, CacheEntry>())
  const listenersRef = useRef(new Map<string, Set<Listener>>())

  function notify(key: string) {
    listenersRef.current.get(key)?.forEach((listener) => listener())
  }

  const value: CacheContextValue = {
    get: (key, ttlMs) => {
      const entry = storeRef.current.get(key)
      if (entry && Date.now() - entry.timestamp < ttlMs) return entry.data as never
      return null
    },
    set: (key, data) => {
      storeRef.current.set(key, { data, timestamp: Date.now() })
      notify(key) // ← prévient toutes les instances de useCachedFetch abonnées à cette clé
    },
    invalidate: (key) => {
      storeRef.current.delete(key)
      notify(key)
    },
    subscribe: (key, listener) => {
      if (!listenersRef.current.has(key)) {
        listenersRef.current.set(key, new Set())
      }
      listenersRef.current.get(key)!.add(listener)
      return () => {
        listenersRef.current.get(key)?.delete(listener)
      }
    },
  }

  return <CacheContext.Provider value={value}>{children}</CacheContext.Provider>
}

export function useCache() {
  const ctx = useContext(CacheContext)
  if (!ctx) throw new Error("useCache doit être utilisé à l'intérieur de <CacheProvider>")
  return ctx
}