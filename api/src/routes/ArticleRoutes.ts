import { Router } from "express";
import ArticleController from "../controllers/ArticleController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { annotationSchema, favoriSchema, luSchema } from "../validations/ArticleValidations";

const router = Router();
const articleController = new ArticleController();

router
    .get("/favoris", articleController.getFavoris.bind(articleController))
    .get("/annotes", articleController.getAnnotes.bind(articleController))
    .get("/non-lus", articleController.getNonLus.bind(articleController))
    .get("/:id", articleController.getById.bind(articleController))
    .patch("/:id/annotation", ValidateRequest(annotationSchema), articleController.setAnnotation.bind(articleController))
    .patch("/:id/favori", ValidateRequest(favoriSchema), articleController.setFavori.bind(articleController))
    .patch("/:id/lu", ValidateRequest(luSchema), articleController.setLu.bind(articleController));

export { router as ArticleRoutes };