/**
 * Notifications push (Web Push) côté navigateur : permission, abonnement
 * auprès du service de push du navigateur, et enregistrement côté API.
 */
import { isIos, isStandalone } from "./pwa"
import {
  deletePushSubscription,
  getPushPublicKey,
  getPushStatus,
  savePushSubscription,
  type PushPreferences,
  type PushSubscriptionState,
} from "./api/push"

/**
 * - "ok"            : le navigateur peut recevoir des notifications
 * - "ios-install"   : iPhone/iPad, il faut d'abord ajouter l'app à l'écran d'accueil
 * - "unsupported"   : navigateur sans Web Push (ou page non sécurisée)
 * - "dev"           : service worker désactivé en développement
 */
export type PushSupport = "ok" | "ios-install" | "unsupported" | "dev"

export function getPushSupport(): PushSupport {
  if (!import.meta.env.PROD) return "dev"
  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  if (isIos() && !isStandalone()) return "ios-install"
  if (!hasApis || !window.isSecureContext) return "unsupported"
  return "ok"
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

async function getRegistration() {
  return await navigator.serviceWorker.ready
}

/** Abonnement de cet appareil tel que l'API le connaît (null si désactivé). */
export async function loadPushState(): Promise<PushSubscriptionState | null> {
  if (getPushSupport() !== "ok" || Notification.permission !== "granted") return null
  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return null
  const state = await getPushStatus(subscription.endpoint)
  if (state) return state
  // Abonné côté navigateur mais inconnu de l'API (autre compte, base réinitialisée…) : on le réenregistre
  return await savePushSubscription(subscription.toJSON())
}

export class PushPermissionError extends Error {}

export async function enablePush(prefs?: Partial<PushPreferences>): Promise<PushSubscriptionState> {
  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new PushPermissionError(
      permission === "denied"
        ? "Notifications bloquées : autorise-les dans les réglages du navigateur pour ce site."
        : "Autorisation non accordée."
    )
  }
  const registration = await getRegistration()
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    const publicKey = await getPushPublicKey()
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
  }
  return await savePushSubscription(subscription.toJSON(), prefs)
}

export async function disablePush(): Promise<void> {
  const registration = await getRegistration()
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  await deletePushSubscription(subscription.endpoint).catch(() => undefined)
  await subscription.unsubscribe()
}

/**
 * À la déconnexion : l'appareil ne doit plus recevoir les notifications de ce
 * compte. Ne bloque jamais la déconnexion plus de 3 s.
 */
export async function disablePushOnLogout(): Promise<void> {
  if (getPushSupport() !== "ok" || Notification.permission !== "granted") return
  await Promise.race([disablePush().catch(() => undefined), new Promise((r) => setTimeout(r, 3000))])
}
