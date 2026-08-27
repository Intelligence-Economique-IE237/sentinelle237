import { db } from "../config/db";

export default class ArticleInteractionRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async getByUserAndArticle(user_id: string, article_id: string) {
        return await this.db.articleInteraction.findUnique({
            where: { user_id_article_id: { user_id, article_id } },
        });
    }

    async upsertNote(user_id: string, article_id: string, note: string | null) {
        return await this.db.articleInteraction.upsert({
            where: { user_id_article_id: { user_id, article_id } },
            create: { user_id, article_id, note },
            update: { note },
        });
    }

    async upsertFavori(user_id: string, article_id: string, favori: boolean) {
        return await this.db.articleInteraction.upsert({
            where: { user_id_article_id: { user_id, article_id } },
            create: { user_id, article_id, favori },
            update: { favori },
        });
    }

    async getFavoris(user_id: string, params: { skip: number; take: number }) {
        const where = { user_id, favori: true };
        const [interactions, total] = await Promise.all([
            this.db.articleInteraction.findMany({
                where,
                include: { article: { include: { flux: { select: { nom: true, id_flux: true } } } } },
                orderBy: { updatedAt: "desc" },
                skip: params.skip,
                take: params.take,
            }),
            this.db.articleInteraction.count({ where }),
        ]);
        return { interactions, total };
    }
    async getAnnotes(user_id: string, params: { skip: number; take: number }) {
        const where = { user_id, note: { not: null } };
        const [interactions, total] = await Promise.all([
            this.db.articleInteraction.findMany({
            where,
            include: { article: { include: { flux: { select: { nom: true, id_flux: true } } } } },
            orderBy: { updatedAt: "desc" },
            skip: params.skip,
            take: params.take,
            }),
            this.db.articleInteraction.count({ where }),
        ]);
        return { interactions, total };
    }
    async upsertLu(user_id: string, article_id: string, lu: boolean) {
        return await this.db.articleInteraction.upsert({
            where: { user_id_article_id: { user_id, article_id } },
            create: { user_id, article_id, lu },
            update: { lu },
        });
    }
}