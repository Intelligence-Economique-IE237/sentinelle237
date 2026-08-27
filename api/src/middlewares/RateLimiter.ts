import { rateLimit } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";
import { HttpException } from "../utils/HttpExceptions";

const rateLimitHandler = (_req: Request, _res: Response, next: NextFunction) => {
    next(new HttpException(429, "Trop de tentatives, veuillez réessayer plus tard"));
};
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: rateLimitHandler,
});

export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: rateLimitHandler,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: rateLimitHandler,
});