import { Role, Offre } from "@prisma/client";
import { isRecoveryCodeFormat } from "../utils/recoveryCodes";
import { z } from "zod";

export const registerUserSchema = z.object({
    pseudo: z.string().min(3, "Doit contenir au moins 3 caractères"),
    mail: z.string().email("Email invalide"),
    password: z.string().min(8, "8 caractères minimum"),
    pays: z.string().min(1, "Le pays est requis"),
    ville: z.string().min(1, "La ville est requise"),
});
export type RegisterUserInput = z.infer<typeof registerUserSchema>;

export const loginUserSchema = z.object({
    mail: z.string().email("Email invalide"),
    password: z.string().min(1, "Mot de passe requis"),
});
export type LoginUserInput = z.infer<typeof loginUserSchema>;

const codeOuRecuperationSchema = z
  .string()
  .refine((v) => /^\d{6}$/.test(v) || isRecoveryCodeFormat(v), {
    message: "Code TOTP à 6 chiffres ou code de récupération au format XXXX-XXXX",
  });

export const verifyTotpLoginSchema = z.object({
  tempToken: z.string().min(1),
  code: codeOuRecuperationSchema,
});
export type VerifyTotpLoginInput = z.infer<typeof verifyTotpLoginSchema>;


export const verifyEmailSchema = z.object({
    token: z.string().min(1, "Token requis"),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

export const resendVerificationSchema = z.object({
    mail: z.string().email("Email invalide"),
});
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;

export const updateProfileSchema = z
    .object({
        pseudo: z.string().min(3).optional(),
        pays: z.string().min(1).optional(),
        ville: z.string().min(1).optional(),
        currentPassword: z.string().min(1).optional(),
        newPassword: z.string().min(8).optional(),
    })
    .refine((data) => !data.newPassword || !!data.currentPassword, {
        message: "Le mot de passe actuel est requis pour changer le mot de passe",
        path: ["currentPassword"],
    });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateUserByAdminSchema = z.object({
    pseudo: z.string().min(3).optional(),
    pays: z.string().min(1).optional(),
    ville: z.string().min(1).optional(),
    role: z.nativeEnum(Role).optional(),
    activated: z.boolean().optional(),
    offre: z.nativeEnum(Offre).optional(),
});
export type UpdateUserByAdminInput = z.infer<typeof updateUserByAdminSchema>;

export const enableTotpConfirmSchema = z.object({
    code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

export const disableTotpSchema = z.object({
    code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

export const forgotPasswordSchema = z.object({
  mail: z.string().email("Email invalide"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  newPassword: z.string().min(8, "8 caractères minimum"),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

const booleanQueryParam = z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional();

export const listUsersQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    role: z.nativeEnum(Role).optional(),
    offre: z.nativeEnum(Offre).optional(),
    activated: booleanQueryParam,
    verified: booleanQueryParam,
    search: z.string().min(1).optional(),
});
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;