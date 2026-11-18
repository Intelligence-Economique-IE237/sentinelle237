import { useCallback } from "react"
import { useNavigate } from "react-router-dom"

/** Vues de l'application principale (gérées par pages/Dashboard.tsx). */
export type SelectedView =
  | { type: "today" }
  | { type: "later" }
  | { type: "annotated" }
  | { type: "alertes" }
  | { type: "dossiers" }
  | { type: "marches" }
  | { type: "dashboard" }
  | { type: "feed"; feedId: string; feedName: string }

/** Élément actif dans la navigation : une vue, ou la page de recherche. */
export type ActiveNav = SelectedView | { type: "recherche" } | { type: "gestion" } | { type: "compte" }

export interface NavCounts {
  today?: number
  later?: number
  annotated?: number
  alertes?: number
  dossiers?: number
}

export const VIEW_META: Record<ActiveNav["type"], { title: string; description: string }> = {
  today: { title: "Aujourd’hui", description: "Articles publiés aujourd’hui, tous flux confondus." },
  later: { title: "À lire plus tard", description: "Les articles que tu as mis de côté." },
  annotated: { title: "Annotées", description: "Les articles sur lesquels tu as laissé une note." },
  alertes: { title: "Alertes", description: "Tes mots-clés surveillés en continu." },
  dossiers: { title: "Enquêtes", description: "Tes dossiers d’investigation." },
  marches: { title: "Marchés", description: "Devises et matières premières." },
  dashboard: { title: "Tableau de bord", description: "Ta veille en un coup d’œil." },
  feed: { title: "", description: "Tous les articles de cette source." },
  recherche: { title: "Recherche", description: "Un mot-clé, deux langues, tes flux et le web." },
  gestion: { title: "Mes flux", description: "Les sources que tu suis." },
  compte: { title: "Mon compte", description: "Profil, sécurité et confidentialité." },
}

export function isSameView(a: ActiveNav, b: ActiveNav) {
  if (a.type !== b.type) return false
  if (a.type === "feed" && b.type === "feed") return a.feedId === b.feedId
  return true
}

/**
 * Navigation commune à toutes les pages qui partagent la sidebar.
 * Dashboard gère lui-même ses vues (via `onSelectView`) ; ailleurs on
 * rejoint "/" en transmettant la vue demandée dans l'état de navigation.
 */
export function useMainNavigation(onSelectView?: (view: SelectedView) => void) {
  const navigate = useNavigate()
  return useCallback(
    (target: ActiveNav) => {
      if (target.type === "recherche") return navigate("/recherche")
      if (target.type === "gestion") return navigate("/dashboard/feeds")
      if (target.type === "compte") return navigate("/account")
      if (target.type === "dashboard") return navigate("/tableau-de-bord")
      if (onSelectView) return onSelectView(target)
      navigate("/", { state: { view: target } })
    },
    [navigate, onSelectView]
  )
}
