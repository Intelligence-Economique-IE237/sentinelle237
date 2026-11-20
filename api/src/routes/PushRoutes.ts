import { Router } from "express";
import PushController from "../controllers/PushController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { pushEndpointSchema, pushPreferencesSchema, pushSubscribeSchema } from "../validations/PushValidations";

const router = Router();
const pushController = new PushController();

router
  .get("/public-key", pushController.getPublicKey.bind(pushController))
  .get("/status", pushController.getStatus.bind(pushController))
  .post("/subscribe", ValidateRequest(pushSubscribeSchema), pushController.subscribe.bind(pushController))
  .patch("/preferences", ValidateRequest(pushPreferencesSchema), pushController.updatePreferences.bind(pushController))
  .post("/unsubscribe", ValidateRequest(pushEndpointSchema), pushController.unsubscribe.bind(pushController))
  .post("/test", pushController.sendTest.bind(pushController));

export { router as PushRoutes };
