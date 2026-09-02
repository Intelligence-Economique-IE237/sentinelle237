import * as cheerio from "cheerio";
import { HttpException } from "../utils/HttpExceptions";
import { INDICES_BRVM } from "../config/indicesConstants";

const BRVM_URL = "https://www.brvm.org/fr/indices";

export class BrvmScraperService {
    async getIndices(): Promise<{ code: string; nom: string; valeur: number; variation: number | null }[]> {
        let res: Response;
        try {
            res = await fetch(BRVM_URL, {
                headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
            });
        } catch {
            throw new HttpException(502, "Impossible de contacter brvm.org");
        }
        if (!res.ok) throw new HttpException(502, `brvm.org a répondu HTTP ${res.status}`);

        const html = await res.text();
        const $ = cheerio.load(html);
        const resultats: { code: string; nom: string; valeur: number; variation: number | null }[] = [];

        $("table tr").each((_, row) => {
            const cellules = $(row).find("td");
            if (cellules.length < 3) return;

            const libelle = $(cellules[0]).text().trim().toUpperCase();
            const indiceConnu = INDICES_BRVM.find((i) => libelle === i.libelleSite.toUpperCase());
            if (!indiceConnu) return;

            const parseNombre = (texte: string) => parseFloat(texte.replace(/\s/g, "").replace(",", "."));

            const fermeture = parseNombre($(cellules[2]).text());
            const variationTexte = $(cellules[3]).text().trim();
            const variation = variationTexte ? parseNombre(variationTexte) : null;

            if (!isNaN(fermeture)) {
                resultats.push({ code: indiceConnu.code, nom: indiceConnu.nom, valeur: fermeture, variation });
            }
        });

        if (resultats.length === 0) {
            throw new HttpException(502, "Aucun indice BRVM trouvé — la structure du site a peut-être changé");
        }

        return resultats;
    }
}