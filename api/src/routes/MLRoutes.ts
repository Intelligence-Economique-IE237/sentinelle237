import { Router } from "express";
import { Role } from "@prisma/client";
import MLController from "../controllers/MLController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { feedbackSchema } from "../validations/MLValidations";
import Auth from "../middlewares/Auth";

const router = Router();
const mlController = new MLController();
const authMiddleware = new Auth();

router
    .post("/predict", mlController.predict.bind(mlController))
    .post("/feedback", authMiddleware.verifyRoles([Role.admin]), ValidateRequest(feedbackSchema), mlController.feedback.bind(mlController))
    .post("/retrain", authMiddleware.verifyRoles([Role.admin]), mlController.triggerRetrain.bind(mlController));

export { router as MLRoutes };