import type { Response, NextFunction } from "express";
import TotpAuthService from "../services/TotpAuthService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException } from "../utils/HttpExceptions";

const totpAuthService = new TotpAuthService();

export default class TotpController {
    private readonly totpAuthService: TotpAuthService;
    constructor() {
        this.totpAuthService = totpAuthService;
    }

    async startEnable(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const result = await this.totpAuthService.startEnable(req.user.id_user);
            res.status(200).json(result);
        } catch (err) {
            next(err);
        }
    }

    async confirmEnable(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const result = await this.totpAuthService.confirmEnable(req.user.id_user, req.body.code);
            res.status(200).json({
            message: "TOTP activé avec succès",
            recoveryCodes: result.recoveryCodes,
            });
        } catch (err) {
            next(err);
        }
    }

    async regenerateRecoveryCodes(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const result = await this.totpAuthService.regenerateRecoveryCodes(req.user.id_user, req.body.code);
            res.status(200).json({ recoveryCodes: result.recoveryCodes });
        } catch (err) {
            next(err);
        }
    }

    async getRemainingRecoveryCodes(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const remaining = await this.totpAuthService.countRemainingRecoveryCodes(req.user.id_user);
            res.status(200).json({ remaining });
        } catch (err) {
            next(err);
        }
    }

    async disable(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            await this.totpAuthService.disable(req.user.id_user, req.body.code);
            res.status(200).json({ message: "TOTP désactivé avec succès" });
        } catch (err) {
            next(err);
        }
    }
}