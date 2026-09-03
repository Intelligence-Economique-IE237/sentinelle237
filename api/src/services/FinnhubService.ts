import { HttpException } from "../utils/HttpExceptions";

const { FINNHUB_API_KEY } = process.env as { [key: string]: string };

type FinnhubQuoteResponse = {
  c: number;
  dp: number | null;
};

export type FinnhubQuote = { symbol: string; close: number; percentChange: number | null };

export class FinnhubService {
  async getQuote(symbol: string): Promise<FinnhubQuote | null> {
    let res: Response;
    try {
      res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`);
    } catch {
      throw new HttpException(502, "Impossible de contacter Finnhub");
    }
    if (!res.ok) throw new HttpException(502, `Erreur Finnhub (HTTP ${res.status})`);

    const data = (await res.json()) as FinnhubQuoteResponse;
    if (!data.c || data.c === 0) return null;

    return { symbol, close: data.c, percentChange: data.dp ?? null };
  }

  async getQuotes(symbols: string[]): Promise<Map<string, FinnhubQuote>> {
    const resultats = new Map<string, FinnhubQuote>();
    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol);
      if (quote) resultats.set(symbol, quote);
    }
    return resultats;
  }
}