import { db } from "../config/db";

export default class CoursIndiceBoursierRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async create(data: { code: string; nom: string; source: string; prix: number; devise: string; variation_24h: number | null }) {
        return await this.db.coursIndiceBoursier.create({ data });
    }

    async getLatestForAll(codes: string[]) {
        const results = await Promise.all(
            codes.map((code) =>
                this.db.coursIndiceBoursier.findFirst({ where: { code }, orderBy: { recorded_at: "desc" } })
            )
        );
        return results.filter((r) => r !== null);
    }

    async getClosestBefore(code: string, before: Date) {
        return await this.db.coursIndiceBoursier.findFirst({
            where: { code, recorded_at: { lte: before } },
            orderBy: { recorded_at: "desc" },
        });
    }

    async getHistory(code: string, params: { skip: number; take: number }) {
        const [historique, total] = await Promise.all([
            this.db.coursIndiceBoursier.findMany({
                where: { code },
                orderBy: { recorded_at: "desc" },
                skip: params.skip,
                take: params.take,
            }),
            this.db.coursIndiceBoursier.count({ where: { code } }),
        ]);
        return { historique, total };
    }
}