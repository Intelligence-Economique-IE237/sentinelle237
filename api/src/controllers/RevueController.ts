import type { Response, NextFunction } from "express";
import { RevueDePresseService } from "../services/RevueDePresseService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException } from "../utils/HttpExceptions";

const revueDePresseService = new RevueDePresseService();

export default class RevueController {
    async uploadTemplate(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            if (!req.file) throw new HttpException(400, "Fichier PDF requis");

            const modele = await revueDePresseService.uploadTemplate(req.user.id_user, req.file.originalname, req.file.path);
            res.status(201).json({ modele });
        } catch (err) {
            next(err);
        }
    }

    async getMesTemplates(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const templates = await revueDePresseService.getMesTemplates(req.user.id_user);
            res.status(200).json({ templates });
        } catch (err) {
            next(err);
        }
    }

    async genererRevue(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const revue = await revueDePresseService.genererRevue(req.user.id_user, req.body);
            res.status(201).json({ revue });
        } catch (err) {
            next(err);
        }
    }

    async telecharger(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const revue = await revueDePresseService.getRevue(req.user.id_user, req.params.id as string);
            res.download(revue.chemin_fichier, `${revue.titre}.pdf`);
        } catch (err) {
            next(err);
        }
    }
}