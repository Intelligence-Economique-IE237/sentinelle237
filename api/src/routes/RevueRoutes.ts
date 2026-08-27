import { Router } from "express";
import RevueController from "../controllers/RevueController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { uploadPdfTemplate } from "../middlewares/upload";
import { genererRevueSchema } from "../validations/RevueValidations";

const router = Router();
const revueController = new RevueController();

router
    .post("/templates", uploadPdfTemplate.single("fichier"), revueController.uploadTemplate.bind(revueController))
    .get("/templates", revueController.getMesTemplates.bind(revueController))
    .post("/generer", ValidateRequest(genererRevueSchema), revueController.genererRevue.bind(revueController))
    .get("/:id/telecharger", revueController.telecharger.bind(revueController));

export { router as RevueRoutes };