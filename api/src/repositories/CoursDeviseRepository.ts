import { db } from "../config/db";

export default class CoursDeviseRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async create(data: { paire: string; taux: number; variation_24h: number | null }) {
        return await this.db.coursDevise.create({ data });
    }

    async getLatestForAll(paires: string[]) {
        const results = await Promise.all(
            paires.map((paire) =>
                this.db.coursDevise.findFirst({ where: { paire }, orderBy: { recorded_at: "desc" } })
            )
        );
        return results.filter((r) => r !== null);
    }

    async getClosestBefore(paire: string, before: Date) {
        return await this.db.coursDevise.findFirst({
            where: { paire, recorded_at: { lte: before } },
            orderBy: { recorded_at: "desc" },
        });
    }

    async getHistory(paire: string, params: { skip: number; take: number }) {
        const [historique, total] = await Promise.all([
            this.db.coursDevise.findMany({
                where: { paire },
                orderBy: { recorded_at: "desc" },
                skip: params.skip,
                take: params.take,
            }),
            this.db.coursDevise.count({ where: { paire } }),
        ]);
        return { historique, total };
    }
}