import { db } from "../config/db";

export type PushPreferenceType = "alertes" | "dossiers";

export default class PushSubscriptionRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  /** Crée ou rattache l'abonnement (un même navigateur peut changer de compte). */
  async upsert(data: {
    user_id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    user_agent: string | null;
    alertes?: boolean;
    dossiers?: boolean;
  }) {
    const prefs = {
      ...(data.alertes !== undefined ? { alertes: data.alertes } : {}),
      ...(data.dossiers !== undefined ? { dossiers: data.dossiers } : {}),
    };
    return await this.db.pushSubscription.upsert({
      where: { endpoint: data.endpoint },
      create: {
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent,
        ...prefs,
        user: { connect: { id_user: data.user_id } },
      },
      update: {
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.user_agent,
        ...prefs,
        user: { connect: { id_user: data.user_id } },
      },
    });
  }

  async getByEndpointForUser(user_id: string, endpoint: string) {
    return await this.db.pushSubscription.findFirst({ where: { user_id, endpoint } });
  }

  async updatePreferences(id_subscription: string, prefs: { alertes?: boolean; dossiers?: boolean }) {
    return await this.db.pushSubscription.update({ where: { id_subscription }, data: prefs });
  }

  async deleteForUser(user_id: string, endpoint: string) {
    return await this.db.pushSubscription.deleteMany({ where: { user_id, endpoint } });
  }

  async deleteById(id_subscription: string) {
    return await this.db.pushSubscription.deleteMany({ where: { id_subscription } });
  }

  async getForUser(user_id: string, type?: PushPreferenceType) {
    return await this.db.pushSubscription.findMany({
      where: { user_id, ...(type ? { [type]: true } : {}) },
    });
  }
}
