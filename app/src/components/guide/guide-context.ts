import { createContext, useContext } from "react"

export type GuideContextValue = {
  /** Lance la visite guidée (revient au fil d'actualité si besoin). */
  startTour: () => void
  /** La coque de l'app enregistre ici l'ouverture de son tiroir mobile. */
  registerDrawer: (setOpen: (open: boolean) => void) => () => void
}

export const GuideContext = createContext<GuideContextValue>({
  startTour: () => {},
  registerDrawer: () => () => {},
})

export function useGuide() {
  return useContext(GuideContext)
}
