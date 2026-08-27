import CategorieFluxRepository from "../repositories/CategorieFluxRepository";
import { HttpException } from "../utils/HttpExceptions";
import type { CreateCategorieFluxInput, UpdateCategorieFluxInput } from "../validations/CategorieFluxValidations";

const categorieFluxRepository = new CategorieFluxRepository();

export default class CategorieFluxService {
    private readonly categorieFluxRepository: CategorieFluxRepository;
    constructor() {
        this.categorieFluxRepository = categorieFluxRepository;
    }

    async getAll() {
        return await this.categorieFluxRepository.getAll();
    }

    async create(input: CreateCategorieFluxInput) {
        const existing = await this.categorieFluxRepository.getByCode(input.code);
        if (existing) throw new HttpException(409, "Ce code de catégorie existe déjà");
        return await this.categorieFluxRepository.create(input);
    }

    async update(id_categorie: string, input: UpdateCategorieFluxInput) {
        const existing = await this.categorieFluxRepository.getById(id_categorie);
        if (!existing) throw new HttpException(404, "Catégorie introuvable");
        return await this.categorieFluxRepository.update(id_categorie, input);
    }

    async delete(id_categorie: string) {
        const existing = await this.categorieFluxRepository.getById(id_categorie);
        if (!existing) throw new HttpException(404, "Catégorie introuvable");
        await this.categorieFluxRepository.delete(id_categorie);
    }
}