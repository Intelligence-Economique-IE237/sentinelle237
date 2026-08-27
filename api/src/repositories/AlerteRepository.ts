import { db } from "../config/db";
import type { Prisma, AlerteFrequence } from "@prisma/client";

export default class AlerteRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  async getAllByUser(user_id: string) {
    return await this.db.alerte.findMany({ where: { user_id }, orderBy: { createdAt: "desc" } });
  }

  async getById(id_alerte: string) {
    return await this.db.alerte.findUnique({ where: { id_alerte } });
  }

  async create(data: Prisma.AlerteCreateInput) {
    return await this.db.alerte.create({ data });
  }

  async update(id_alerte: string, data: Prisma.AlerteUpdateInput) {
    return await this.db.alerte.update({ where: { id_alerte }, data });
  }

  async delete(id_alerte: string) {
    return await this.db.alerte.delete({ where: { id_alerte } });
  }

  async countActiveByUser(user_id: string): Promise<number> {
    return await this.db.alerte.count({ where: { user_id, actif: true } });
  }

  async getAllActive() {
    return await this.db.alerte.findMany({ where: { actif: true } });
  }

  async getDueForWebSearch(cutoff: Date, take: number) {
    return await this.db.alerte.findMany({
      where: {
        actif: true,
        OR: [{ derniere_recherche_web: null }, { derniere_recherche_web: { lt: cutoff } }],
      },
      orderBy: { derniere_recherche_web: "asc" },
      take,
    });
  }

  // Pour les digests quotidien/hebdomadaire : alertes actives de cette fréquence, pas encore envoyées récemment
  async getDueForDigest(frequence: AlerteFrequence, cutoff: Date) {
    return await this.db.alerte.findMany({
      where: {
        actif: true,
        frequence,
        OR: [{ dernier_envoi: null }, { dernier_envoi: { lt: cutoff } }],
      },
    });
  }
}