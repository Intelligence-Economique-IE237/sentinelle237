import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../middlewares/Auth";
import PushService from "../services/PushService";
import PushSubscriptionRepository from "../repositories/PushSubscriptionRepository";
import { HttpException } from "../utils/HttpExceptions";
import type { PushEndpointInput, PushPreferencesInput, PushSubscribeInput } from "../validations/PushValidations";

const pushService = new PushService();
const repository = new PushSubscriptionRepository();

function serialize(sub: { endpoint: string; alertes: boolean; dossiers: boolean }) {
  return { endpoint: sub.endpoint, alertes: sub.alertes, dossiers: sub.dossiers };
}

export default class PushController {
  async getPublicKey(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      res.status(200).json({ publicKey: pushService.getPublicKey() });
    } catch (err) {
      next(err);
    }
  }

  /** État de l'abonnement de cet appareil (identifié par son endpoint). */
  async getStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const endpoint = typeof req.query.endpoint === "string" ? req.query.endpoint : "";
      const sub = endpoint ? await repository.getByEndpointForUser(req.user.id_user, endpoint) : null;
      res.status(200).json({ subscription: sub ? serialize(sub) : null });
    } catch (err) {
      next(err);
    }
  }

  async subscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const input = req.body as PushSubscribeInput;
      const sub = await repository.upsert({
        user_id: req.user.id_user,
        endpoint: input.endpoint,
        p256dh: input.keys.p256dh,
        auth: input.keys.auth,
        user_agent: req.get("user-agent")?.slice(0, 300) ?? null,
        alertes: input.alertes,
        dossiers: input.dossiers,
      });
      res.status(201).json({ subscription: serialize(sub) });
    } catch (err) {
      next(err);
    }
  }

  async updatePreferences(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const input = req.body as PushPreferencesInput;
      const sub = await repository.getByEndpointForUser(req.user.id_user, input.endpoint);
      if (!sub) throw new HttpException(404, "Notifications non activées sur cet appareil");
      const updated = await repository.updatePreferences(sub.id_subscription, {
        alertes: input.alertes,
        dossiers: input.dossiers,
      });
      res.status(200).json({ subscription: serialize(updated) });
    } catch (err) {
      next(err);
    }
  }

  async unsubscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const input = req.body as PushEndpointInput;
      await repository.deleteForUser(req.user.id_user, input.endpoint);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async sendTest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      pushService.getPublicKey(); // 503 si non configuré
      const sent = await pushService.sendToUser(req.user.id_user, null, {
        title: "Sentinelle237",
        body: "Les notifications fonctionnent sur cet appareil.",
        url: "/",
        tag: "test",
      });
      if (sent === 0) throw new HttpException(404, "Aucun appareil abonné aux notifications");
      res.status(200).json({ sent });
    } catch (err) {
      next(err);
    }
  }
}
