import webpush, { type PushSubscription as WebPushSubscription, WebPushError } from "web-push";
import PushSubscriptionRepository, { type PushPreferenceType } from "../repositories/PushSubscriptionRepository";
import { HttpException } from "../utils/HttpExceptions";

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env as { [key: string]: string };

export type PushPayload = {
  title: string;
  body: string;
  /** Chemin ouvert au clic, ex. "/?vue=alertes" */
  url?: string;
  /** Une nouvelle notification avec le même tag remplace la précédente */
  tag?: string;
};

const pushSubscriptionRepository = new PushSubscriptionRepository();

let configured: boolean | null = null;
function ensureConfigured(): boolean {
  if (configured !== null) return configured;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[push]: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY manquantes, notifications push désactivées");
    configured = false;
    return configured;
  }
  try {
    webpush.setVapidDetails(VAPID_SUBJECT || "mailto:contact@iecameroun.cm", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    configured = true;
  } catch (err) {
    console.error("[push]: clés VAPID invalides:", err instanceof Error ? err.message : err);
    configured = false;
  }
  return configured;
}

export default class PushService {
  private readonly repository: PushSubscriptionRepository;
  constructor() {
    this.repository = pushSubscriptionRepository;
  }

  isEnabled() {
    return ensureConfigured();
  }

  getPublicKey() {
    if (!ensureConfigured()) throw new HttpException(503, "Notifications push non configurées sur le serveur");
    return VAPID_PUBLIC_KEY;
  }

  /**
   * Envoie une notification à tous les appareils de l'utilisateur qui ont
   * activé ce type. Ne lève jamais d'erreur : un échec de push ne doit pas
   * casser une alerte ou une collecte de flux.
   */
  async sendToUser(userId: string, type: PushPreferenceType | null, payload: PushPayload) {
    if (!ensureConfigured()) return 0;
    const subscriptions = await this.repository.getForUser(userId, type ?? undefined);
    let sent = 0;
    await Promise.all(
      subscriptions.map(async (sub) => {
        const target: WebPushSubscription = { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } };
        try {
          await webpush.sendNotification(target, JSON.stringify(payload), { TTL: 24 * 60 * 60, urgency: "normal" });
          sent++;
        } catch (err) {
          if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
            // Abonnement expiré ou révoqué par le navigateur : on le retire
            await this.repository.deleteById(sub.id_subscription);
          } else {
            console.error("[push]: envoi échoué:", err instanceof WebPushError ? `HTTP ${err.statusCode} ${err.body}` : err);
          }
        }
      })
    );
    return sent;
  }
}
