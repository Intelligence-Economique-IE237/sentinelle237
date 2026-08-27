import { FluxType, type Prisma } from "@prisma/client";
import FluxRepository from "../repositories/FluxRepository";
import ArticleRepository from "../repositories/ArticleRepository";
import UserFluxRepository from "../repositories/UserFluxRepository";
import CategorieFluxRepository from "../repositories/CategorieFluxRepository";
import FluxEpingleRepository from "../repositories/FluxEpingleRepository";
import { FeedParserService, type ParsedFeed } from "./FeedParserService";
import { TelegramService } from "./TelegramService";
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
} from "../validations/FluxValidations";

const { FLUX_REFRESH_COOLDOWN_MINUTES } = process.env as { [key: string]: string };

const fluxRepository = new FluxRepository();
const articleRepository = new ArticleRepository();
const userFluxRepository = new UserFluxRepository();
const categorieFluxRepository = new CategorieFluxRepository();
const feedParserService = new FeedParserService();
const telegramService = new TelegramService();
const fluxEpingleRepository = new FluxEpingleRepository();

type CrawlData = {
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

  constructor() {
    this.fluxRepository = fluxRepository;
    this.articleRepository = articleRepository;
    this.userFluxRepository = userFluxRepository;
    this.categorieFluxRepository = categorieFluxRepository;
    this.feedParserService = feedParserService;
    this.telegramService = telegramService;
    this.fluxEpingleRepository = fluxEpingleRepository;
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
        const feedUrl = await this.feedParserService.discoverFeedUrl(this.normalizeUrl(input.identifiant));
        const parsed = await this.feedParserService.parseFeed(feedUrl);
        return {
          lien_rss: feedUrl,
          nom: parsed.title,
          url_site: parsed.link ?? null,
          logo: parsed.image?.url ?? null,
          items: parsed.items,
        };
      }

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

  private async saveArticles(flux_id: string, items: ParsedFeed["items"]) {
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

    if (data.length > 0) {
      await this.articleRepository.createMany(data);

      // Classification + résumé en tâche de fond — n'échoue jamais bruyamment le crawl
      this.classifierArticlesEnArrierePlan(flux_id, data).catch((err) =>
          console.error("[classification]: erreur non bloquante:", err)
      );
    }
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
      type: input.type,
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

    for (const flux of dueFlux) {
      try {
        const items = await this.crawlExistingFlux(flux);
        await this.saveArticles(flux.id_flux, items);
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

    return result;
  }

  async unsubscribe(userId: string, id_flux: string) {
    await this.assertUserOwnsFlux(userId, id_flux);
    const flux = await this.fluxRepository.getById(id_flux);
    await this.userFluxRepository.unsubscribe(userId, id_flux);

    if (flux && !flux.is_suggestion) {
      const remaining = await this.userFluxRepository.countSubscribers(id_flux);
      if (remaining === 0) {
        await this.fluxRepository.delete(id_flux);
      }
    }
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

  async setEpingle(userId: string, id_flux: string, epingle: boolean) {
    await this.assertUserOwnsFlux(userId, id_flux); // ne peut épingler qu'un flux qu'on suit déjà
    if (epingle) {
      await this.fluxEpingleRepository.pin(userId, id_flux);
    } else {
      await this.fluxEpingleRepository.unpin(userId, id_flux);
    }
  }
}