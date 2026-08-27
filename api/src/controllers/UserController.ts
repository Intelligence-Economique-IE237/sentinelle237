import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import UserService from "../services/UserService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException, HttpValidationExceptions } from "../utils/HttpExceptions";
import { listUsersQuerySchema } from "../validations/UserValidations";

const userService = new UserService();

export default class UserController {
    private readonly userService: UserService;
    constructor() {
        this.userService = userService;
    }

    async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const query = listUsersQuerySchema.parse(req.query);
            const result = await this.userService.getAll(query);
            res.status(200).json(result);
        } catch (err) {
            if (err instanceof ZodError) {
                const errorMessages = err.issues.map(
                    (issue) => `${issue.path.join(".")} : ${issue.message.toLowerCase()}`
                );
                next(new HttpValidationExceptions(errorMessages));
            } else {
                next(err);
            }
        }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = await this.userService.getById(id);
            res.status(200).json({ user: this.userService.sanitize(user) });
        } catch (err) {
            next(err);
        }
    }

    async getMe(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const user = await this.userService.getById(req.user.id_user);
            res.status(200).json({ user: this.userService.sanitize(user) });
        } catch (err) {
            next(err);
        }
    }

    async updateMe(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            const user = await this.userService.updateProfile(req.user.id_user, req.body);
            res.status(200).json({ user: this.userService.sanitize(user) });
        } catch (err) {
            next(err);
        }
    }

    async deleteMe(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) throw new HttpException(401, "Unauthorized");
            await this.userService.delete(req.user.id_user);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }

    async updateByAdmin(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            const user = await this.userService.updateByAdmin(id, req.body);
            res.status(200).json({ user: this.userService.sanitize(user) });
        } catch (err) {
            next(err);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const id = req.params.id as string;
            await this.userService.delete(id);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }
}