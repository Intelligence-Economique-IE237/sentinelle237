import type { Response, NextFunction, Request } from "express";
import { ZodError } from "zod";
import FluxService from "../services/FluxService";
import type { AuthRequest } from "../middlewares/Auth";
import { HttpException, HttpValidationExceptions } from "../utils/HttpExceptions";
import {
  listArticlesQuerySchema,
  listFluxQuerySchema,
  listSuggestionsQuerySchema,
  listMyFluxQuerySchema,
} from "../validations/FluxValidations";

const fluxService = new FluxService();

function handleZodError(err: unknown, next: NextFunction) {
  if (err instanceof ZodError) {
    next(new HttpValidationExceptions(err.issues.map((i) => `${i.path.join(".")} : ${i.message.toLowerCase()}`)));
  } else {
    next(err);
  }
}

export default class FluxController {
  private readonly fluxService: FluxService;
  constructor() {
    this.fluxService = fluxService;
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const result = await this.fluxService.create(req.body, req.user.id_user);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMine(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const query = listMyFluxQuerySchema.parse(req.query);
      const result = await this.fluxService.getMyFlux(req.user.id_user, query);
      res.status(200).json(result);
    } catch (err) {
      handleZodError(err, next);
    }
  }

  async getSuggestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const query = listSuggestionsQuerySchema.parse(req.query);
      const result = await this.fluxService.getSuggestions(req.user.id_user, query);
      res.status(200).json(result);
    } catch (err) {
      handleZodError(err, next);
    }
  }

  async quickSubscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const result = await this.fluxService.quickSubscribe(req.user.id_user, req.params.id as string);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const flux = await this.fluxService.getById(req.user.id_user, req.params.id as string);
      res.status(200).json({ flux });
    } catch (err) {
      next(err);
    }
  }

  async getArticles(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const query = listArticlesQuerySchema.parse(req.query);
      const result = await this.fluxService.getArticles(req.user.id_user, req.params.id as string, query);
      res.status(200).json(result);
    } catch (err) {
      handleZodError(err, next);
    }
  }

  async refresh(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      const result = await this.fluxService.refresh(req.user.id_user, req.params.id as string);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async unsubscribe(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      await this.fluxService.unsubscribe(req.user.id_user, req.params.id as string);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }

  async getAllForAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const query = listFluxQuerySchema.parse(req.query);
      const result = await this.fluxService.getAllForAdmin(query);
      res.status(200).json(result);
    } catch (err) {
      handleZodError(err, next);
    }
  }

  async setEpingle(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new HttpException(401, "Unauthorized");
      await this.fluxService.setEpingle(req.user.id_user, req.params.id as string, req.body.epingle);
      res.sendStatus(204);
    } catch (err) {
      next(err);
    }
  }
}