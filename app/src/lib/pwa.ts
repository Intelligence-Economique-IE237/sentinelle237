/**
 * Application web installable : enregistrement du service worker et
 * gestion de l'invitation à installer (« Ajouter à l'écran d'accueil »).
 */
import { useSyncExternalStore } from "react"
import { registerSW } from "virtual:pwa-register"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
}

/** À appeler une fois, avant le rendu de l'application. */
export function setupPwa() {
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    registerSW({ immediate: true })
  }
  // L'évènement peut arriver très tôt : on le capte avant le montage de React
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    emit()
  })
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null
    emit()
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * - "prompt" : le navigateur propose l'installation (Chrome, Edge, Android)
 * - "ios"    : Safari iOS, installation manuelle via « Partager »
 * - null     : déjà installée, ou navigateur sans installation
 */
export function useInstallAvailability(): "prompt" | "ios" | null {
  const hasPrompt = useSyncExternalStore(subscribe, () => deferredPrompt !== null)
  if (isStandalone()) return null
  if (hasPrompt) return "prompt"
  return isIos() ? "ios" : null
}

export async function promptInstall() {
  if (!deferredPrompt) return false
  await deferredPrompt.prompt()
  const { outcome } = await deferredPrompt.userChoice
  deferredPrompt = null
  emit()
  return outcome === "accepted"
}

/** État de la connexion réseau. */
export function useOnline() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener("online", cb)
      window.addEventListener("offline", cb)
      return () => {
        window.removeEventListener("online", cb)
        window.removeEventListener("offline", cb)
      }
    },
    () => navigator.onLine
  )
}
