import { db } from "../config/db";
import { CategorieArticle } from "@prisma/client";
import { enqueueRetrain } from "../queues/retrainQueue";

const { ML_RETRAIN_FEEDBACK_THRESHOLD } = process.env as { [key: string]: string };

export class MLFeedbackService {
    async submitFeedback(texte: string, categorie: CategorieArticle) {
        await db.feedbackClassification.create({ data: { texte, categorie } });

        const nonUtilises = await db.feedbackClassification.count({
            where: { utilise_pour_entrainement: false },
        });

        if (nonUtilises >= Number(ML_RETRAIN_FEEDBACK_THRESHOLD)) {
            await enqueueRetrain(`Seuil de ${ML_RETRAIN_FEEDBACK_THRESHOLD} feedbacks atteint`);
        }

        return { nonUtilises };
    }

    async exportTrainingData(outputPath: string): Promise<number> {
        const fs = await import("fs/promises");

        const feedbacks = await db.feedbackClassification.findMany({
            where: { utilise_pour_entrainement: false },
        });

        const articlesLabelises = await db.article.findMany({
            where: { categorie: { not: null } },
            select: { titre: true, description: true, categorie: true },
            take: 5000,
        });

        const dataset = [
            ...feedbacks.map((f) => ({ texte: f.texte, categorie: f.categorie })),
            ...articlesLabelises.map((a) => ({
                texte: `${a.titre} ${a.description ?? ""}`.trim(),
                categorie: a.categorie,
            })),
        ];

        await fs.writeFile(outputPath, JSON.stringify(dataset), "utf-8");

        await db.feedbackClassification.updateMany({
            where: { id_feedback: { in: feedbacks.map((f) => f.id_feedback) } },
            data: { utilise_pour_entrainement: true },
        });

        return dataset.length;
    }
}