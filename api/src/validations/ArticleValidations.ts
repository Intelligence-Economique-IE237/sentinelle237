import { z } from "zod";

export const annotationSchema = z.object({
    note: z.string().max(1000, "1000 caractères maximum").nullable(),
});
export type AnnotationInput = z.infer<typeof annotationSchema>;

export const favoriSchema = z.object({
    favori: z.boolean(),
});
export type FavoriInput = z.infer<typeof favoriSchema>;

export const listFavorisQuerySchema = z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export type ListFavorisQuery = z.infer<typeof listFavorisQuerySchema>;

export const luSchema = z.object({
    lu: z.boolean(),
});
export type LuInput = z.infer<typeof luSchema>;