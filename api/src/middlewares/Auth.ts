import type { Request, Response, NextFunction } from "express";
import type { Role } from "@prisma/client";
import { HttpException } from "../utils/HttpExceptions";
import { JwtService } from "../services/JwtService";

const { ACCESS_TOKEN_SECRET } = process.env as { [key: string]: string };

export interface AuthRequest extends Request {
    user?: {
        id_user: string;
        mail: string;
        role: Role;
    };
}

export default class Auth {
    private readonly jwtService: JwtService;
    constructor() {
        this.jwtService = new JwtService();
    }

    verifyToken = async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
        try {
            const { authorization } = req.headers;
            if (!authorization) throw new HttpException(401, "Unauthorized");
            const [type, token] = authorization.split(" ");
            if (type !== "Bearer" || !token) throw new HttpException(401, "Unauthorized");
            const decoded = await this.jwtService.verify(token, ACCESS_TOKEN_SECRET);
            req.user = decoded as unknown as { id_user: string; mail: string; role: Role };
            next();
        } catch (err) {
            next(err);
        }
    };

    verifyRoles = (allowedRoles: Role[]) => {
        return (req: AuthRequest, _res: Response, next: NextFunction): void => {
            if (!req.user || !req.user.role) throw new HttpException(403, "Forbidden");
            if (!allowedRoles.includes(req.user.role)) throw new HttpException(403, "Forbidden");
            next();
        };
    };
}