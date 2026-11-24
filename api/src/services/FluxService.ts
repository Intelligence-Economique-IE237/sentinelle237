import { FluxType, type Prisma } from "@prisma/client";
import FluxRepository from "../repositories/FluxRepository";
import ArticleRepository from "../repositories/ArticleRepository";
import UserFluxRepository from "../repositories/UserFluxRepository";
import CategorieFluxRepository from "../repositories/CategorieFluxRepository";
import FluxEpingleRepository from "../repositories/FluxEpingleRepository";
import ArticleInteractionRepository from "../repositories/ArticleInteractionRepository";
import { FeedParserService, type ParsedFeed } from "./FeedParserService";
import { TelegramService } from "./TelegramService";
import { WebPageFeedService } from "./WebPageFeedService";
import { mlInferenceService } from "./MLInferenceService";
import { genererResumeExtractif } from "../utils/resume";
import { extractText, safeDate } from "../utils/sanitize";
import { HttpException } from "../utils/HttpExceptions";
import type {
  CreateFluxInput,
  ListArticlesQuery,
  ListFluxQuery,
  ListSuggestionsQuery,
  ListMyFluxQuery,
  UpdateFluxByAdminInput,
} from "../validations/FluxValidations";
import NotificationService from "./NotificationService";

const { FLUX_REFRESH_COOLDOWN_MINUTES } = process.env as { [key: string]: string };

const fluxRepository = new FluxRepository();
const articleRepository = new ArticleRepository();
const userFluxRepository = new UserFluxRepository();
const categorieFluxRepository = new CategorieFluxRepository();
const feedParserService = new FeedParserService();
const telegramService = new TelegramService();
const webPageFeedService = new WebPageFeedService();
const fluxEpingleRepository = new FluxEpingleRepository();
const articleInteractionRepository = new ArticleInteractionRepository();
const notificationService = new NotificationService();

type CrawlData = {
  /** Type réellement retenu (un site « RSS » sans flux devient un flux « web ») */
  type?: FluxType;
  lien_rss: string;
  nom?: string;
  url_site?: string | null;
  logo?: string | null;
  items: ParsedFeed["items"];
};

export default class FluxService {
  private readonly fluxRepository: FluxRepository;
  private readonly articleRepository: ArticleRepository;
  private readonly userFluxRepository: UserFluxRepository;
  private readonly categorieFluxRepository: CategorieFluxRepository;
  private readonly feedParserService: FeedParserService;
  private readonly telegramService: TelegramService;
  private readonly fluxEpingleRepository: FluxEpingleRepository;
  private readonly articleInteractionRepository: ArticleInteractionRepository;

  constructor() {
    this.fluxRepository = fluxRepository;
    this.articleRepository = articleRepository;
    this.userFluxRepository = userFluxRepository;
    this.categorieFluxRepository = categorieFluxRepository;
    this.feedParserService = feedParserService;
    this.telegramService = telegramService;
    this.fluxEpingleRepository = fluxEpingleRepository;
    this.articleInteractionRepository = articleInteractionRepository;
  }

  private normalizeUrl(input: string): string {
    return /^https?:\/\//i.test(input) ? input : `https://${input}`;
  }

  private mapTelegramPosts(posts: Awaited<ReturnType<TelegramService["fetchChannelPosts"]>>["posts"]) {
    return posts.map((p) => ({
      title: p.text ? p.text.slice(0, 80) : "Publication Telegram",
      link: p.link,
      contentSnippet: p.text,
      isoDate: p.date,
      enclosure: p.image ? { url: p.image } : undefined,
    }));
  }

  private async crawlByType(input: CreateFluxInput): Promise<CrawlData> {
    switch (input.type) {
      case FluxType.rss: {
        const url = this.normalizeUrl(input.identifiant);
        let feedUrl: string;
        try {
          feedUrl = await this.feedParserService.discoverFeedUrl(url);
        } catch (rssError) {
          // Pas de flux RSS (cas fréquent des sites gouvernementaux) : on suit la page elle-même
          try {
            return await this.crawlWebPage(url);
          } catch (webError) {
            console.warn(`[flux]: ni RSS ni articles lisibles pour ${url}:`, webError instanceof Error ? webError.message : webError);
            throw rssError instanceof HttpException && webError instanceof HttpException
              ? new HttpException(422, `Aucun flux RSS sur ce site, et la page n'a pas pu être lue : ${webError.message}`)
              : rssError;
          }
        }
        const parsed = await this.feedParserService.parseFeed(feedUrl);
        return {
          lien_rss: feedUrl,
          nom: parsed.title,
          url_site: parsed.link ?? null,
          logo: parsed.image?.url ?? null,
          items: parsed.items,
        };
      }

      case FluxType.web:
        return await this.crawlWebPage(this.normalizeUrl(input.identifiant));

      case FluxType.youtube: {
        const feedUrl = await this.feedParserService.resolveYoutubeFeedUrl(this.normalizeUrl(input.identifiant));
        const parsed = await this.feedParserService.parseFeed(feedUrl);
        return {
          lien_rss: feedUrl,
          nom: parsed.title,
          url_site: parsed.link ?? null,
          logo: parsed.image?.url ?? null,
          items: parsed.items,
        };
      }

      case FluxType.x: {
        const feedUrl = await this.feedParserService.resolveTwitterFeedUrl(input.identifiant);
        const parsed = await this.feedParserService.parseFeed(feedUrl);
        return {
          lien_rss: feedUrl,
          nom: parsed.title,
          url_site: parsed.link ?? null,
          logo: parsed.image?.url ?? null,
          items: parsed.items,
        };
      }

      case FluxType.telegram: {
        const result = await this.telegramService.fetchChannelPosts(input.identifiant);
        return {
          lien_rss: `telegram://${result.channelLink.replace("https://t.me/", "")}`,
          nom: result.channelName,
          url_site: result.channelLink,
          logo: null,
          items: this.mapTelegramPosts(result.posts),
        };
      }

      default:
        throw new HttpException(400, "Type de flux non supporté");
    }
  }

  private async crawlWebPage(url: string): Promise<CrawlData> {
    const page = await webPageFeedService.parsePage(url);
    return {
      type: FluxType.web,
      lien_rss: page.finalUrl,
      nom: page.title,
      url_site: page.link ?? null,
      logo: page.image?.url ?? null,
      items: page.items,
    };
  }

  private async saveArticles(flux_id: string, items: ParsedFeed["items"]): Promise<number> {
    const data: Prisma.ArticleCreateManyInput[] = items
        .filter((item) => !!item.link)
        .map((item) => ({
          flux_id,
          titre: extractText(item.title as unknown) ?? "Sans titre",
          lien: item.link as string,
          description: extractText(item.contentSnippet as unknown) ?? extractText(item.content as unknown) ?? null,
          image: item.enclosure?.url ?? null,
          auteur: extractText(item.creator as unknown) ?? null,
          date_publication: safeDate(item.isoDate) ?? safeDate(item.pubDate),
        }));

    if (data.length === 0) return 0;

    // count = articles réellement nouveaux (les doublons sont ignorés)
    const { count } = await this.articleRepository.createMany(data);

    this.classifierArticlesEnArrierePlan(flux_id, data).catch((err) =>
        console.error("[classification]: erreur non bloquante:", err)
    );
    return count;
  }

  private async classifierArticlesEnArrierePlan(flux_id: string, articlesData: Prisma.ArticleCreateManyInput[]) {
    if (!mlInferenceService.isReady()) return;

    const articlesCreated = await this.articleRepository.getByLiens(
        flux_id,
        articlesData.map((a) => a.lien)
    );

    for (const article of articlesCreated) {
      const texte = `${article.titre} ${article.description ?? ""}`.trim();
      const resultat = await mlInferenceService.classify(texte);
      const resume = genererResumeExtractif(article.description, article.titre);

      await this.articleRepository.updateCategorieEtResume(article.id_article, {
        categorie: resultat?.categorie ?? null,
        resume,
      });
    }
  }

  private async crawlExistingFlux(flux: { type: FluxType; lien_rss: string }): Promise<ParsedFeed["items"]> {
    if (flux.type === FluxType.telegram) {
      const username = flux.lien_rss.replace("telegram://", "");
      const result = await this.telegramService.fetchChannelPosts(username);
      return this.mapTelegramPosts(result.posts);
    }
    if (flux.type === FluxType.x) {
      const match = flux.lien_rss.match(/\/([^/]+)\/rss$/);
      const username = match?.[1];
      if (!username) {
        throw new HttpException(502, "Impossible d'extraire le nom d'utilisateur X depuis l'URL stockée");
      }
      const feedUrl = await this.feedParserService.resolveTwitterFeedUrl(username);
      const parsed = await this.feedParserService.parseFeed(feedUrl);
      return parsed.items;
    }
    if (flux.type === FluxType.web) {
      const page = await webPageFeedService.parsePage(flux.lien_rss);
      // Article sans date sur le site : on retient le moment où Sentinelle l'a vu apparaître
      const now = new Date().toISOString();
      return page.items.map((item) => (item.isoDate ? item : { ...item, isoDate: now }));
    }
    const parsed = await this.feedParserService.parseFeed(flux.lien_rss);
    return parsed.items;
  }

  private async resolveCategorieId(code: string | undefined): Promise<string | null> {
    if (!code) return null;
    const categorie = await this.categorieFluxRepository.getByCode(code);
    if (!categorie) throw new HttpException(400, `Catégorie "${code}" inconnue`);
    return categorie.id_categorie;
  }

  async create(input: CreateFluxInput, userId: string) {
    const crawlData = await this.crawlByType(input);
    const categorieId = await this.resolveCategorieId(input.categorie);
    const existing = await this.fluxRepository.getByLienRss(crawlData.lien_rss);

    if (existing) {
      const alreadySubscribed = await this.userFluxRepository.exists(userId, existing.id_flux);
      if (alreadySubscribed) throw new HttpException(409, "Vous suivez déjà ce flux");

      await this.userFluxRepository.subscribe(userId, existing.id_flux);
      const { articles, total } = await this.articleRepository.getByFluxId(existing.id_flux);
      return { flux: existing, articles, total, alreadyExisted: true };
    }

    const flux = await this.fluxRepository.create({
      nom: input.nom || crawlData.nom || input.identifiant,
      url_site: crawlData.url_site ?? null,
      lien_rss: crawlData.lien_rss,
      logo: crawlData.logo ?? null,
      type: crawlData.type ?? input.type,
      categorie: categorieId ? { connect: { id_categorie: categorieId } } : undefined,
      last_crawled_at: new Date(),
      createdByUser: { connect: { id_user: userId } },
    });

    await this.saveArticles(flux.id_flux, crawlData.items);
    await this.userFluxRepository.subscribe(userId, flux.id_flux);

    const { articles, total } = await this.articleRepository.getByFluxId(flux.id_flux);
    return { flux, articles, total, alreadyExisted: false };
  }

  async getMyFlux(userId: string, query: ListMyFluxQuery) {
    const skip = (query.page - 1) * query.limit;
    const fluxWhere: Prisma.FluxWhereInput = {};
    if (query.zone) fluxWhere.zone = query.zone;
    if (query.type) fluxWhere.type = query.type;
    if (query.categorie) {
      const categorieId = await this.resolveCategorieId(query.categorie);
      fluxWhere.categorie_id = categorieId ?? "__aucune__";
    }

    const [{ flux, total }, pinnedIds] = await Promise.all([
      this.userFluxRepository.getUserFlux({ user_id: userId, skip, take: query.limit, fluxWhere }),
      this.fluxEpingleRepository.getPinnedFluxIds(userId),
    ]);
    const pinnedSet = new Set(pinnedIds);

    return {
      flux: flux.map((f: (typeof flux)[number]) => ({ ...f, isEpingle: pinnedSet.has(f.id_flux) })),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(Math.ceil(total / query.limit), 1),
      },
    };
  }

  private async assertUserOwnsFlux(userId: string, id_flux: string) {
    const subscribed = await this.userFluxRepository.exists(userId, id_flux);
    if (!subscribed) throw new HttpException(404, "Flux introuvable");
  }

  async getById(userId: string, id_flux: string) {
    await this.assertUserOwnsFlux(userId, id_flux);
    const flux = await this.fluxRepository.getById(id_flux);
    if (!flux) throw new HttpException(404, "Flux introuvable");
    return flux;
  }

  async getArticles(userId: string, id_flux: string, query: ListArticlesQuery) {
    await this.assertUserOwnsFlux(userId, id_flux);
    const skip = (query.page - 1) * query.limit;
    const { articles, total } = await this.articleRepository.getByFluxId(id_flux, { skip, take: query.limit });

    
    const interactions = await this.articleInteractionRepository.getManyByUserAndArticles(
        userId,
        articles.map((a) => a.id_article)
    );
    const interactionByArticle = new Map(interactions.map((i) => [i.article_id, i]));

    const articlesEnrichis = articles.map((a) => {
      const interaction = interactionByArticle.get(a.id_article);
      return {
        ...a,
        lu: interaction?.lu ?? false,
        favori: interaction?.favori ?? false,
        note: interaction?.note ?? null,
      };
    });

    return {
      articles: articlesEnrichis,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(Math.ceil(total / query.limit), 1),
      },
    };
  }

  async refresh(userId: string, id_flux: string) {
    await this.assertUserOwnsFlux(userId, id_flux);
    const flux = await this.fluxRepository.getById(id_flux);
    if (!flux) throw new HttpException(404, "Flux introuvable");

    const cooldownMs = Number(FLUX_REFRESH_COOLDOWN_MINUTES) * 60 * 1000;
    if (flux.last_crawled_at && Date.now() - flux.last_crawled_at.getTime() < cooldownMs) {
      throw new HttpException(
          429,
          `Ce flux a déjà été actualisé récemment, réessayez dans ${FLUX_REFRESH_COOLDOWN_MINUTES} minutes`
      );
    }

    const items = await this.crawlExistingFlux(flux);
    await this.saveArticles(flux.id_flux, items);
    await this.fluxRepository.update(flux.id_flux, { last_crawled_at: new Date() });

    const { articles, total } = await this.articleRepository.getByFluxId(flux.id_flux);
    return { articles, total };
  }

  async refreshDueFlux() {
    const cooldownMs = Number(FLUX_REFRESH_COOLDOWN_MINUTES) * 60 * 1000;
    const cutoff = new Date(Date.now() - cooldownMs);
    const dueFlux = await this.fluxRepository.getDueForRefresh(cutoff);

    const result = {
      total: dueFlux.length,
      refreshed: 0,
      failed: [] as { id_flux: string; nom: string; error: string }[],
    };

    const nouveauxParFlux = new Map<string, number>();

    for (const flux of dueFlux) {
      try {
        const items = await this.crawlExistingFlux(flux);
        const nouveaux = await this.saveArticles(flux.id_flux, items);
        // Première collecte d'un flux : tout l'historique arrive d'un coup, on ne notifie pas
        if (nouveaux > 0 && flux.last_crawled_at) nouveauxParFlux.set(flux.id_flux, nouveaux);
        await this.fluxRepository.update(flux.id_flux, { last_crawled_at: new Date() });
        result.refreshed++;
      } catch (err) {
        result.failed.push({
          id_flux: flux.id_flux,
          nom: flux.nom,
          error: err instanceof Error ? err.message : "erreur inconnue",
        });
      }
    }

    // Une notification par dossier d'enquête concerné, en fin de tournée
    await notificationService.dossiersNouveauxArticles(nouveauxParFlux);

    return result;
  }

  async unsubscribe(userId: string, id_flux: string) {
    await this.assertUserOwnsFlux(userId, id_flux);
    await this.userFluxRepository.unsubscribe(userId, id_flux);
    // Le flux n'est plus supprimé quand son dernier abonné part : tous les flux
    // enregistrés font partie du catalogue de suggestions.
  }

  async getSuggestions(userId: string, query: ListSuggestionsQuery) {
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.FluxWhereInput = {};
    if (query.zone) where.zone = query.zone;
    if (query.categorie) {
      const categorieId = await this.resolveCategorieId(query.categorie);
      where.categorie_id = categorieId ?? "__aucune__";
    }

    const [{ flux, total }, subscribedIds] = await Promise.all([
      this.fluxRepository.getSuggestions({ skip, take: query.limit, where }),
      this.userFluxRepository.getSubscribedFluxIds(userId),
    ]);
    const subscribedSet = new Set(subscribedIds);

    return {
      flux: flux.map((f) => ({ ...f, isSubscribed: subscribedSet.has(f.id_flux) })),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(Math.ceil(total / query.limit), 1),
      },
    };
  }

  async quickSubscribe(userId: string, id_flux: string) {
    const flux = await this.fluxRepository.getById(id_flux);
    if (!flux) throw new HttpException(404, "Flux introuvable");

    const alreadySubscribed = await this.userFluxRepository.exists(userId, id_flux);
    if (alreadySubscribed) throw new HttpException(409, "Vous suivez déjà ce flux");

    await this.userFluxRepository.subscribe(userId, id_flux);
    const { articles, total } = await this.articleRepository.getByFluxId(id_flux);
    return { flux, articles, total };
  }

  async getAllForAdmin(query: ListFluxQuery) {
    const skip = (query.page - 1) * query.limit;
    const where: Prisma.FluxWhereInput = {};
    if (query.type) where.type = query.type;
    if (query.categorie) {
      const categorieId = await this.resolveCategorieId(query.categorie);
      where.categorie_id = categorieId ?? "__aucune__";
    }

    const { flux, total } = await this.fluxRepository.getAll({ skip, take: query.limit, where });
    return {
      flux,
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.max(Math.ceil(total / query.limit), 1),
      },
    };
  }

  async updateByAdmin(id_flux: string, data: UpdateFluxByAdminInput) {
    const flux = await this.fluxRepository.getById(id_flux);
    if (!flux) throw new HttpException(404, "Flux introuvable");

    const update: Prisma.FluxUpdateInput = {};
    if (data.zone !== undefined) update.zone = data.zone;
    if (data.categorie_id === null) {
      update.categorie = { disconnect: true };
    } else if (data.categorie_id !== undefined) {
      const categorie = await this.categorieFluxRepository.getById(data.categorie_id);
      if (!categorie) throw new HttpException(400, "Catégorie introuvable");
      update.categorie = { connect: { id_categorie: categorie.id_categorie } };
    }
    return await this.fluxRepository.update(id_flux, update);
  }

  async setEpingle(userId: string, id_flux: string, epingle: boolean) {
    await this.assertUserOwnsFlux(userId, id_flux); // ne peut épingler qu'un flux qu'on suit déjà
    if (epingle) {
      await this.fluxEpingleRepository.pin(userId, id_flux);
    } else {
      await this.fluxEpingleRepository.unpin(userId, id_flux);
    }
  }
}