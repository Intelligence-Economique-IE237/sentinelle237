import { z } from "zod";

export const createDossierSchema = z.object({
    nom: z.string().min(2, "2 caractères minimum").max(100),
    description: z.string().max(500).optional(),
});
export type CreateDossierInput = z.infer<typeof createDossierSchema>;

export const updateDossierSchema = z.object({
    nom: z.string().min(2).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
});
export type UpdateDossierInput = z.infer<typeof updateDossierSchema>;

export const linkAlerteSchema = z.object({
    alerte_id: z.string().min(1, "alerte_id requis"),
});
export type LinkAlerteInput = z.infer<typeof linkAlerteSchema>;

export const linkFluxSchema = z.object({
    flux_id: z.string().min(1, "flux_id requis"),
});
export type LinkFluxInput = z.infer<typeof linkFluxSchema>;

export const timelineQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
export type TimelineQuery = z.infer<typeof timelineQuerySchema>;