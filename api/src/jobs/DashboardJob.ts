import cron from "node-cron";
import DashboardService from "../services/DashboardService";
import { PAIRES_DEVISES_SUIVIES, METAUX_SUIVIS } from "../config/dashboardConstants";
const { DASHBOARD_INDICES_US_CRON, DASHBOARD_INDICES_NON_US_CRON, DASHBOARD_BRVM_CRON, DASHBOARD_BVMAC_CRON } = process.env as { [key: string]: string };

const { DASHBOARD_REFRESH_CRON, DASHBOARD_OIL_REFRESH_CRON } = process.env as { [key: string]: string };

const dashboardService = new DashboardService();
let mainRunning = false;
let oilRunning = false;

export function startDashboardJobs() {
    const mainSchedule = DASHBOARD_REFRESH_CRON || "*/15 * * * *";
    cron.schedule(mainSchedule, async () => {
        if (mainRunning) return;
        mainRunning = true;
        try {
            const result = await dashboardService.refreshDevisesEtMetaux();
            console.log(
                `[dashboard-refresh]: devises ${result.devisesOk}/${PAIRES_DEVISES_SUIVIES.length} — métaux ${result.metauxOk}/${METAUX_SUIVIS.length}`
            );
        } catch (err) {
            console.error("[dashboard-refresh]: erreur inattendue:", err);
        } finally {
            mainRunning = false;
        }
    });
    console.log(`[dashboard-refresh]: planifié (${mainSchedule})`);

    const oilSchedule = DASHBOARD_OIL_REFRESH_CRON || "0 */8 * * *";
    cron.schedule(oilSchedule, async () => {
        if (oilRunning) return;
        oilRunning = true;
        try {
            const result = await dashboardService.refreshPetrole();
            if (result.quotaExhausted) {
                console.log("[dashboard-refresh-oil]: quota OilPriceAPI épuisé pour ce mois");
            } else {
                console.log(`[dashboard-refresh-oil]: ${result.refreshed}/${result.total} cours pétrole actualisés`);
            }
        } catch (err) {
            console.error("[dashboard-refresh-oil]: erreur inattendue:", err);
        } finally {
            oilRunning = false;
        }
    });
    console.log(`[dashboard-refresh-oil]: planifié (${oilSchedule})`);

    cron.schedule(DASHBOARD_INDICES_US_CRON || "*/10 * * * *", async () => {
        const result = await dashboardService.refreshIndicesUS();
        console.log(`[dashboard-indices-us]: ${result.ok} actualisés, ${result.echec} échecs`);
    });

    cron.schedule(DASHBOARD_INDICES_NON_US_CRON || "*/30 * * * *", async () => {
        const result = await dashboardService.refreshIndicesNonUS();
        console.log(`[dashboard-indices-non-us]: ${result.ok} actualisés, ${result.echec} échecs`);
    });

    cron.schedule(DASHBOARD_BRVM_CRON || "0 17 * * 1-5", async () => {
        const result = await dashboardService.refreshBrvm();
        console.log(`[dashboard-brvm]: ${result.ok} indices actualisés`);
    });

    cron.schedule(DASHBOARD_BVMAC_CRON || "0 18 * * 1-5", async () => {
        const result = await dashboardService.refreshBvmac();
        console.log(`[dashboard-bvmac]: ${result.ok ? "actualisé" : "échec"}`);
    });
}