import { Router } from "express";
import { Role } from "@prisma/client";
import FluxController from "../controllers/FluxController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { createFluxSchema, epingleSchema } from "../validations/FluxValidations";
import Auth from "../middlewares/Auth";

const router = Router();
const fluxController = new FluxController();
const authMiddleware = new Auth();

router
  .get("/admin/all", authMiddleware.verifyRoles([Role.admin]), fluxController.getAllForAdmin.bind(fluxController))
  .get("/suggestions", fluxController.getSuggestions.bind(fluxController))
  .post("/", ValidateRequest(createFluxSchema), fluxController.create.bind(fluxController))
  .get("/", fluxController.getMine.bind(fluxController))
  .post("/:id/subscribe", fluxController.quickSubscribe.bind(fluxController))
  .post("/:id/refresh", fluxController.refresh.bind(fluxController))
  .get("/:id/articles", fluxController.getArticles.bind(fluxController))
  .get("/:id", fluxController.getById.bind(fluxController))
  .delete("/:id", fluxController.unsubscribe.bind(fluxController))
  .patch("/:id/epingle", ValidateRequest(epingleSchema), fluxController.setEpingle.bind(fluxController));

export { router as FluxRoutes };