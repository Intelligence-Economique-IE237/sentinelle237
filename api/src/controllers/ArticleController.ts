import type { Response, NextFunction } from "express";
import { ZodError } from "zod";
import ArticleService from "../services/ArticleService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException, HttpValidationExceptions } from "../utils/HttpExceptions";
import { listFavorisQuerySchema } from "../validations/ArticleValidations";

const articleService = new ArticleService();

function handleZodError(err: unknown, next: NextFunction) {
    if (err instanceof ZodError) {
        next(new HttpValidationExceptions(err.issues.map((i) => `${i.path.join(".")} : ${i.message.toLowerCase()}`)));
    } else {
        next(err);
    }
}

export default class ArticleController {
    private readonly articleService: ArticleService;
    constructor() {
        this.articleService = articleService;
    }

    async getFavoris(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const query = listFavorisQuerySchema.parse(req.query);
            const result = await this.articleService.getFavoris(req.user.id_user, query);
            res.status(200).json(result);
        } catch (err) {
            handleZodError(err, next);
        }
    }

    async getById(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const article = await this.articleService.getArticle(req.user.id_user, req.params.id as string);
            res.status(200).json({ article });
        } catch (err) {
            next(err);
        }
    }

    async setAnnotation(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const interaction = await this.articleService.setAnnotation(req.user.id_user, req.params.id as string, req.body);
            res.status(200).json({ interaction });
        } catch (err) {
            next(err);
        }
    }

    async setFavori(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const interaction = await this.articleService.setFavori(req.user.id_user, req.params.id as string, req.body);
            res.status(200).json({ interaction });
        } catch (err) {
            next(err);
        }
    }
    async getAnnotes(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const query = listFavorisQuerySchema.parse(req.query);
            const result = await this.articleService.getAnnotes(req.user.id_user, query);
            res.status(200).json(result);
        } catch (err) {
            handleZodError(err, next);
        }
    }

    async setLu(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const interaction = await this.articleService.setLu(req.user.id_user, req.params.id as string, req.body);
            res.status(200).json({ interaction });
        } catch (err) {
            next(err);
        }
    }

    async getNonLus(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const query = listFavorisQuerySchema.parse(req.query);
            const result = await this.articleService.getNonLus(req.user.id_user, query);
            res.status(200).json(result);
        } catch (err) {
            handleZodError(err, next);
        }
    }
}