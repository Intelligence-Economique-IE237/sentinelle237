import CoursDeviseRepository from "../repositories/CoursDeviseRepository";
import CoursMatierePremiereRepository from "../repositories/CoursMatierePremiereRepository";
import ApiQuotaRepository from "../repositories/ApiQuotaRepository";
import { CurrencyRateService } from "./CurrencyRateService";
import { CommodityService } from "./CommodityService";
import { PAIRES_DEVISES_SUIVIES, METAUX_SUIVIS, PETROLE_SUIVI } from "../config/dashboardConstants";
import type { HistoriqueQuery } from "../validations/DashboardValidations";

const { OILPRICEAPI_MONTHLY_QUOTA } = process.env as { [key: string]: string };
const OIL_QUOTA_KEY = "oilpriceapi";

const coursDeviseRepository = new CoursDeviseRepository();
const coursMatiereRepository = new CoursMatierePremiereRepository();
const apiQuotaRepository = new ApiQuotaRepository();
const currencyRateService = new CurrencyRateService();
const commodityService = new CommodityService();

function currentMonthPeriod(): string {
    return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

function computeVariation(current: number, previous: number | null): number | null {
    if (previous === null || previous === 0) return null;
    return ((current - previous) / previous) * 100;
}

type DashboardKpis = {
    devises: Awaited<ReturnType<CoursDeviseRepository["getLatestForAll"]>>;
    matieres: Awaited<ReturnType<CoursMatierePremiereRepository["getLatestForAll"]>>;
};

const KPIS_CACHE_TTL_MS = 60_000; // 1 minute

export default class DashboardService {
    private readonly coursDeviseRepository: CoursDeviseRepository;
    private readonly coursMatiereRepository: CoursMatierePremiereRepository;
    private readonly apiQuotaRepository: ApiQuotaRepository;
    private readonly currencyRateService: CurrencyRateService;
    private readonly commodityService: CommodityService;
    private kpisCache: { data: Awaited<ReturnType<DashboardService["getDashboardKpis"]>>; expiresAt: number } | null = null;

    constructor() {
        this.coursDeviseRepository = coursDeviseRepository;
        this.coursMatiereRepository = coursMatiereRepository;
        this.apiQuotaRepository = apiQuotaRepository;
        this.currencyRateService = currencyRateService;
        this.commodityService = commodityService;
    }

    private async fetchDashboardKpis(): Promise<DashboardKpis> {
        const [devises, matieres] = await Promise.all([
            this.coursDeviseRepository.getLatestForAll(PAIRES_DEVISES_SUIVIES),
            this.coursMatiereRepository.getLatestForAll([
                ...METAUX_SUIVIS.map((m) => m.type),
                ...PETROLE_SUIVI.map((p) => p.type),
            ]),
        ]);
        return { devises, matieres };
    }

    async getDashboardKpis(): Promise<DashboardKpis> {
        if (this.kpisCache && Date.now() < this.kpisCache.expiresAt) {
            return this.kpisCache.data;
        }

        const data = await this.fetchDashboardKpis();
        this.kpisCache = { data, expiresAt: Date.now() + KPIS_CACHE_TTL_MS };
        return data;
    }

    private invalidateKpisCache() {
        this.kpisCache = null;
    }

    async getDeviseHistorique(paire: string, query: HistoriqueQuery) {
        const skip = (query.page - 1) * query.limit;
        const { historique, total } = await this.coursDeviseRepository.getHistory(paire, { skip, take: query.limit });
        return {
            historique,
            pagination: { total, page: query.page, limit: query.limit, totalPages: Math.max(Math.ceil(total / query.limit), 1) },
        };
    }

    async getMatiereHistorique(matiere: string, query: HistoriqueQuery) {
        const skip = (query.page - 1) * query.limit;
        const { historique, total } = await this.coursMatiereRepository.getHistory(matiere, { skip, take: query.limit });
        return {
            historique,
            pagination: { total, page: query.page, limit: query.limit, totalPages: Math.max(Math.ceil(total / query.limit), 1) },
        };
    }


    async refreshDevisesEtMetaux() {
        let devisesOk = 0;
        let devisesEchec = 0;
        let metauxOk = 0;
        let metauxEchec = 0;

        for (const paire of PAIRES_DEVISES_SUIVIES) {
            try {
                const [from, to] = paire.split("/");
                const taux = await this.currencyRateService.getPairRate(from, to);

                const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const previous = await this.coursDeviseRepository.getClosestBefore(paire, cutoff);

                await this.coursDeviseRepository.create({
                    paire,
                    taux,
                    variation_24h: computeVariation(taux, previous?.taux ?? null),
                });
                devisesOk++;
            } catch (err) {
                console.error(`[dashboard-refresh]: échec devise "${paire}":`, err instanceof Error ? err.message : err);
                devisesEchec++;
            }
        }

        for (const metal of METAUX_SUIVIS) {
            try {
                const result = await this.commodityService.getMetalPrice(metal.symbol, "USD");

                const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const previous = await this.coursMatiereRepository.getClosestBefore(metal.type, cutoff);

                await this.coursMatiereRepository.create({
                    matiere: metal.type,
                    prix: result.price,
                    devise: "USD",
                    variation_24h: computeVariation(result.price, previous?.prix ?? null),
                });
                metauxOk++;
            } catch (err) {
                console.error(`[dashboard-refresh]: échec métal "${metal.symbol}":`, err instanceof Error ? err.message : err);
                metauxEchec++;
            }
        }
        this.invalidateKpisCache();
        return { devisesOk, devisesEchec, metauxOk, metauxEchec };
    }

    async refreshPetrole() {
        const period = currentMonthPeriod();
        const used = await this.apiQuotaRepository.getCount(OIL_QUOTA_KEY, period);
        const remaining = Number(OILPRICEAPI_MONTHLY_QUOTA) - used;

        if (remaining <= 0) {
            return { total: PETROLE_SUIVI.length, refreshed: 0, quotaExhausted: true };
        }

        let refreshed = 0;
        for (const petrole of PETROLE_SUIVI.slice(0, remaining)) {
            try {
                const result = await this.commodityService.getOilPrice(petrole.code);

                const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const previous = await this.coursMatiereRepository.getClosestBefore(petrole.type, cutoff);

                await this.coursMatiereRepository.create({
                    matiere: petrole.type,
                    prix: result.price,
                    devise: result.currency,
                    variation_24h: computeVariation(result.price, previous?.prix ?? null),
                });

                await this.apiQuotaRepository.increment(OIL_QUOTA_KEY, period, 1);
                refreshed++;
            } catch (err) {
                console.error(`[dashboard-refresh-oil]: échec "${petrole.code}":`, err instanceof Error ? err.message : err);
            }
        }
        this.invalidateKpisCache();
        return { total: PETROLE_SUIVI.length, refreshed, quotaExhausted: false };
    }
}