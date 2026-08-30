import ArticleRepository from "../repositories/ArticleRepository";
import ArticleInteractionRepository from "../repositories/ArticleInteractionRepository";
import UserFluxRepository from "../repositories/UserFluxRepository";
import { HttpException } from "../utils/HttpExceptions";
import { type AnnotationInput, type FavoriInput, type LuInput, type ListFavorisQuery } from "../validations/ArticleValidations";

const articleRepository = new ArticleRepository();
const articleInteractionRepository = new ArticleInteractionRepository();
const userFluxRepository = new UserFluxRepository();

export default class ArticleService {
    private readonly articleRepository: ArticleRepository;
    private readonly articleInteractionRepository: ArticleInteractionRepository;
    private readonly userFluxRepository: UserFluxRepository;

    constructor() {
        this.articleRepository = articleRepository;
        this.articleInteractionRepository = articleInteractionRepository;
        this.userFluxRepository = userFluxRepository;
    }

    private async assertUserCanAccessArticle(userId: string, id_article: string) {
        const article = await this.articleRepository.getById(id_article);
        if (!article) throw new HttpException(404, "Article introuvable");

        const subscribed = await this.userFluxRepository.exists(userId, article.flux_id);
        if (!subscribed) throw new HttpException(404, "Article introuvable");

        return article;
    }

    async getArticle(userId: string, id_article: string) {
        const article = await this.assertUserCanAccessArticle(userId, id_article);
        const interaction = await this.articleInteractionRepository.getByUserAndArticle(userId, id_article);

        return {
            ...article,
            note: interaction?.note ?? null,
            favori: interaction?.favori ?? false,
            lu: interaction?.lu ?? false,
        };
    }

    async setAnnotation(userId: string, id_article: string, input: AnnotationInput) {
        await this.assertUserCanAccessArticle(userId, id_article);
        return await this.articleInteractionRepository.upsertNote(userId, id_article, input.note);
    }

    async setFavori(userId: string, id_article: string, input: FavoriInput) {
        await this.assertUserCanAccessArticle(userId, id_article);
        return await this.articleInteractionRepository.upsertFavori(userId, id_article, input.favori);
    }

    async getFavoris(userId: string, query: ListFavorisQuery) {
        const skip = (query.page - 1) * query.limit;
        const { interactions, total } = await this.articleInteractionRepository.getFavoris(userId, {
            skip,
            take: query.limit,
        });

        return {
            articles: interactions.map((i) => ({ ...i.article, note: i.note, favori: i.favori, lu: i.lu })), // ← lu ajouté
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                totalPages: Math.max(Math.ceil(total / query.limit), 1),
            },
        };
    }

    async getAnnotes(userId: string, query: ListFavorisQuery) {
        const skip = (query.page - 1) * query.limit;
        const { interactions, total } = await this.articleInteractionRepository.getAnnotes(userId, {
            skip,
            take: query.limit,
        });

        return {
            articles: interactions.map((i) => ({ ...i.article, note: i.note, favori: i.favori, lu: i.lu })), // ← lu ajouté
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                totalPages: Math.max(Math.ceil(total / query.limit), 1),
            },
        };
    }

    async setLu(userId: string, id_article: string, input: LuInput) {
        await this.assertUserCanAccessArticle(userId, id_article);
        return await this.articleInteractionRepository.upsertLu(userId, id_article, input.lu);
    }

    async getNonLus(userId: string, query: ListFavorisQuery) {
        const fluxIds = await this.userFluxRepository.getSubscribedFluxIds(userId);
        const skip = (query.page - 1) * query.limit;
        const { articles, total } = await this.articleRepository.getNonLus(fluxIds, userId, {
            skip,
            take: query.limit,
        });

        return {
            articles,
            pagination: {
                total,
                page: query.page,
                limit: query.limit,
                totalPages: Math.max(Math.ceil(total / query.limit), 1),
            },
        };
    }
}