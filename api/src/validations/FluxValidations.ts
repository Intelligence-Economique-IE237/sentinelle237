import { FluxType, Zone } from "@prisma/client";
import { z } from "zod";

export const createFluxSchema = z.object({
  identifiant: z.string().min(1, "Requis : domaine, URL du site, identifiant du compte, ou nom du canal"),
  type: z.nativeEnum(FluxType).default(FluxType.rss),
  nom: z.string().min(1).optional(),
  categorie: z.string().min(1).optional(),
});
export type CreateFluxInput = z.infer<typeof createFluxSchema>;

export const listArticlesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>;

export const listFluxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  type: z.nativeEnum(FluxType).optional(),
  categorie: z.string().min(1).optional(),
});
export type ListFluxQuery = z.infer<typeof listFluxQuerySchema>;

export const listSuggestionsQuerySchema = z.object({
  zone: z.nativeEnum(Zone).optional(),
  categorie: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListSuggestionsQuery = z.infer<typeof listSuggestionsQuerySchema>;

export const listMyFluxQuerySchema = z.object({
  zone: z.nativeEnum(Zone).optional(),
  type: z.nativeEnum(FluxType).optional(),
  categorie: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListMyFluxQuery = z.infer<typeof listMyFluxQuerySchema>;

// Mise à jour d'un flux par un administrateur : zone géographique et/ou catégorie
// (categorie_id: null retire la catégorie)
export const updateFluxByAdminSchema = z
  .object({
    zone: z.nativeEnum(Zone).optional(),
    categorie_id: z.string().min(1).nullable().optional(),
  })
  .refine((d) => d.zone !== undefined || d.categorie_id !== undefined, {
    message: "Indique au moins une zone ou une catégorie",
  });
export type UpdateFluxByAdminInput = z.infer<typeof updateFluxByAdminSchema>;

export const epingleSchema = z.object({
  epingle: z.boolean(),
});
export type EpingleInput = z.infer<typeof epingleSchema>;