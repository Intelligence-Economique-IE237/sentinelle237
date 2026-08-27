import { db } from "../config/db";

export default class TotpRecoveryCodeRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  async createMany(user_id: string, codes: { hash: string }[]) {
    await this.db.totpRecoveryCode.createMany({
      data: codes.map((c) => ({ user_id, code_hash: c.hash })),
    });
  }

  async findUnusedByHash(user_id: string, code_hash: string) {
    return await this.db.totpRecoveryCode.findFirst({
      where: { user_id, code_hash, utilise: false },
    });
  }

  async markUsed(id_code: string) {
    await this.db.totpRecoveryCode.update({ where: { id_code }, data: { utilise: true } });
  }

  async deleteAllForUser(user_id: string) {
    await this.db.totpRecoveryCode.deleteMany({ where: { user_id } });
  }

  async countUnused(user_id: string): Promise<number> {
    return await this.db.totpRecoveryCode.count({ where: { user_id, utilise: false } });
  }
}