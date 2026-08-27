// src/hooks/useCachedFetch.ts
import { useCallback, useEffect, useState } from "react"
import { useCache } from "@/context/CacheContext"

export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
  deps: unknown[] = [],
  pollMs?: number
) {
  const cache = useCache()
  const [data, setData] = useState<T | null>(() => cache.get<T>(key, ttlMs))
  const [loading, setLoading] = useState(() => cache.get<T>(key, ttlMs) === null)

  const refresh = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const result = await fetcher()
        setData(result)
        cache.set(key, result) // notifie automatiquement les autres instances via subscribe
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  )

  // Chargement initial + revalidation silencieuse
  useEffect(() => {
    const cached = cache.get<T>(key, ttlMs)
    if (cached) {
      setData(cached)
      setLoading(false)
      refresh(true)
    } else {
      refresh(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Polling optionnel
  useEffect(() => {
    if (!pollMs) return
    const interval = setInterval(() => refresh(true), pollMs)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs, ...deps])

  // Nouveau : écoute les mises à jour de CETTE clé faites par n'importe quelle autre instance
  useEffect(() => {
    const unsubscribe = cache.subscribe(key, () => {
      const fresh = cache.get<T>(key, ttlMs)
      if (fresh !== null) {
        setData(fresh)
        setLoading(false)
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { data, loading, refresh }
}