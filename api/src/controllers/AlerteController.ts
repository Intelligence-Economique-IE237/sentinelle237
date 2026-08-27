import type { Response, NextFunction } from "express";
import { ZodError } from "zod";
import AlerteService from "../services/AlerteService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException, HttpValidationExceptions } from "../utils/HttpExceptions";
import { listAlerteResultatsQuerySchema } from "../validations/AlerteValidations";

const alerteService = new AlerteService();

function handleZodError(err: unknown, next: NextFunction) {
  if (err instanceof ZodError) {
    next(new HttpValidationExceptions(err.issues.map((i) => `${i.path.join(".")} : ${i.message.toLowerCase()}`)));
  } else {
    next(err);
  }
}

export default class AlerteController {
  private readonly alerteService: AlerteService;
  constructor() {
    this.alerteService = alerteService;
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        if (!req.user) throw new HttpException(401, "Unauthorized");
        const alerte = await this.alerteService.create(req.user.id_user, req.user.mail, req.body);
        res.status(201).json({ alerte });
    } catch (err) {
        next(err);
    }
  }

  async getAll(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const alertes = await this.alerteService.getAll(req.user.id_user);
      res.status(200).json({ alertes });
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const alerte = await this.alerteService.getById(req.user.id_user, req.params.id as string);
      res.status(200).json({ alerte });
    } catch (err) {
      next(err);
    }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const alerte = await this.alerteService.update(req.user.id_user, req.params.id as string, req.body);
      res.status(200).json({ alerte });
    } catch (err) {
      next(err);
    }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      await this.alerteService.delete(req.user.id_user, req.params.id as string);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }

  async getResultats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const query = listAlerteResultatsQuerySchema.parse(req.query);
      const result = await this.alerteService.getResultats(req.user.id_user, req.params.id as string, query);
      res.status(200).json(result);
    } catch (err) {
      handleZodError(err, next);
    }
  }

  async markResultatAsRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const resultat = await this.alerteService.markResultatAsRead(
        req.user.id_user,
        req.params.id as string,
        req.params.resultatId as string
      );
      res.status(200).json({ resultat });
    } catch (err) {
      next(err);
    }
  }
}