import { HttpException } from "../utils/HttpExceptions";
import ApiQuotaRepository from "../repositories/ApiQuotaRepository";

const { SERPAPI_KEY, SERPAPI_MONTHLY_QUOTA } = process.env as { [key: string]: string };
const SERPAPI_QUOTA_KEY = "serpapi_google_finance";

const apiQuotaRepository = new ApiQuotaRepository();

type SerpApiFinanceResponse = {
  summary?: {
    price?: number;
    currency?: string;
    price_movement?: { percentage?: number; movement?: "Up" | "Down" };
  };
};

export type SerpApiQuote = { prix: number; variationPct: number | null };

export class SerpApiFinanceService {
  async getQuote(ticker: string): Promise<SerpApiQuote | null> {
    const period = new Date().toISOString().slice(0, 7);
    const used = await apiQuotaRepository.getCount(SERPAPI_QUOTA_KEY, period);

    if (used >= Number(SERPAPI_MONTHLY_QUOTA)) {
      console.warn(`[serpapi]: quota mensuel atteint (${used}/${SERPAPI_MONTHLY_QUOTA}), "${ticker}" ignoré`);
      return null;
    }

    let res: Response;
    try {
      res = await fetch(
        `https://serpapi.com/search.json?engine=google_finance&q=${encodeURIComponent(ticker)}&api_key=${SERPAPI_KEY}`
      );
    } catch {
      throw new HttpException(502, "Impossible de contacter SerpApi");
    }
    if (!res.ok) throw new HttpException(502, `Erreur SerpApi (HTTP ${res.status})`);

    const data = (await res.json()) as SerpApiFinanceResponse;
    await apiQuotaRepository.increment(SERPAPI_QUOTA_KEY, period, 1);

    if (!data.summary?.price) return null;

    const mouvement = data.summary.price_movement;
    const variationPct = mouvement?.percentage
      ? mouvement.movement === "Down"
        ? -mouvement.percentage
        : mouvement.percentage
      : null;

    return { prix: data.summary.price, variationPct };
  }

  async getQuotes(tickers: string[]): Promise<Map<string, SerpApiQuote>> {
    const resultats = new Map<string, SerpApiQuote>();
    for (const ticker of tickers) {
      const quote = await this.getQuote(ticker);
      if (quote) resultats.set(ticker, quote);
    }
    return resultats;
  }
}