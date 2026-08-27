import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";
import { db } from "../config/db";
import { HttpException } from "../utils/HttpExceptions";

const OUTPUT_DIR = "./generated/revues";

export class RevueDePresseService {
    async uploadTemplate(userId: string, nom: string, cheminFichier: string) {
        return await db.modelePdf.create({
            data: { user: { connect: { id_user: userId } }, nom, chemin_fichier: cheminFichier },
        });
    }

    async getMesTemplates(userId: string) {
        return await db.modelePdf.findMany({ where: { user_id: userId } });
    }

    private async assertOwnsTemplate(userId: string, id_modele: string) {
        const modele = await db.modelePdf.findUnique({ where: { id_modele } });
        if (!modele || modele.user_id !== userId) throw new HttpException(404, "Modèle PDF introuvable");
        return modele;
    }

    async genererRevue(userId: string, params: { modele_id: string; titre: string; dossier_id?: string; flux_ids?: string[] }) {
        const modele = await this.assertOwnsTemplate(userId, params.modele_id);

        let fluxIds = params.flux_ids ?? [];
        if (params.dossier_id) {
            const dossierFlux = await db.dossierFlux.findMany({ where: { dossier_id: params.dossier_id } });
            fluxIds = dossierFlux.map((d) => d.flux_id);
        }

        const articles = await db.article.findMany({
            where: { flux_id: { in: fluxIds } },
            orderBy: { date_publication: "desc" },
            take: 50,
        });

        const templateBytes = await fs.readFile(modele.chemin_fichier);
        const pdfDoc = await PDFDocument.load(templateBytes);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        const articlesParPage = 8;
        for (let i = 0; i < articles.length; i += articlesParPage) {
            const lot = articles.slice(i, i + articlesParPage);
            const page = pdfDoc.addPage([595, 842]); // A4
            let y = 800;

            if (i === 0) {
                page.drawText(params.titre, { x: 50, y, size: 20, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
                y -= 40;
            }

            for (const article of lot) {
                if (y < 80) break;

                page.drawText(article.titre.slice(0, 90), { x: 50, y, size: 12, font: fontBold });
                y -= 16;

                const resume = (article.resume ?? article.description ?? "").slice(0, 150);
                page.drawText(resume, { x: 50, y, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
                y -= 14;

                if (article.categorie) {
                    page.drawText(`[${article.categorie}]`, { x: 50, y, size: 9, font, color: rgb(0.5, 0.5, 0.5) });
                    y -= 12;
                }

                page.drawText(article.lien.slice(0, 90), { x: 50, y, size: 8, font, color: rgb(0.4, 0.4, 0.8) });
                y -= 24;
            }
        }

        const pdfBytes = await pdfDoc.save();

        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        const nomFichier = `revue_${Date.now()}.pdf`;
        const cheminSortie = path.join(OUTPUT_DIR, nomFichier);
        await fs.writeFile(cheminSortie, pdfBytes);

        return await db.revueDePresse.create({
            data: {
                user: { connect: { id_user: userId } },
                modele: { connect: { id_modele: modele.id_modele } },
                dossier_id: params.dossier_id ?? null,
                titre: params.titre,
                chemin_fichier: cheminSortie,
            },
        });
    }

    async getRevue(userId: string, id_revue: string) {
        const revue = await db.revueDePresse.findUnique({ where: { id_revue } });
        if (!revue || revue.user_id !== userId) throw new HttpException(404, "Revue introuvable");
        return revue;
    }
}