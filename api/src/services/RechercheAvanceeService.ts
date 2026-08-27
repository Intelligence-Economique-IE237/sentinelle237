import ArticleRepository from "../repositories/ArticleRepository";
import UserFluxRepository from "../repositories/UserFluxRepository";
import ApiQuotaRepository from "../repositories/ApiQuotaRepository";
import { TranslationService } from "./TranslationService";
import { CurrentsApiService } from "./CurrentsApiService";
import { HttpException } from "../utils/HttpExceptions";
import type { RechercheAvanceeInput } from "../validations/RechercheAvanceeValidations";

const { CURRENTS_ADVANCED_SEARCH_DAILY_QUOTA, RECHERCHE_AVANCEE_MAX_PAR_JOUR_PAR_USER } = process.env as {
    [key: string]: string;
};
const CURRENTS_ADVANCED_QUOTA_KEY = "currents_api_recherche_avancee";

const articleRepository = new ArticleRepository();
const userFluxRepository = new UserFluxRepository();
const apiQuotaRepository = new ApiQuotaRepository();
const translationService = new TranslationService();
const currentsApiService = new CurrentsApiService();

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

export default class RechercheAvanceeService {
    private readonly articleRepository: ArticleRepository;
    private readonly userFluxRepository: UserFluxRepository;
    private readonly apiQuotaRepository: ApiQuotaRepository;
    private readonly translationService: TranslationService;
    private readonly currentsApiService: CurrentsApiService;

    constructor() {
        this.articleRepository = articleRepository;
        this.userFluxRepository = userFluxRepository;
        this.apiQuotaRepository = apiQuotaRepository;
        this.translationService = translationService;
        this.currentsApiService = currentsApiService;
    }

    async rechercher(userId: string, input: RechercheAvanceeInput) {

        const userQuotaKey = `recherche_avancee:${userId}`;
        const period = today();
        const usedByUser = await this.apiQuotaRepository.getCount(userQuotaKey, period);
        if (usedByUser >= Number(RECHERCHE_AVANCEE_MAX_PAR_JOUR_PAR_USER)) {
            throw new HttpException(429, "Limite quotidienne de recherches avancées atteinte pour ton compte");
        }


        const requeteTraduite = await this.translationService.translate(
            input.requete,
            input.langue_source,
            input.langue_cible
        );

        const fluxIds = await this.userFluxRepository.getSubscribedFluxIds(userId);
        const articlesInternes = await this.articleRepository.searchByKeywordsInFlux(fluxIds, [
            input.requete,
            requeteTraduite,
        ]);

        const usedGlobal = await this.apiQuotaRepository.getCount(CURRENTS_ADVANCED_QUOTA_KEY, period);
        const remaining = Number(CURRENTS_ADVANCED_SEARCH_DAILY_QUOTA) - usedGlobal;

        let resultatsSource: Awaited<ReturnType<CurrentsApiService["search"]>> = [];
        let resultatsCible: Awaited<ReturnType<CurrentsApiService["search"]>> = [];
        let webIndisponible = false;

        if (remaining >= 2) {
            try {
                resultatsSource = await this.currentsApiService.search(input.requete, {
                    language: input.langue_source,
                    country: input.pays,
                });
                resultatsCible = await this.currentsApiService.search(requeteTraduite, {
                    language: input.langue_cible,
                    country: input.pays,
                });
                await this.apiQuotaRepository.increment(CURRENTS_ADVANCED_QUOTA_KEY, period, 2);
            } catch (err) {
                console.error("[recherche-avancee]: échec recherche web:", err instanceof Error ? err.message : err);
                webIndisponible = true;
            }
        } else {
            webIndisponible = true;
        }

        await this.apiQuotaRepository.increment(userQuotaKey, period, 1);

        return {
            requete_originale: input.requete,
            requete_traduite: requeteTraduite,
            corpus_interne: articlesInternes,
            web: {
                [input.langue_source]: resultatsSource.map((r) => ({
                    titre: r.title,
                    lien: r.url,
                    description: r.description,
                    date_publication: r.published,
                })),
                [input.langue_cible]: resultatsCible.map((r) => ({
                    titre: r.title,
                    lien: r.url,
                    description: r.description,
                    date_publication: r.published,
                })),
            },
            webIndisponible,
        };
    }
}