import { Router } from "express";
import { Role } from "@prisma/client";
import CategorieFluxController from "../controllers/CategorieFluxController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { createCategorieFluxSchema, updateCategorieFluxSchema } from "../validations/CategorieFluxValidations";
import Auth from "../middlewares/Auth";

const router = Router();
const categorieFluxController = new CategorieFluxController();
const authMiddleware = new Auth();

router
    .get("/", categorieFluxController.getAll.bind(categorieFluxController))
    .post(
        "/",
        authMiddleware.verifyRoles([Role.admin]),
        ValidateRequest(createCategorieFluxSchema),
        categorieFluxController.create.bind(categorieFluxController)
    )
    .patch(
        "/:id",
        authMiddleware.verifyRoles([Role.admin]),
        ValidateRequest(updateCategorieFluxSchema),
        categorieFluxController.update.bind(categorieFluxController)
    )
    .delete("/:id", authMiddleware.verifyRoles([Role.admin]), categorieFluxController.delete.bind(categorieFluxController));

export { router as CategorieFluxRoutes };