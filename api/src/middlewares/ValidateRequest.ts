import type { Request, Response, NextFunction } from "express";
import { type z, ZodError } from "zod";
import { HttpValidationExceptions } from "../utils/HttpExceptions";

const ValidateRequest = (validationSchema: z.Schema) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            req.body = validationSchema.parse(req.body);
            next();
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
    };
};

export default ValidateRequest;