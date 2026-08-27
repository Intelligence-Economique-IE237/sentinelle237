import { Queue } from "bullmq";
import { parseRedisUrl } from "../utils/redisConnection";

const { REDIS_URL } = process.env as { [key: string]: string };

export const retrainQueue = new Queue("retrain-classification", { connection: parseRedisUrl(REDIS_URL) });

export async function enqueueRetrain(reason: string) {
    await retrainQueue.add(
        "retrain",
        { reason, triggeredAt: new Date().toISOString() },
        { removeOnComplete: true, removeOnFail: 50 }
    );
}