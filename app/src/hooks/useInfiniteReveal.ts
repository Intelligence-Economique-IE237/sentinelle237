import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Révèle une liste déjà chargée par tranches de `step` éléments
 * (« scroll reveal ») : `visible` grandit quand `revealMore` est appelé.
 * Se réinitialise quand `resetKey` change (ex. changement de vue).
 */
export function useRevealCount(total: number, step: number, resetKey: string) {
  const [state, setState] = useState({ key: resetKey, count: step })
  // Réinitialisation pendant le rendu (pas d'effet → pas de rendu en cascade)
  const current = state.key === resetKey ? state : { key: resetKey, count: step }
  if (current !== state) setState(current)

  const revealMore = useCallback(
    () => setState((s) => ({ key: s.key, count: Math.min(total, s.count + step) })),
    [total, step]
  )
  return { visible: Math.min(current.count, total), hasMore: current.count < total, revealMore }
}

/**
 * Pagination serveur cumulée pour le défilement infini :
 * charge la page 1, puis la suivante à chaque `loadMore`.
 */
export function useServerInfinite<T>(
  resetKey: string,
  fetchPage: (page: number) => Promise<{ data: T[]; totalPages: number; total: number }>,
  enabled = true
) {
  const [items, setItems] = useState<T[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchRef = useRef(fetchPage)
  const inflight = useRef(false)
  const generation = useRef(0)

  useEffect(() => {
    fetchRef.current = fetchPage
  })

  const load = useCallback(async (nextPage: number, replace: boolean) => {
    if (inflight.current && !replace) return
    inflight.current = true
    const gen = replace ? ++generation.current : generation.current
    setLoading(true)
    try {
      const res = await fetchRef.current(nextPage)
      if (gen !== generation.current) return
      setItems((prev) => (replace ? res.data : [...prev, ...res.data]))
      setPage(nextPage)
      setTotalPages(Math.max(1, res.totalPages))
      setTotal(res.total)
    } finally {
      if (gen === generation.current) {
        inflight.current = false
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    load(1, true).catch(() => {})
  }, [resetKey, enabled, load])

  const loadMore = useCallback(() => {
    if (page < totalPages) load(page + 1, false).catch(() => {})
  }, [page, totalPages, load])

  const refresh = useCallback(() => load(1, true), [load])

  return { items, total, loading, hasMore: page < totalPages, loadMore, refresh, initialLoading: loading && page === 0 }
}
