import { apiClient } from "./client"

export interface PushPreferences {
  alertes: boolean
  dossiers: boolean
}

export interface PushSubscriptionState extends PushPreferences {
  endpoint: string
}

export async function getPushPublicKey(): Promise<string> {
  const { data } = await apiClient.get<{ publicKey: string }>("/push/public-key")
  return data.publicKey
}

export async function getPushStatus(endpoint: string): Promise<PushSubscriptionState | null> {
  const { data } = await apiClient.get<{ subscription: PushSubscriptionState | null }>("/push/status", {
    params: { endpoint },
  })
  return data.subscription
}

export async function savePushSubscription(
  subscription: PushSubscriptionJSON,
  prefs?: Partial<PushPreferences>
): Promise<PushSubscriptionState> {
  const { data } = await apiClient.post<{ subscription: PushSubscriptionState }>("/push/subscribe", {
    endpoint: subscription.endpoint,
    keys: subscription.keys,
    ...prefs,
  })
  return data.subscription
}

export async function updatePushPreferences(endpoint: string, prefs: Partial<PushPreferences>) {
  const { data } = await apiClient.patch<{ subscription: PushSubscriptionState }>("/push/preferences", {
    endpoint,
    ...prefs,
  })
  return data.subscription
}

export async function deletePushSubscription(endpoint: string) {
  await apiClient.post("/push/unsubscribe", { endpoint })
}

export async function sendTestPush() {
  await apiClient.post("/push/test")
}
