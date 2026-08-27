import { Router } from "express";
import DossierController from "../controllers/DossierController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { createDossierSchema, updateDossierSchema, linkAlerteSchema, linkFluxSchema } from "../validations/DossierValidations";

const router = Router();
const dossierController = new DossierController();

router
    .post("/", ValidateRequest(createDossierSchema), dossierController.create.bind(dossierController))
    .get("/", dossierController.getAll.bind(dossierController))
    .get("/:id", dossierController.getById.bind(dossierController))
    .patch("/:id", ValidateRequest(updateDossierSchema), dossierController.update.bind(dossierController))
    .delete("/:id", dossierController.delete.bind(dossierController))
    .get("/:id/timeline", dossierController.getTimeline.bind(dossierController))
    .post("/:id/alertes", ValidateRequest(linkAlerteSchema), dossierController.linkAlerte.bind(dossierController))
    .delete("/:id/alertes/:alerteId", dossierController.unlinkAlerte.bind(dossierController))
    .post("/:id/flux", ValidateRequest(linkFluxSchema), dossierController.linkFlux.bind(dossierController))
    .delete("/:id/flux/:fluxId", dossierController.unlinkFlux.bind(dossierController));

export { router as DossierRoutes };