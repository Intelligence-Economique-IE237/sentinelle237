import { AlerteSource, AlerteFrequence, AlerteLangue, AlerteNombreResultats, type Prisma } from "@prisma/client";
import AlerteRepository from "../repositories/AlerteRepository";
import AlerteResultatRepository from "../repositories/AlerteResultatRepository";
import ArticleRepository from "../repositories/ArticleRepository";
import UserFluxRepository from "../repositories/UserFluxRepository";
import ApiQuotaRepository from "../repositories/ApiQuotaRepository";
import { CurrentsApiService } from "./CurrentsApiService";
import { MailService } from "./MailService";
import { HttpException } from "../utils/HttpExceptions";
import type { CreateAlerteInput, UpdateAlerteInput, ListAlerteResultatsQuery } from "../validations/AlerteValidations";

const { MAX_ALERTES_ACTIVES_PAR_USER, CURRENTS_API_DAILY_QUOTA, ALERTE_TOP_RESULTS_COUNT } = process.env as {
  [key: string]: string;
};
const CURRENTS_QUOTA_KEY = "currents_api";

const alerteRepository = new AlerteRepository();
const alerteResultatRepository = new AlerteResultatRepository();
const articleRepository = new ArticleRepository();
const userFluxRepository = new UserFluxRepository();
const apiQuotaRepository = new ApiQuotaRepository();
const currentsApiService = new CurrentsApiService();
const mailService = new MailService();

function langueToApiParam(langue: AlerteLangue): string | undefined {
  return langue === AlerteLangue.toutes ? undefined : langue;
}

export default class AlerteService {
  private readonly alerteRepository: AlerteRepository;
  private readonly alerteResultatRepository: AlerteResultatRepository;
  private readonly articleRepository: ArticleRepository;
  private readonly userFluxRepository: UserFluxRepository;
  private readonly apiQuotaRepository: ApiQuotaRepository;
  private readonly currentsApiService: CurrentsApiService;
  private readonly mailService: MailService;

  constructor() {
    this.alerteRepository = alerteRepository;
    this.alerteResultatRepository = alerteResultatRepository;
    this.articleRepository = articleRepository;
    this.userFluxRepository = userFluxRepository;
    this.apiQuotaRepository = apiQuotaRepository;
    this.currentsApiService = currentsApiService;
    this.mailService = mailService;
  }

  async create(userId: string, userMail: string, input: CreateAlerteInput) {
    const activeCount = await this.alerteRepository.countActiveByUser(userId);
    if (activeCount >= Number(MAX_ALERTES_ACTIVES_PAR_USER)) {
      throw new HttpException(
        429,
        `Limite de ${MAX_ALERTES_ACTIVES_PAR_USER} alertes actives atteinte. Désactive ou supprime-en une pour en créer une nouvelle.`
      );
    }

    const alerte = await this.alerteRepository.create({
      mot_cle: input.mot_cle,
      frequence: input.frequence,
      langue: input.langue,
      pays: input.pays ?? null,
      nombre_resultats: input.nombre_resultats,
      envoye_a: userMail,
      user: { connect: { id_user: userId } },
    });

    await this.matchInternalArticles(alerte);

    return alerte;
  }

  async getAll(userId: string) {
    return await this.alerteRepository.getAllByUser(userId);
  }

  private async assertUserOwnsAlerte(userId: string, id_alerte: string) {
    const alerte = await this.alerteRepository.getById(id_alerte);
    if (!alerte || alerte.user_id !== userId) throw new HttpException(404, "Alerte introuvable");
    return alerte;
  }

  async getById(userId: string, id_alerte: string) {
    return await this.assertUserOwnsAlerte(userId, id_alerte);
  }

  async update(userId: string, id_alerte: string, input: UpdateAlerteInput) {
    await this.assertUserOwnsAlerte(userId, id_alerte);
    return await this.alerteRepository.update(id_alerte, input as Prisma.AlerteUpdateInput);
  }

  async delete(userId: string, id_alerte: string) {
    await this.assertUserOwnsAlerte(userId, id_alerte);
    await this.alerteRepository.delete(id_alerte);
  }

  async getResultats(userId: string, id_alerte: string, query: ListAlerteResultatsQuery) {
    await this.assertUserOwnsAlerte(userId, id_alerte);
    const skip = (query.page - 1) * query.limit;

    const where: Prisma.AlerteResultatWhereInput = {};
    if (query.source) where.source = query.source;
    if (typeof query.lu === "boolean") where.lu = query.lu;

    const { resultats, total } = await this.alerteResultatRepository.getByAlerteId(id_alerte, {
      skip,
      take: query.limit,
      where,
    });

    return {
      resultats,
      pagination: { total, page: query.page, limit: query.limit, totalPages: Math.max(Math.ceil(total / query.limit), 1) },
    };
  }

  async markResultatAsRead(userId: string, id_alerte: string, id_resultat: string) {
    await this.assertUserOwnsAlerte(userId, id_alerte);
    const resultat = await this.alerteResultatRepository.getById(id_resultat);
    if (!resultat || resultat.alerte_id !== id_alerte) throw new HttpException(404, "Résultat introuvable");
    return await this.alerteResultatRepository.markAsRead(id_resultat);
  }


  async matchInternalArticles(alerte: {
    id_alerte: string;
    user_id: string;
    mot_cle: string;
    frequence: AlerteFrequence;
    nombre_resultats: AlerteNombreResultats;
    envoye_a: string;
  }) {
    const subscribedFluxIds = await this.userFluxRepository.getSubscribedFluxIds(alerte.user_id);
    if (subscribedFluxIds.length === 0) return;

    const articles = await this.articleRepository.searchByKeywordInFlux(subscribedFluxIds, alerte.mot_cle);

    const data: Prisma.AlerteResultatCreateManyInput[] = articles.map((a) => ({
      alerte_id: alerte.id_alerte,
      source: AlerteSource.flux,
      titre: a.titre,
      lien: a.lien,
      description: a.description,
      image: a.image,
      date_publication: a.date_publication,
    }));

    await this.alerteResultatRepository.createMany(data);

    if (alerte.frequence === AlerteFrequence.immediat) {
      await this.dispatchDigest(alerte);
    }
  }

  async matchWebResults(alerte: {
    id_alerte: string;
    mot_cle: string;
    langue: AlerteLangue;
    pays: string | null;
    frequence: AlerteFrequence;
    nombre_resultats: AlerteNombreResultats;
    envoye_a: string;
  }) {
    const results = await this.currentsApiService.search(alerte.mot_cle, {
      language: langueToApiParam(alerte.langue),
      country: alerte.pays ?? undefined,
    });

    const data: Prisma.AlerteResultatCreateManyInput[] = results
      .filter((r) => !!r.url)
      .map((r) => ({
        alerte_id: alerte.id_alerte,
        source: AlerteSource.web,
        titre: r.title ?? "Sans titre",
        lien: r.url as string,
        description: r.description ?? null,
        image: r.image ?? null,
        date_publication: r.published ? new Date(r.published) : null,
      }));

    await this.alerteResultatRepository.createMany(data);
    await this.alerteRepository.update(alerte.id_alerte, { derniere_recherche_web: new Date() });

    if (alerte.frequence === AlerteFrequence.immediat) {
      await this.dispatchDigest(alerte);
    }
  }

  async dispatchDigest(alerte: {
    id_alerte: string;
    mot_cle: string;
    nombre_resultats: AlerteNombreResultats;
    envoye_a: string;
  }) {
    const limit =
      alerte.nombre_resultats === AlerteNombreResultats.meilleurs ? Number(ALERTE_TOP_RESULTS_COUNT) : undefined;

    const unsent = await this.alerteResultatRepository.getUnsent(alerte.id_alerte, limit);
    if (unsent.length === 0) return;

    await this.mailService.sendAlerteDigest(
      alerte.envoye_a,
      alerte.mot_cle,
      unsent.map((r) => ({ titre: r.titre, lien: r.lien }))
    );

    await this.alerteResultatRepository.markManyAsSent(unsent.map((r) => r.id_resultat));
    await this.alerteRepository.update(alerte.id_alerte, { dernier_envoi: new Date() });
  }



  async runInternalMatchForAllActive() {
    const alertes = await this.alerteRepository.getAllActive();
    let matched = 0;
    for (const alerte of alertes) {
      try {
        await this.matchInternalArticles(alerte);
        matched++;
      } catch (err) {
        console.error(`[alerte-internal-match]: échec pour "${alerte.mot_cle}":`, err);
      }
    }
    return { total: alertes.length, matched };
  }

  async runWebSearchBatch() {
    const period = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const used = await this.apiQuotaRepository.getCount(CURRENTS_QUOTA_KEY, period);
    const remaining = Number(CURRENTS_API_DAILY_QUOTA) - used;

    if (remaining <= 0) {
      return { total: 0, searched: 0, quotaExhausted: true };
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const dueAlertes = await this.alerteRepository.getDueForWebSearch(cutoff, remaining);

    let searched = 0;
    for (const alerte of dueAlertes) {
      try {
        await this.matchWebResults(alerte);
        await this.apiQuotaRepository.increment(CURRENTS_QUOTA_KEY, period, 1); // period ajouté ici
        searched++;
      } catch (err) {
        console.error(`[alerte-web-search]: échec pour "${alerte.mot_cle}":`, err);
      }
    }

    return { total: dueAlertes.length, searched, quotaExhausted: false };
  }
  async runDigestBatch(frequence: AlerteFrequence, intervalMs: number) {
    const cutoff = new Date(Date.now() - intervalMs);
    const dueAlertes = await this.alerteRepository.getDueForDigest(frequence, cutoff);

    let sent = 0;
    for (const alerte of dueAlertes) {
      try {
        await this.dispatchDigest(alerte);
        sent++;
      } catch (err) {
        console.error(`[alerte-digest-${frequence}]: échec pour "${alerte.mot_cle}":`, err);
      }
    }
    return { total: dueAlertes.length, sent };
  }
}