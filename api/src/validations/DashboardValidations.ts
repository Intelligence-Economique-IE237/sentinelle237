import { z } from "zod";

export const historiqueQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
});
export type HistoriqueQuery = z.infer<typeof historiqueQuerySchema>;

export const matiereParamSchema = z.enum([
    "or",
    "argent",
    "platine",
    "palladium",
    "cuivre",
    "petrole_brent",
    "petrole_wti",
]);