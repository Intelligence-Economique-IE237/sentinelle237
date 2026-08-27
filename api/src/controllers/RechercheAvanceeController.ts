import type { Response, NextFunction } from "express";
import RechercheAvanceeService from "../services/RechercheAvanceeService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException } from "../utils/HttpExceptions";

const rechercheAvanceeService = new RechercheAvanceeService();

export default class RechercheAvanceeController {
    private readonly rechercheAvanceeService: RechercheAvanceeService;
    constructor() {
        this.rechercheAvanceeService = rechercheAvanceeService;
    }

    async rechercher(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const result = await this.rechercheAvanceeService.rechercher(req.user.id_user, req.body);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }
}