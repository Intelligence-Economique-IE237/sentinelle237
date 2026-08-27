import { db } from "../config/db";
import type { Prisma } from "@prisma/client";

export default class AlerteResultatRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  async createMany(data: Prisma.AlerteResultatCreateManyInput[]) {
    if (data.length === 0) return;
    return await this.db.alerteResultat.createMany({ data, skipDuplicates: true });
  }

  async getByAlerteId(alerte_id: string, params: { skip: number; take: number; where?: Prisma.AlerteResultatWhereInput }) {
    const where = { alerte_id, ...params.where };
    const [resultats, total] = await Promise.all([
      this.db.alerteResultat.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.db.alerteResultat.count({ where }),
    ]);
    return { resultats, total };
  }

  async markAsRead(id_resultat: string) {
    return await this.db.alerteResultat.update({ where: { id_resultat }, data: { lu: true } });
  }

  async getById(id_resultat: string) {
    return await this.db.alerteResultat.findUnique({ where: { id_resultat } });
  }

  // Résultats jamais encore envoyés par email pour cette alerte
  async getUnsent(alerte_id: string, limit?: number) {
    return await this.db.alerteResultat.findMany({
      where: { alerte_id, envoye: false },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async markManyAsSent(ids: string[]) {
    if (ids.length === 0) return;
    await this.db.alerteResultat.updateMany({ where: { id_resultat: { in: ids } }, data: { envoye: true } });
  }
}