import { db } from "../config/db";
import type { Prisma } from "@prisma/client";

export default class FluxRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  async getAll(params: { skip: number; take: number; where: Prisma.FluxWhereInput }) {
    const [flux, total] = await Promise.all([
      this.db.flux.findMany({
        where: params.where,
        skip: params.skip,
        take: params.take,
        orderBy: { createdAt: "desc" },
      }),
      this.db.flux.count({ where: params.where }),
    ]);
    return { flux, total };
  }

  async getSuggestions(params: { skip: number; take: number; where: Prisma.FluxWhereInput }) {
    const [flux, total] = await Promise.all([
      this.db.flux.findMany({
        where: { ...params.where, is_suggestion: true },
        skip: params.skip,
        take: params.take,
        orderBy: { nom: "asc" },
      }),
      this.db.flux.count({ where: { ...params.where, is_suggestion: true } }),
    ]);
    return { flux, total };
  }

  async getById(id_flux: string) {
    return await this.db.flux.findUnique({ where: { id_flux } });
  }

  async getByLienRss(lien_rss: string) {
    return await this.db.flux.findUnique({ where: { lien_rss } });
  }

  async create(data: Prisma.FluxCreateInput) {
    return await this.db.flux.create({ data });
  }

  async update(id_flux: string, data: Prisma.FluxUpdateInput) {
    return await this.db.flux.update({ where: { id_flux }, data });
  }

  async delete(id_flux: string) {
    return await this.db.flux.delete({ where: { id_flux } });
  }

  // Utilisé par le job cron d'auto-refresh : tous les flux dont le cooldown est expiré
  async getDueForRefresh(cutoff: Date) {
    return await this.db.flux.findMany({
      where: {
        OR: [{ last_crawled_at: null }, { last_crawled_at: { lt: cutoff } }],
      },
    });
  }
}