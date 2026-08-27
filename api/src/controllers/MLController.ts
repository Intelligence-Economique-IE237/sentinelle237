import type { Request, Response, NextFunction } from "express";
import { MLFeedbackService } from "../services/MLFeedbackService";
import { mlInferenceService } from "../services/MLInferenceService";
import { enqueueRetrain } from "../queues/retrainQueue";
import { HttpException } from "../utils/HttpExceptions";

const mlFeedbackService = new MLFeedbackService();

export default class MLController {
    async feedback(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await mlFeedbackService.submitFeedback(req.body.texte, req.body.categorie);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async predict(req: Request, res: Response, next: NextFunction) {
        try {
            const { texte } = req.body as { texte: string };
            if (!texte) throw new HttpException(400, "Champ 'texte' requis");

            const resultat = await mlInferenceService.classify(texte);
            if (!resultat) return res.status(503).json({ message: "Aucun modèle entraîné n'est encore disponible" });
            res.status(200).json(resultat);
        } catch (err) {
            next(err);
        }
    }

    async triggerRetrain(_req: Request, res: Response, next: NextFunction) {
        try {
            await enqueueRetrain("Déclenchement manuel par un administrateur");
            res.status(202).json({ message: "Ré-entraînement mis en file d'attente" });
        } catch (err) {
            next(err);
        }
    }
}