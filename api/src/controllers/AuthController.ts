import type { Request, Response, NextFunction, CookieOptions } from "express";
import { HttpException } from "../utils/HttpExceptions";
import AuthService from "../services/AuthService";

const COOKIE_OPTIONS: CookieOptions = {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    sameSite: "none",
    secure: process.env.NODE_ENV === "production",
};

const authService = new AuthService();

export default class AuthController {
    private readonly authService: AuthService;
    constructor() {
        this.authService = authService;
    }

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const user = await this.authService.register(req.body);
            res.status(201).json({ message: "Compte créé. Vérifiez votre email.", user });
        } catch (err) {
            next(err);
        }
    }

    async verifyEmail(req: Request, res: Response) {
        const { FRONTEND_ORIGINS } = process.env as { [key: string]: string };
        const frontendUrl = FRONTEND_ORIGINS.split(",")[0].trim(); // prend la première origine si plusieurs
        const { token } = req.query as { token: string };

        try {
            if (!token) throw new HttpException(400, "Token manquant");
            await this.authService.verifyEmail(token);
            res.redirect(`${frontendUrl}/login?verified=1`);
        } catch (err) {
            const message = err instanceof HttpException ? err.message : "Erreur lors de la vérification";
            res.redirect(`${frontendUrl}/login?verified=0&erreur=${encodeURIComponent(message)}`);
        }
    }

    async resendVerification(req: Request, res: Response, next: NextFunction) {
        try {
            await this.authService.resendVerification(req.body.mail);
            res.status(200).json({ message: "Email de vérification renvoyé" });
        } catch (err) {
            next(err);
        }
    }

    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await this.authService.login(req.body);
            if ("requiresTotp" in result) {
            res.status(200).json(result);
            return;
            }
            const { accessToken, refreshToken, user } = result;
            res.cookie("jwt", refreshToken, COOKIE_OPTIONS).status(200).json({ accessToken, user });
        } catch (err) {
            next(err);
        }
    }

    async verifyTotpLogin(req: Request, res: Response, next: NextFunction) {
        try {
            const { accessToken, refreshToken, user } = await this.authService.verifyTotpLogin(req.body);
            res.cookie("jwt", refreshToken, COOKIE_OPTIONS).status(200).json({ accessToken, user });
        } catch (err) {
            next(err);
        }
    }

    async refresh(req: Request, res: Response, next: NextFunction) {
        try {
            const { accessToken } = await this.authService.refresh(req.cookies.jwt);
            res.status(200).json({ accessToken });
        } catch (err) {
            next(err);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
        await this.authService.forgotPassword(req.body.mail);
        res.status(200).json({ message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." });
    } catch (err) {
        next(err);
    }
    }

    async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
        await this.authService.resetPassword(req.body.token, req.body.newPassword);
        res.status(200).json({ message: "Mot de passe réinitialisé avec succès" });
    } catch (err) {
        next(err);
    }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            res.clearCookie("jwt", COOKIE_OPTIONS).sendStatus(204);
        } catch (err) {
            next(err);
        }
    }
}