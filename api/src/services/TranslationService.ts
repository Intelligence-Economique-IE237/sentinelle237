import { HttpException } from "../utils/HttpExceptions";
import ApiQuotaRepository from "../repositories/ApiQuotaRepository";

const { LIBRETRANSLATE_URL, LIBRETRANSLATE_DAILY_CHAR_QUOTA, LIBRETRANSLATE_API_KEY, LIBRETRANSLATE_TIMEOUT_MS } =
    process.env as { [key: string]: string };
const LIBRETRANSLATE_QUOTA_KEY = "libretranslate";

const apiQuotaRepository = new ApiQuotaRepository();

type LibreTranslateResponse = {
    translatedText?: string;
    error?: string;
};

export class TranslationService {
    async translate(texte: string, langueSource: string, langueCible: string): Promise<string> {
        if (langueSource === langueCible || !texte.trim()) return texte;
        if (!LIBRETRANSLATE_URL) {
            throw new HttpException(502, "Service de traduction non configuré (LIBRETRANSLATE_URL manquant)");
        }

        const period = new Date().toISOString().slice(0, 10);
        const used = await apiQuotaRepository.getCount(LIBRETRANSLATE_QUOTA_KEY, period);

        if (used + texte.length > Number(LIBRETRANSLATE_DAILY_CHAR_QUOTA)) {
            throw new HttpException(429, "Quota de traduction quotidien épuisé, réessaie demain");
        }

        let res: Response;
        try {
            res = await fetch(`${LIBRETRANSLATE_URL.replace(/\/+$/, "")}/translate`, {
                method: "POST",
                signal: AbortSignal.timeout(Number(LIBRETRANSLATE_TIMEOUT_MS) || 10000),
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    q: texte,
                    source: langueSource,
                    target: langueCible,
                    format: "text",
                    ...(LIBRETRANSLATE_API_KEY ? { api_key: LIBRETRANSLATE_API_KEY } : {}),
                }),
            });
        } catch (err) {
            console.error("[libretranslate]: appel impossible:", err instanceof Error ? err.message : err);
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