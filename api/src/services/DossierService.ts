import DossierRepository from "../repositories/DossierRepository";
import AlerteRepository from "../repositories/AlerteRepository";
import UserFluxRepository from "../repositories/UserFluxRepository";
import { db } from "../config/db";
import { HttpException } from "../utils/HttpExceptions";
import type { CreateDossierInput, UpdateDossierInput, TimelineQuery } from "../validations/DossierValidations";

const dossierRepository = new DossierRepository();
const alerteRepository = new AlerteRepository();
const userFluxRepository = new UserFluxRepository();

type TimelineEntry = {
    type: "alerte" | "flux";
    id: string;
    titre: string;
    lien: string;
    description: string | null;
    image: string | null;
    date: Date;
    sourceId: string; // alerte_id ou flux_id, pour le calcul du signal
    sourceLabel: string; // mot-clé de l'alerte, ou nom du flux
};

export default class DossierService {
    private readonly dossierRepository: DossierRepository;
    private readonly alerteRepository: AlerteRepository;
    private readonly userFluxRepository: UserFluxRepository;

    constructor() {
        this.dossierRepository = dossierRepository;
        this.alerteRepository = alerteRepository;
        this.userFluxRepository = userFluxRepository;
    }

    async create(userId: string, input: CreateDossierInput) {
        return await this.dossierRepository.create({
            nom: input.nom,
            description: input.description ?? null,
            user: { connect: { id_user: userId } },
        });
    }

    async getAll(userId: string) {
        return await this.dossierRepository.getAllByUser(userId);
    }

    private async assertOwnership(userId: string, id_dossier: string) {
        const dossier = await this.dossierRepository.getById(id_dossier);
        if (!dossier || dossier.user_id !== userId) throw new HttpException(404, "Dossier introuvable");
        return dossier;
    }

    async getById(userId: string, id_dossier: string) {
        return await this.assertOwnership(userId, id_dossier);
    }

    async update(userId: string, id_dossier: string, input: UpdateDossierInput) {
        await this.assertOwnership(userId, id_dossier);
        return await this.dossierRepository.update(id_dossier, input);
    }

    async delete(userId: string, id_dossier: string) {
        await this.assertOwnership(userId, id_dossier);
        await this.dossierRepository.delete(id_dossier);
    }

    async linkAlerte(userId: string, id_dossier: string, alerte_id: string) {
        await this.assertOwnership(userId, id_dossier);

        // On ne peut lier que ses PROPRES alertes — même logique d'isolation que partout ailleurs
        const alerte = await this.alerteRepository.getById(alerte_id);
        if (!alerte || alerte.user_id !== userId) throw new HttpException(404, "Alerte introuvable");

        try {
            await this.dossierRepository.linkAlerte(id_dossier, alerte_id);
        } catch {
            throw new HttpException(409, "Cette alerte est déjà liée à ce dossier");
        }
    }

    async unlinkAlerte(userId: string, id_dossier: string, alerte_id: string) {
        await this.assertOwnership(userId, id_dossier);
        await this.dossierRepository.unlinkAlerte(id_dossier, alerte_id);
    }

    async linkFlux(userId: string, id_dossier: string, flux_id: string) {
        await this.assertOwnership(userId, id_dossier);

        // On ne peut lier qu'un flux qu'on suit soi-même — même logique d'isolation que le module Flux
        const subscribed = await this.userFluxRepository.exists(userId, flux_id);
        if (!subscribed) throw new HttpException(404, "Flux introuvable");

        try {
            await this.dossierRepository.linkFlux(id_dossier, flux_id);
        } catch {
            throw new HttpException(409, "Ce flux est déjà lié à ce dossier");
        }
    }

    async unlinkFlux(userId: string, id_dossier: string, flux_id: string) {
        await this.assertOwnership(userId, id_dossier);
        await this.dossierRepository.unlinkFlux(id_dossier, flux_id);
    }

    async getTimeline(userId: string, id_dossier: string, query: TimelineQuery) {
        const dossier = await this.assertOwnership(userId, id_dossier);

        const alerteIds = dossier.alertes.map((a) => a.alerte_id);
        const fluxIds = dossier.flux.map((f) => f.flux_id);

        const [alerteResultats, articles] = await Promise.all([
            alerteIds.length > 0
                ? db.alerteResultat.findMany({
                    where: { alerte_id: { in: alerteIds } },
                    include: { alerte: { select: { mot_cle: true } } },
                })
                : [],
            fluxIds.length > 0
                ? db.article.findMany({
                    where: { flux_id: { in: fluxIds } },
                    include: { flux: { select: { nom: true } } },
                })
                : [],
        ]);

        const combined: TimelineEntry[] = [
            ...alerteResultats.map((r) => ({
                type: "alerte" as const,
                id: r.id_resultat,
                titre: r.titre,
                lien: r.lien,
                description: r.description,
                image: r.image,
                date: r.date_publication ?? r.createdAt,
                sourceId: r.alerte_id,
                sourceLabel: r.alerte.mot_cle,
            })),
            ...articles.map((a) => ({
                type: "flux" as const,
                id: a.id_article,
                titre: a.titre,
                lien: a.lien,
                description: a.description,
                image: a.image,
                date: a.date_publication ?? a.createdAt,
                sourceId: a.flux_id,
                sourceLabel: a.flux.nom,
            })),
        ];

        const sourcesParLien = new Map<string, Set<string>>();
        for (const item of combined) {
            const key = `${item.type}:${item.sourceId}`;
            if (!sourcesParLien.has(item.lien)) sourcesParLien.set(item.lien, new Set());
            sourcesParLien.get(item.lien)!.add(key);
        }

        const enrichi = combined
            .map((item) => ({
                ...item,
                signalFort: (sourcesParLien.get(item.lien)?.size ?? 1) >= 2,
            }))
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        const skip = (query.page - 1) * query.limit;
        const paginated = enrichi.slice(skip, skip + query.limit);

        return {
            timeline: paginated,
            pagination: {
                total: enrichi.length,
                page: query.page,
                limit: query.limit,
                totalPages: Math.max(Math.ceil(enrichi.length / query.limit), 1),
            },
        };
    }
}