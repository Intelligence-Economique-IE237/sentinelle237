import { Worker } from "bullmq";
import { spawn } from "child_process";
import path from "path";
import Redis from "ioredis";
import dotenv from "dotenv";
import { MLFeedbackService } from "../services/MLFeedbackService";
import { parseRedisUrl } from "../utils/redisConnection";

dotenv.config();

const { REDIS_URL, ML_MODEL_DIR, ML_RELOAD_CHANNEL, ML_PYTHON_BIN } = process.env as { [key: string]: string };

const publisher = new Redis(REDIS_URL);
const mlFeedbackService = new MLFeedbackService();

function runPythonTraining(dataPath: string, outputDir: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const pythonBin = ML_PYTHON_BIN || "python3";
        const scriptPath = path.resolve("ml/train_and_export.py");
        const child = spawn(pythonBin, [scriptPath, "--data", dataPath, "--output", outputDir]);

        child.stdout.on("data", (chunk) => console.log(`[python]: ${chunk.toString().trim()}`));
        child.stderr.on("data", (chunk) => console.error(`[python-err]: ${chunk.toString().trim()}`));

        child.on("close", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Le script Python a échoué avec le code ${code}`));
        });
    });
}

const worker = new Worker(
    "retrain-classification",
    async (job) => {
        console.log(`[retrain-worker]: démarrage du ré-entraînement (raison: ${job.data.reason})`);

        const dataPath = path.resolve("ml/data/training_data.json");
        const outputDir = path.resolve(ML_MODEL_DIR || "./ml/models");

        const nbExemples = await mlFeedbackService.exportTrainingData(dataPath);
        console.log(`[retrain-worker]: ${nbExemples} exemples exportés pour l'entraînement`);

        await runPythonTraining(dataPath, outputDir);

        await publisher.publish(ML_RELOAD_CHANNEL || "model:reloaded", "reload");
        console.log("[retrain-worker]: notification de rechargement envoyée");
    },
    { connection: parseRedisUrl(REDIS_URL) }
);

worker.on("failed", (job, err) => console.error(`[retrain-worker]: job ${job?.id} échoué:`, err.message));
worker.on("completed", (job) => console.log(`[retrain-worker]: job ${job.id} terminé avec succès`));

console.log("[retrain-worker]: en écoute sur la file 'retrain-classification'");