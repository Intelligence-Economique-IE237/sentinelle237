import { db } from "../config/db";

export default class FluxEpingleRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async pin(user_id: string, flux_id: string) {
        return await this.db.fluxEpingle.upsert({
            where: { user_id_flux_id: { user_id, flux_id } },
            create: { user_id, flux_id },
            update: {},
        });
    }

    async unpin(user_id: string, flux_id: string) {
        await this.db.fluxEpingle.deleteMany({ where: { user_id, flux_id } });
    }

    async getPinnedFluxIds(user_id: string): Promise<string[]> {
        const rows = await this.db.fluxEpingle.findMany({ where: { user_id }, select: { flux_id: true } });
        return rows.map((r) => r.flux_id);
    }
}