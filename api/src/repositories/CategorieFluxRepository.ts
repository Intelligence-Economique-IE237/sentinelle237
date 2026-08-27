import { db } from "../config/db";
import type { Prisma } from "@prisma/client";

export default class CategorieFluxRepository {
    private readonly db;
    constructor() {
        this.db = db;
    }

    async getAll() {
        return await this.db.categorieFlux.findMany({ orderBy: { libelle: "asc" } });
    }

    async getByCode(code: string) {
        return await this.db.categorieFlux.findUnique({ where: { code } });
    }

    async getById(id_categorie: string) {
        return await this.db.categorieFlux.findUnique({ where: { id_categorie } });
    }

    async create(data: Prisma.CategorieFluxCreateInput) {
        return await this.db.categorieFlux.create({ data });
    }

    async update(id_categorie: string, data: Prisma.CategorieFluxUpdateInput) {
        return await this.db.categorieFlux.update({ where: { id_categorie }, data });
    }

    async delete(id_categorie: string) {
        return await this.db.categorieFlux.delete({ where: { id_categorie } });
    }
}