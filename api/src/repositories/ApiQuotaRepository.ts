import { db } from "../config/db";

export default class ApiQuotaRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  async getCount(cle: string, period: string): Promise<number> {
    const row = await this.db.apiQuota.findUnique({ where: { cle } });
    if (!row || row.date !== period) return 0;
    return row.compteur;
  }

  async increment(cle: string, period: string, by = 1) {
    const existing = await this.db.apiQuota.findUnique({ where: { cle } });

    if (!existing || existing.date !== period) {
      await this.db.apiQuota.upsert({
        where: { cle },
        create: { cle, date: period, compteur: by },
        update: { date: period, compteur: by },
      });
    } else {
      await this.db.apiQuota.update({ where: { cle }, data: { compteur: { increment: by } } });
    }
  }
}