import { db } from "../config/db";
import { Prisma, type Article, type CategorieArticle } from "@prisma/client";
import { SQL_ACCENTS_FROM, SQL_ACCENTS_TO } from "../utils/keywordSearch";

// Titre + description en minuscules et sans accents, pour une recherche
// insensible aux accents sans dépendre de l'extension PostgreSQL unaccent.
const NORMALIZED_TEXT = Prisma.sql`translate(replace(lower(coalesce(titre, '') || ' ' || coalesce(description, '')), 'œ', 'oe'), ${SQL_ACCENTS_FROM}, ${SQL_ACCENTS_TO})`;

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
        orderBy: { date_publication: { sort: "desc", nulls: "last" } },
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
      orderBy: { date_publication: { sort: "desc", nulls: "last" } },
      take: 50,
    });
  }

  /**
   * Recherche par mots-clés normalisés (voir utils/keywordSearch.ts).
   * `termGroups` : une liste de requêtes alternatives (ex. requête originale et
   * sa traduction) ; un article correspond si TOUS les termes d'au moins une
   * requête apparaissent dans son titre ou sa description, dans n'importe quel ordre.
   */
  async searchByTermsInFlux(flux_ids: string[], termGroups: string[][], take = 50): Promise<Article[]> {
    const groups = termGroups.filter((g) => g.length > 0);
    if (flux_ids.length === 0 || groups.length === 0) return [];

    const groupConditions = groups.map(
      (terms) => Prisma.sql`(${Prisma.join(terms.map((t) => Prisma.sql`${NORMALIZED_TEXT} LIKE ${`%${t}%`}`), " AND ")})`
    );

    return await this.db.$queryRaw<Article[]>`
      SELECT * FROM articles
      WHERE flux_id IN (${Prisma.join(flux_ids)})
        AND (${Prisma.join(groupConditions, " OR ")})
      ORDER BY date_publication DESC NULLS LAST
      LIMIT ${take}
    `;
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
      orderBy: { date_publication: { sort: "desc", nulls: "last" } },
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
        orderBy: { date_publication: { sort: "desc", nulls: "last" } },
        skip: params.skip,
        take: params.take,
      }),
      this.db.article.count({ where }),
    ]);
    return { articles, total };
  }
}