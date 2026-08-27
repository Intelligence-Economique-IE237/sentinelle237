import { db } from "../config/db";
import type { Prisma, CategorieArticle } from "@prisma/client";

export default class ArticleRepository {
  private readonly db;
  constructor() {
    this.db = db;
  }

  async createMany(data: Prisma.ArticleCreateManyInput[]) {
    return await this.db.article.createMany({ data, skipDuplicates: true });
  }

  async getByFluxId(flux_id: string, params?: { skip?: number; take?: number }) {
    const [articles, total] = await Promise.all([
      this.db.article.findMany({
        where: { flux_id },
        orderBy: { date_publication: "desc" },
        skip: params?.skip,
        take: params?.take,
      }),
      this.db.article.count({ where: { flux_id } }),
    ]);
    return { articles, total };
  }

  async searchByKeywordInFlux(flux_ids: string[], keyword: string) {
    if (flux_ids.length === 0) return [];
    return await this.db.article.findMany({
      where: {
        flux_id: { in: flux_ids },
        OR: [
          { titre: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
        ],
      },
      orderBy: { date_publication: "desc" },
      take: 50,
    });
  }

  async searchByKeywordsInFlux(flux_ids: string[], keywords: string[]) {
    if (flux_ids.length === 0 || keywords.length === 0) return [];

    return await this.db.article.findMany({
      where: {
        flux_id: { in: flux_ids },
        OR: keywords.flatMap((kw) => [
          { titre: { contains: kw, mode: "insensitive" as const } },
          { description: { contains: kw, mode: "insensitive" as const } },
        ]),
      },
      orderBy: { date_publication: "desc" },
      take: 30,
    });
  }

  async getById(id_article: string) {
    return await this.db.article.findUnique({ where: { id_article } });
  }

  async getByLiens(flux_id: string, liens: string[]) {
    return await this.db.article.findMany({ where: { flux_id, lien: { in: liens } } });
  }

  async updateCategorieEtResume(id_article: string, data: { categorie: CategorieArticle | null; resume: string }) {
    return await this.db.article.update({ where: { id_article }, data });
  }

  async getNonLus(flux_ids: string[], user_id: string, params: { skip: number; take: number }) {
    const where = {
      flux_id: { in: flux_ids },
      interactions: { none: { user_id, lu: true } },
    };
    const [articles, total] = await Promise.all([
      this.db.article.findMany({
        where,
        orderBy: { date_publication: "desc" },
        skip: params.skip,
        take: params.take,
      }),
      this.db.article.count({ where }),
    ]);
    return { articles, total };
  }
}