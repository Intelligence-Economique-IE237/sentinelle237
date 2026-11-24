import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/AuthContext"
import { updateOnboarding } from "@/lib/api/users"
import { GuideContext, type GuideContextValue } from "./guide-context"
import { Onboarding, type OnboardingResult } from "./Onboarding"
import { Tour } from "./Tour"

const HORS_APP = ["/login", "/signup"]
const FIL = ["/", "/dashboard"]

/**
 * Parcours d'accueil (nouveaux comptes) et visite guidée.
 * - Onboarding : tant que `onboarding_termine_at` est vide.
 * - Visite : proposée une fois automatiquement, relançable depuis le menu du compte.
 */
export function GuideProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const [tourOpen, setTourOpen] = useState(false)
  const [tourRun, setTourRun] = useState(0)
  const [onboardingFini, setOnboardingFini] = useState(false)
  const autoProposee = useRef(false)
  const drawerRef = useRef<(open: boolean) => void>(() => {})

  const dansApp = !HORS_APP.includes(pathname) && !pathname.startsWith("/admin")
  const afficherOnboarding = Boolean(user) && dansApp && !user?.onboarding_termine_at && !onboardingFini

  const startTour = useCallback(() => {
    autoProposee.current = true
    if (!FIL.includes(window.location.pathname)) navigate("/")
    setTourRun((n) => n + 1)
    setTourOpen(true)
  }, [navigate])

  const marquer = useCallback(
    (payload: { onboarding?: boolean; tutoriel?: boolean }) =>
      updateOnboarding(payload)
        .then(setUser)
        .catch(() => undefined),
    [setUser]
  )

  // Visite proposée une seule fois, sur le fil, aux comptes qui ne l'ont jamais vue
  useEffect(() => {
    if (!user || !dansApp || afficherOnboarding || tourOpen) return
    if (user.tutoriel_termine_at || autoProposee.current || !FIL.includes(pathname)) return
    const t = window.setTimeout(() => {
      if (autoProposee.current) return
      autoProposee.current = true
      setTourRun((n) => n + 1)
      setTourOpen(true)
    }, 900)
    return () => window.clearTimeout(t)
  }, [user, dansApp, afficherOnboarding, tourOpen, pathname])

  const endTour = useCallback(
    () => {
      setTourOpen(false)
      drawerRef.current(false)
      if (!user?.tutoriel_termine_at) marquer({ tutoriel: true })
    },
    [user?.tutoriel_termine_at, marquer]
  )

  const finishOnboarding = useCallback(
    async ({ startTour: lancer }: OnboardingResult) => {
      autoProposee.current = true
      await marquer(lancer ? { onboarding: true } : { onboarding: true, tutoriel: true })
      setOnboardingFini(true)
      if (lancer) startTour()
    },
    [marquer, startTour]
  )

  const setDrawer = useCallback((open: boolean) => drawerRef.current(open), [])

  const value = useMemo<GuideContextValue>(
    () => ({
      startTour,
      registerDrawer: (setOpen) => {
        drawerRef.current = setOpen
        return () => {
          if (drawerRef.current === setOpen) drawerRef.current = () => {}
        }
      },
    }),
    [startTour]
  )

  return (
    <GuideContext.Provider value={value}>
      {/* Pendant l'accueil, l'app derrière n'est ni cliquable ni atteignable au clavier */}
      <div className="contents" inert={afficherOnboarding || undefined}>
        {children}
      </div>
      {afficherOnboarding && user && <Onboarding user={user} onFinish={finishOnboarding} />}
      {tourOpen && !afficherOnboarding && <Tour key={tourRun} onEnd={endTour} setDrawer={setDrawer} />}
    </GuideContext.Provider>
  )
}
