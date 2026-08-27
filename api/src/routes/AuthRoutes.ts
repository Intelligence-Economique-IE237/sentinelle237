import { Router } from "express";
import AuthController from "../controllers/AuthController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { loginLimiter, registerLimiter, forgotPasswordLimiter } from "../middlewares/RateLimiter";
import { forgotPasswordSchema, resetPasswordSchema } from "../validations/UserValidations";
import {
    loginUserSchema,
    registerUserSchema,
    verifyTotpLoginSchema,
    resendVerificationSchema,
} from "../validations/UserValidations";

const router = Router();
const authController = new AuthController();

router
    .post(
        "/register",
        registerLimiter,
        ValidateRequest(registerUserSchema),
        authController.register.bind(authController)
    )
    .get("/verify-email", authController.verifyEmail.bind(authController))
    .post(
        "/resend-verification",
        ValidateRequest(resendVerificationSchema),
        authController.resendVerification.bind(authController)
    )
    .post(
        "/login",
        loginLimiter,
        ValidateRequest(loginUserSchema),
        authController.login.bind(authController)
    )
    .post(
        "/login/totp",
        loginLimiter,
        ValidateRequest(verifyTotpLoginSchema),
        authController.verifyTotpLogin.bind(authController)
    )
    .post("/refresh", authController.refresh.bind(authController))
    .post(
        "/forgot-password",
        forgotPasswordLimiter,
        ValidateRequest(forgotPasswordSchema),
        authController.forgotPassword.bind(authController)
    )
    .post(
        "/reset-password",
        ValidateRequest(resetPasswordSchema),
        authController.resetPassword.bind(authController)
    )
    .post("/logout", authController.logout.bind(authController));

export { router as AuthRoutes };