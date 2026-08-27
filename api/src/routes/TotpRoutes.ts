import { Router } from "express";
import TotpController from "../controllers/TotpController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { enableTotpConfirmSchema, disableTotpSchema } from "../validations/UserValidations";

const router = Router();
const totpController = new TotpController();

router
    .post("/enable/start", totpController.startEnable.bind(totpController))
    .post(
        "/enable/confirm",
        ValidateRequest(enableTotpConfirmSchema),
        totpController.confirmEnable.bind(totpController)
    )
    .post("/disable", ValidateRequest(disableTotpSchema), totpController.disable.bind(totpController))
    .post(
        "/recovery-codes/regenerate",
        ValidateRequest(disableTotpSchema),
        totpController.regenerateRecoveryCodes.bind(totpController)
    )
    .get("/recovery-codes/remaining", totpController.getRemainingRecoveryCodes.bind(totpController));

export { router as TotpRoutes };