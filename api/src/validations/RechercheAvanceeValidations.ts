import { AlerteLangue } from "@prisma/client";
import { z } from "zod";

// Réutilise les mêmes codes de langue que les Alertes, mais exclut "toutes" —
// une recherche cross-langue a besoin de 2 langues précises, pas d'un joker
const langueSchema = z.nativeEnum(AlerteLangue).refine((v) => v !== "toutes", {
    message: "Choisis une langue précise (pas 'toutes')",
});

export const rechercheAvanceeSchema = z.object({
    requete: z.string().min(2, "2 caractères minimum").max(200),
    langue_source: langueSchema,
    langue_cible: langueSchema,
    pays: z.string().regex(/^[A-Z]{2}$/, "Code pays ISO 3166-1 alpha-2 requis").optional(),
});
export type RechercheAvanceeInput = z.infer<typeof rechercheAvanceeSchema>;