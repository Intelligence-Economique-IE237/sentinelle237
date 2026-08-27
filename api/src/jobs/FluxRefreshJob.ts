import cron from "node-cron";
import FluxService from "../services/FluxService";

const { FLUX_AUTO_REFRESH_ENABLED, FLUX_AUTO_REFRESH_CRON } = process.env as { [key: string]: string };

const fluxService = new FluxService();
let isRunning = false;

export function startFluxRefreshJob() {
  if (FLUX_AUTO_REFRESH_ENABLED !== "true") {
    console.log("[flux-refresh-job]: désactivé (FLUX_AUTO_REFRESH_ENABLED=false)");
    return;
  }

  const schedule = FLUX_AUTO_REFRESH_CRON || "*/15 * * * *";

  cron.schedule(schedule, async () => {
    if (isRunning) {
      console.log("[flux-refresh-job]: exécution précédente encore en cours, cycle ignoré");
      return;
    }

    isRunning = true;
    console.log("[flux-refresh-job]: démarrage...");
    try {
      const result = await fluxService.refreshDueFlux();
      console.log(
        `[flux-refresh-job]: terminé — ${result.refreshed}/${result.total} actualisés, ${result.failed.length} échecs`
      );
      if (result.failed.length > 0) {
        console.log("[flux-refresh-job]: détail des échecs:", result.failed);
      }
    } catch (err) {
      console.error("[flux-refresh-job]: erreur inattendue:", err);
    } finally {
      isRunning = false;
    }
  });

  console.log(`[flux-refresh-job]: planifié (${schedule})`);
}