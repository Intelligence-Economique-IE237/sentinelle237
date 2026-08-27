import { db } from "../config/db";

export default class CoursMatierePremiereRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async create(data: { matiere: string; prix: number; devise: string; variation_24h: number | null }) {
        return await this.db.coursMatierePremiere.create({ data });
    }

    async getLatestForAll(matieres: string[]) {
        const results = await Promise.all(
            matieres.map((matiere) =>
                this.db.coursMatierePremiere.findFirst({ where: { matiere }, orderBy: { recorded_at: "desc" } })
            )
        );
        return results.filter((r) => r !== null);
    }

    async getClosestBefore(matiere: string, before: Date) {
        return await this.db.coursMatierePremiere.findFirst({
            where: { matiere, recorded_at: { lte: before } },
            orderBy: { recorded_at: "desc" },
        });
    }

    async getHistory(matiere: string, params: { skip: number; take: number }) {
        const [historique, total] = await Promise.all([
            this.db.coursMatierePremiere.findMany({
                where: { matiere },
                orderBy: { recorded_at: "desc" },
                skip: params.skip,
                take: params.take,
            }),
            this.db.coursMatierePremiere.count({ where: { matiere } }),
        ]);
        return { historique, total };
    }
}