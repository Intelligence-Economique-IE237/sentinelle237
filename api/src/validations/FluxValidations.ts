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

export const epingleSchema = z.object({
  epingle: z.boolean(),
});
export type EpingleInput = z.infer<typeof epingleSchema>;