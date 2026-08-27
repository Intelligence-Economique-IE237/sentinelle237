import { z } from "zod";

export const genererRevueSchema = z
    .object({
        modele_id: z.string().min(1),
        titre: z.string().min(1),
        dossier_id: z.string().optional(),
        flux_ids: z.array(z.string()).optional(),
    })
    .refine((data) => !!data.dossier_id || (data.flux_ids && data.flux_ids.length > 0), {
        message: "Fournir soit dossier_id, soit flux_ids",
        path: ["dossier_id"],
    });
export type GenererRevueInput = z.infer<typeof genererRevueSchema>;