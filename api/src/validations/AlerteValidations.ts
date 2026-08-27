import { AlerteSource, AlerteFrequence, AlerteLangue, AlerteNombreResultats } from "@prisma/client";
import { z } from "zod";

export const createAlerteSchema = z.object({
  mot_cle: z.string().min(2, "2 caractères minimum").max(100, "100 caractères maximum"),
  frequence: z.nativeEnum(AlerteFrequence).optional().default(AlerteFrequence.immediat),
  langue: z.nativeEnum(AlerteLangue).optional().default(AlerteLangue.toutes),
  pays: z
    .string()
    .regex(/^[A-Z]{2}$/, "Code pays ISO 3166-1 alpha-2 requis (ex: CM, FR, US)")
    .optional(),
  nombre_resultats: z.nativeEnum(AlerteNombreResultats).optional().default(AlerteNombreResultats.meilleurs),
});
export type CreateAlerteInput = z.infer<typeof createAlerteSchema>;

export const updateAlerteSchema = z.object({
  actif: z.boolean().optional(),
  frequence: z.nativeEnum(AlerteFrequence).optional(),
  langue: z.nativeEnum(AlerteLangue).optional(),
  pays: z
    .string()
    .regex(/^[A-Z]{2}$/, "Code pays ISO 3166-1 alpha-2 requis (ex: CM, FR, US)")
    .nullable()
    .optional(),
  nombre_resultats: z.nativeEnum(AlerteNombreResultats).optional(),
});
export type UpdateAlerteInput = z.infer<typeof updateAlerteSchema>;

export const listAlerteResultatsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  source: z.nativeEnum(AlerteSource).optional(),
  lu: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});
export type ListAlerteResultatsQuery = z.infer<typeof listAlerteResultatsQuerySchema>;