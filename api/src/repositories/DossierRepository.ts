import { db } from "../config/db";
import type { Prisma } from "@prisma/client";

export default class DossierRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async getAllByUser(user_id: string) {
        return await this.db.dossier.findMany({ where: { user_id }, orderBy: { updatedAt: "desc" } });
    }

    async getById(id_dossier: string) {
        return await this.db.dossier.findUnique({
            where: { id_dossier },
            include: { alertes: true, flux: true },
        });
    }

    async create(data: Prisma.DossierCreateInput) {
        return await this.db.dossier.create({ data });
    }

    async update(id_dossier: string, data: Prisma.DossierUpdateInput) {
        return await this.db.dossier.update({ where: { id_dossier }, data });
    }

    async delete(id_dossier: string) {
        return await this.db.dossier.delete({ where: { id_dossier } });
    }

    async linkAlerte(dossier_id: string, alerte_id: string) {
        return await this.db.dossierAlerte.create({ data: { dossier_id, alerte_id } });
    }

    async unlinkAlerte(dossier_id: string, alerte_id: string) {
        return await this.db.dossierAlerte.delete({
            where: { dossier_id_alerte_id: { dossier_id, alerte_id } },
        });
    }

    async linkFlux(dossier_id: string, flux_id: string) {
        return await this.db.dossierFlux.create({ data: { dossier_id, flux_id } });
    }

    async unlinkFlux(dossier_id: string, flux_id: string) {
        return await this.db.dossierFlux.delete({
            where: { dossier_id_flux_id: { dossier_id, flux_id } },
        });
    }
}