import { Router } from "express";
import AlerteController from "../controllers/AlerteController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { createAlerteSchema, updateAlerteSchema } from "../validations/AlerteValidations";

const router = Router();
const alerteController = new AlerteController();

router
  .post("/", ValidateRequest(createAlerteSchema), alerteController.create.bind(alerteController))
  .get("/", alerteController.getAll.bind(alerteController))
  .get("/:id", alerteController.getById.bind(alerteController))
  .patch("/:id", ValidateRequest(updateAlerteSchema), alerteController.update.bind(alerteController))
  .delete("/:id", alerteController.delete.bind(alerteController))
  .get("/:id/resultats", alerteController.getResultats.bind(alerteController))
  .patch("/:id/resultats/:resultatId/lu", alerteController.markResultatAsRead.bind(alerteController));

export { router as AlerteRoutes };