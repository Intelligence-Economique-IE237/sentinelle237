import type { Response, NextFunction } from "express";
import { ZodError } from "zod";
import DossierService from "../services/DossierService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException, HttpValidationExceptions } from "../utils/HttpExceptions";
import { timelineQuerySchema } from "../validations/DossierValidations";

const dossierService = new DossierService();

function handleZodError(err: unknown, next: NextFunction) {
    if (err instanceof ZodError) {
        next(new HttpValidationExceptions(err.issues.map((i) => `${i.path.join(".")} : ${i.message.toLowerCase()}`)));
    } else {
        next(err);
    }
}

export default class DossierController {
    private readonly dossierService: DossierService;
    constructor() {
        this.dossierService = dossierService;
    }

    async create(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const dossier = await this.dossierService.create(req.user.id_user, req.body);
            res.status(201).json({ dossier });
        } catch (err) {
            next(err);
        }
    }

    async getAll(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const dossiers = await this.dossierService.getAll(req.user.id_user);
            res.status(200).json({ dossiers });
        } catch (err) {
            next(err);
        }
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const dossier = await this.dossierService.getById(req.user.id_user, req.params.id as string);
            res.status(200).json({ dossier });
        } catch (err) {
            next(err);
        }
    }

    async update(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const dossier = await this.dossierService.update(req.user.id_user, req.params.id as string, req.body);
            res.status(200).json({ dossier });
        } catch (err) {
            next(err);
        }
    }

    async delete(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            await this.dossierService.delete(req.user.id_user, req.params.id as string);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }

    async linkAlerte(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            await this.dossierService.linkAlerte(req.user.id_user, req.params.id as string, req.body.alerte_id);
            res.sendStatus(201);
        } catch (err) {
            next(err);
        }
    }

    async unlinkAlerte(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            await this.dossierService.unlinkAlerte(req.user.id_user, req.params.id as string, req.params.alerteId as string);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }

    async linkFlux(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            await this.dossierService.linkFlux(req.user.id_user, req.params.id as string, req.body.flux_id);
            res.sendStatus(201);
        } catch (err) {
            next(err);
        }
    }

    async unlinkFlux(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            await this.dossierService.unlinkFlux(req.user.id_user, req.params.id as string, req.params.fluxId as string);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }

    async getTimeline(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const query = timelineQuerySchema.parse(req.query);
            const result = await this.dossierService.getTimeline(req.user.id_user, req.params.id as string, query);
            res.status(200).json(result);
        } catch (err) {
            handleZodError(err, next);
        }
    }
}