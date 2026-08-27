import * as ort from "onnxruntime-node";
import fs from "fs/promises";
import path from "path";
import Redis from "ioredis";
import { CategorieArticle } from "@prisma/client";
import { TfidfService } from "./TfidfService";

const { REDIS_URL, ML_MODEL_DIR, ML_RELOAD_CHANNEL } = process.env as { [key: string]: string };

type Manifest = {
    model: string;
    vectorizer: string;
    classes: string;
    trained_at: string;
    n_samples: number;
};

class MLInferenceServiceSingleton {
    private session: ort.InferenceSession | null = null;
    private tfidfService: TfidfService = new TfidfService();
    private classes: CategorieArticle[] = [];
    private ready = false;

    async init() {
        await this.reload();
        this.subscribeToReloads();
    }

    private subscribeToReloads() {
        const subscriber = new Redis(REDIS_URL);
        const channel = ML_RELOAD_CHANNEL || "model:reloaded";

        subscriber.subscribe(channel, (err) => {
            if (err) console.error("[ml-inference]: échec de l'abonnement Redis Pub/Sub:", err);
            else console.log(`[ml-inference]: abonné au canal "${channel}" pour le rechargement à chaud`);
        });

        subscriber.on("message", async () => {
            console.log("[ml-inference]: notification de rechargement reçue, rechargement du modèle...");
            try {
                await this.reload();
                console.log("[ml-inference]: modèle rechargé avec succès (hot reload)");
            } catch (err) {
                console.error("[ml-inference]: échec du rechargement, l'ancien modèle reste actif:", err);
            }
        });
    }

    async reload() {
        const manifestPath = path.join(ML_MODEL_DIR || "./ml/models", "current_manifest.json");

        let manifest: Manifest;
        try {
            const raw = await fs.readFile(manifestPath, "utf-8");
            manifest = JSON.parse(raw);
        } catch {
            console.log("[ml-inference]: aucun modèle entraîné trouvé pour l'instant (manifest absent)");
            return;
        }

        const nouvelleSession = await ort.InferenceSession.create(manifest.model);
        const nouveauTfidf = new TfidfService();
        await nouveauTfidf.load(manifest.vectorizer);

        const classesRaw = await fs.readFile(manifest.classes, "utf-8");
        const nouvellesClasses = JSON.parse(classesRaw) as CategorieArticle[];

        const ancienneSession = this.session;
        this.session = nouvelleSession;
        this.tfidfService = nouveauTfidf;
        this.classes = nouvellesClasses;
        this.ready = true;

        if (ancienneSession) {
            setTimeout(() => ancienneSession.release().catch(() => {}), 30_000);
        }
    }

    async classify(texte: string): Promise<{ categorie: CategorieArticle; confiance: number } | null> {
        if (!this.ready || !this.session) return null;

        const session = this.session;
        const vecteur = this.tfidfService.transform(texte);
        const inputTensor = new ort.Tensor("float32", vecteur, [1, vecteur.length]);
        const feeds: Record<string, ort.Tensor> = { input: inputTensor };

        const results = await session.run(feeds);
        const probabilites = results[Object.keys(results)[0]].data as Float32Array;

        let maxIndex = 0;
        for (let i = 1; i < probabilites.length; i++) {
            if (probabilites[i] > probabilites[maxIndex]) maxIndex = i;
        }

        return { categorie: this.classes[maxIndex], confiance: probabilites[maxIndex] };
    }

    isReady() {
        return this.ready;
    }
}

export const mlInferenceService = new MLInferenceServiceSingleton();