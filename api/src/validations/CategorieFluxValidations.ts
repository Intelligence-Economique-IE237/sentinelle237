import { z } from "zod";

export const createCategorieFluxSchema = z.object({
    code: z
        .string()
        .min(2)
        .max(30)
        .regex(/^[a-z_]+$/, "Code en minuscules, lettres et underscores uniquement (ex: economie)"),
    libelle: z.string().min(2).max(50),
    couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale requise, ex: #EF4444"),
    description: z.string().max(300).optional(),
});
export type CreateCategorieFluxInput = z.infer<typeof createCategorieFluxSchema>;

export const updateCategorieFluxSchema = z.object({
    libelle: z.string().min(2).max(50).optional(),
    couleur: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Couleur hexadécimale requise, ex: #EF4444").optional(),
    description: z.string().max(300).nullable().optional(),
});
export type UpdateCategorieFluxInput = z.infer<typeof updateCategorieFluxSchema>;