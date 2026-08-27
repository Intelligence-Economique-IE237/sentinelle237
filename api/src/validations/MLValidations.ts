import { CategorieArticle } from "@prisma/client";
import { z } from "zod";

export const feedbackSchema = z.object({
    texte: z.string().min(5, "Texte trop court pour être utile à l'entraînement"),
    categorie: z.nativeEnum(CategorieArticle),
});
export type FeedbackInput = z.infer<typeof feedbackSchema>;