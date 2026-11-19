import ArticleRepository from "../repositories/ArticleRepository";
import UserFluxRepository from "../repositories/UserFluxRepository";
import ApiQuotaRepository from "../repositories/ApiQuotaRepository";
import { TranslationService } from "./TranslationService";
import { CurrentsApiService } from "./CurrentsApiService";
import { HttpException } from "../utils/HttpExceptions";
import { keywordTerms } from "../utils/keywordSearch";
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


        // La traduction ne doit pas bloquer toute la recherche : si LibreTranslate
        // est indisponible, on continue avec la requête d'origine seulement.
        let requeteTraduite = input.requete;
        let traductionIndisponible = false;
        try {
            requeteTraduite = await this.translationService.translate(
                input.requete,
                input.langue_source,
                input.langue_cible
            );
        } catch (err) {
            console.error("[recherche-avancee]: traduction indisponible:", err instanceof Error ? err.message : err);
            traductionIndisponible = true;
        }
        const traductionDistincte = !traductionIndisponible && requeteTraduite.trim() !== input.requete.trim();

        const fluxIds = await this.userFluxRepository.getSubscribedFluxIds(userId);
        const articlesInternes = await this.articleRepository.searchByTermsInFlux(fluxIds, [
            keywordTerms(input.requete),
            ...(traductionDistincte ? [keywordTerms(requeteTraduite)] : []),
        ]);

        const usedGlobal = await this.apiQuotaRepository.getCount(CURRENTS_ADVANCED_QUOTA_KEY, period);
        // Variable absente ou invalide : 100 recherches web par jour par défaut (sinon NaN bloquait tout)
        const quotaWeb = Number(CURRENTS_ADVANCED_SEARCH_DAILY_QUOTA) || 100;
        const remaining = quotaWeb - usedGlobal;

        let resultatsSource: Awaited<ReturnType<CurrentsApiService["search"]>> = [];
        let resultatsCible: Awaited<ReturnType<CurrentsApiService["search"]>> = [];
        let webIndisponible = false;
        let webRaison: "quota" | "erreur" | null = null;

        const appelsWeb = traductionDistincte ? 2 : 1;
        if (remaining >= appelsWeb) {
            // Les deux recherches partent en parallèle ; l'échec de l'une n'annule pas l'autre
            const [source, cible] = await Promise.allSettled([
                this.currentsApiService.search(input.requete, {
                    language: input.langue_source,
                    country: input.pays,
                }),
                traductionDistincte
                    ? this.currentsApiService.search(requeteTraduite, {
                          language: input.langue_cible,
                          country: input.pays,
                      })
                    : Promise.resolve([]),
            ]);
            for (const r of [source, cible]) {
                if (r.status === "rejected") {
                    console.error("[recherche-avancee]: échec recherche web:", r.reason instanceof Error ? r.reason.message : r.reason);
                }
            }
            if (source.status === "fulfilled") resultatsSource = source.value;
            if (cible.status === "fulfilled") resultatsCible = cible.value;
            if (source.status === "rejected" && (cible.status === "rejected" || !traductionDistincte)) {
                webIndisponible = true;
                webRaison = "erreur";
            }
            await this.apiQuotaRepository.increment(CURRENTS_ADVANCED_QUOTA_KEY, period, appelsWeb);
        } else {
            console.warn(`[recherche-avancee]: quota web du jour atteint (${usedGlobal}/${quotaWeb}), recherche web ignorée`);
            webIndisponible = true;
            webRaison = "quota";
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
            webRaison,
            traductionIndisponible,
        };
    }
}