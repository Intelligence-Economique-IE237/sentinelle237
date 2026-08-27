import { Router } from "express";
import RechercheAvanceeController from "../controllers/RechercheAvanceeController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { rechercheAvanceeSchema } from "../validations/RechercheAvanceeValidations";

const router = Router();
const rechercheAvanceeController = new RechercheAvanceeController();

router.post(
    "/",
    ValidateRequest(rechercheAvanceeSchema),
    rechercheAvanceeController.rechercher.bind(rechercheAvanceeController)
);

export { router as RechercheAvanceeRoutes };