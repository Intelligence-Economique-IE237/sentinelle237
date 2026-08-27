import { Router } from "express";
import { Role } from "@prisma/client";
import UserController from "../controllers/UserController";
import ValidateRequest from "../middlewares/ValidateRequest";
import { updateProfileSchema, updateUserByAdminSchema } from "../validations/UserValidations";
import Auth from "../middlewares/Auth";

const userController = new UserController();
const authMiddleware = new Auth();
const router = Router();


router
    .get("/me", userController.getMe.bind(userController))
    .patch(
        "/me",
        ValidateRequest(updateProfileSchema),
        userController.updateMe.bind(userController)
    )
    .delete("/me", userController.deleteMe.bind(userController));

router
    .get("/", authMiddleware.verifyRoles([Role.admin]), userController.getAll.bind(userController))
    .get("/:id", authMiddleware.verifyRoles([Role.admin]), userController.getById.bind(userController))
    .patch(
        "/:id",
        authMiddleware.verifyRoles([Role.admin]),
        ValidateRequest(updateUserByAdminSchema),
        userController.updateByAdmin.bind(userController)
    )
    .delete("/:id", authMiddleware.verifyRoles([Role.admin]), userController.delete.bind(userController));

export { router as UserRoutes };