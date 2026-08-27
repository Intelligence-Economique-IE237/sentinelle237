import type { Request, Response, NextFunction } from "express";
import CategorieFluxService from "../services/CategorieFluxService";

const categorieFluxService = new CategorieFluxService();

export default class CategorieFluxController {
    private readonly categorieFluxService: CategorieFluxService;
    constructor() {
        this.categorieFluxService = categorieFluxService;
    }

    async getAll(_req: Request, res: Response, next: NextFunction) {
        try {
            const categories = await this.categorieFluxService.getAll();
            res.status(200).json({ categories });
        } catch (err) {
            next(err);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const categorie = await this.categorieFluxService.create(req.body);
            res.status(201).json({ categorie });
        } catch (err) {
            next(err);
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const categorie = await this.categorieFluxService.update(req.params.id as string, req.body);
            res.status(200).json({ categorie });
        } catch (err) {
            next(err);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await this.categorieFluxService.delete(req.params.id as string);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }
}