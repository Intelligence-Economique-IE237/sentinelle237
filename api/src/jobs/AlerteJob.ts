import cron from "node-cron";
import { AlerteFrequence } from "@prisma/client";
import AlerteService from "../services/AlerteService";

const { ALERTE_INTERNAL_MATCH_CRON, ALERTE_WEB_SEARCH_CRON, ALERTE_DAILY_DIGEST_CRON, ALERTE_WEEKLY_DIGEST_CRON } =
  process.env as { [key: string]: string };

const alerteService = new AlerteService();
let internalRunning = false;
let webSearchRunning = false;
let dailyDigestRunning = false;
let weeklyDigestRunning = false;

export function startAlerteJobs() {
  const internalSchedule = ALERTE_INTERNAL_MATCH_CRON || "*/10 * * * *";
  cron.schedule(internalSchedule, async () => {
    if (internalRunning) return;
    internalRunning = true;
    try {
      const result = await alerteService.runInternalMatchForAllActive();
      console.log(`[alerte-internal-match]: ${result.matched}/${result.total} alertes vérifiées`);
    } catch (err) {
      console.error("[alerte-internal-match]: erreur inattendue:", err);
    } finally {
      internalRunning = false;
    }
  });
  console.log(`[alerte-internal-match]: planifié (${internalSchedule})`);

  const webSchedule = ALERTE_WEB_SEARCH_CRON || "0 3 * * *";
  cron.schedule(webSchedule, async () => {
    if (webSearchRunning) return;
    webSearchRunning = true;
    try {
      const result = await alerteService.runWebSearchBatch();
      if (result.quotaExhausted) {
        console.log("[alerte-web-search]: quota Currents API déjà épuisé pour aujourd'hui");
      } else {
        console.log(`[alerte-web-search]: ${result.searched}/${result.total} mots-clés vérifiés sur le web`);
      }
    } catch (err) {
      console.error("[alerte-web-search]: erreur inattendue:", err);
    } finally {
      webSearchRunning = false;
    }
  });
  console.log(`[alerte-web-search]: planifié (${webSchedule})`);

  const dailySchedule = ALERTE_DAILY_DIGEST_CRON || "0 7 * * *";
  cron.schedule(dailySchedule, async () => {
    if (dailyDigestRunning) return;
    dailyDigestRunning = true;
    try {
      const result = await alerteService.runDigestBatch(AlerteFrequence.quotidien, 24 * 60 * 60 * 1000);
      console.log(`[alerte-digest-quotidien]: ${result.sent}/${result.total} emails envoyés`);
    } catch (err) {
      console.error("[alerte-digest-quotidien]: erreur inattendue:", err);
    } finally {
      dailyDigestRunning = false;
    }
  });
  console.log(`[alerte-digest-quotidien]: planifié (${dailySchedule})`);

  const weeklySchedule = ALERTE_WEEKLY_DIGEST_CRON || "0 7 * * 1";
  cron.schedule(weeklySchedule, async () => {
    if (weeklyDigestRunning) return;
    weeklyDigestRunning = true;
    try {
      const result = await alerteService.runDigestBatch(AlerteFrequence.hebdomadaire, 7 * 24 * 60 * 60 * 1000);
      console.log(`[alerte-digest-hebdomadaire]: ${result.sent}/${result.total} emails envoyés`);
    } catch (err) {
      console.error("[alerte-digest-hebdomadaire]: erreur inattendue:", err);
    } finally {
      weeklyDigestRunning = false;
    }
  });
  console.log(`[alerte-digest-hebdomadaire]: planifié (${weeklySchedule})`);
}