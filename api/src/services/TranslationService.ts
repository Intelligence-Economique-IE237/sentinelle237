import { HttpException } from "../utils/HttpExceptions";
import ApiQuotaRepository from "../repositories/ApiQuotaRepository";

const { LIBRETRANSLATE_URL, LIBRETRANSLATE_DAILY_CHAR_QUOTA } = process.env as { [key: string]: string };
const LIBRETRANSLATE_QUOTA_KEY = "libretranslate";

const apiQuotaRepository = new ApiQuotaRepository();

type LibreTranslateResponse = {
    translatedText?: string;
    error?: string;
};

export class TranslationService {
    async translate(texte: string, langueSource: string, langueCible: string): Promise<string> {
        const period = new Date().toISOString().slice(0, 10);
        const used = await apiQuotaRepository.getCount(LIBRETRANSLATE_QUOTA_KEY, period);

        if (used + texte.length > Number(LIBRETRANSLATE_DAILY_CHAR_QUOTA)) {
            throw new HttpException(429, "Quota de traduction quotidien épuisé, réessaie demain");
        }

        let res: Response;
        try {
            res = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    q: texte,
                    source: langueSource,
                    target: langueCible,
                    format: "text",
                }),
            });
        } catch {
            throw new HttpException(502, "Impossible de contacter le service de traduction (LibreTranslate)");
        }

        if (!res.ok) {
            const errorBody = await res.text().catch(() => "");
            throw new HttpException(502, `Erreur du service de traduction (HTTP ${res.status}): ${errorBody}`);
        }

        const data = (await res.json()) as LibreTranslateResponse;
        if (!data.translatedText) throw new HttpException(502, data.error ?? "Traduction indisponible");

        await apiQuotaRepository.increment(LIBRETRANSLATE_QUOTA_KEY, period, texte.length);
        return data.translatedText;
    }
}