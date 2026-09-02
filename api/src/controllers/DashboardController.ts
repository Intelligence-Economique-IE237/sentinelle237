import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import DashboardService from "../services/DashboardService";
import { HttpValidationExceptions } from "../utils/HttpExceptions";
import { historiqueQuerySchema, matiereParamSchema } from "../validations/DashboardValidations";

const dashboardService = new DashboardService();

function handleZodError(err: unknown, next: NextFunction) {
    if (err instanceof ZodError) {
        next(new HttpValidationExceptions(err.issues.map((i) => `${i.path.join(".")} : ${i.message.toLowerCase()}`)));
    } else {
        next(err);
    }
}

export default class DashboardController {
    private readonly dashboardService: DashboardService;
    constructor() {
        this.dashboardService = dashboardService;
    }

    async getKpis(_req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.dashboardService.getDashboardKpis();
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async getDeviseHistorique(req: Request, res: Response, next: NextFunction) {
        try {
            const query = historiqueQuerySchema.parse(req.query);
            const paire = decodeURIComponent(req.params.paire as string);
            const result = await this.dashboardService.getDeviseHistorique(paire, query);
            res.status(200).json(result);
        } catch (err) {
            handleZodError(err, next);
        }
    }

    async getMatiereHistorique(req: Request, res: Response, next: NextFunction) {
        try {
            const query = historiqueQuerySchema.parse(req.query);
            const matiere = matiereParamSchema.parse(req.params.matiere);
            const result = await this.dashboardService.getMatiereHistorique(matiere, query);
            res.status(200).json(result);
        } catch (err) {
            handleZodError(err, next);
        }
    }

    async getIndiceHistorique(req: Request, res: Response, next: NextFunction) {
        try {
            const query = historiqueQuerySchema.parse(req.query);
            const code = req.params.code as string;
            const result = await this.dashboardService.getIndiceHistorique(code, query);
            res.status(200).json(result);
        } catch (err) {
            handleZodError(err, next);
        }
    }
}