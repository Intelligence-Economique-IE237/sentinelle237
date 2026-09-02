import { HttpException } from "../utils/HttpExceptions";

const { TWELVEDATA_API_KEY } = process.env as { [key: string]: string };

export type QuoteResult = { symbol: string; close: number; percent_change?: string };
type TwelveDataQuoteEntry = {
    code?: string;
    close?: string;
    percent_change?: string;
};

type TwelveDataResponse = TwelveDataQuoteEntry | Record<string, TwelveDataQuoteEntry>;

export class TwelveDataService {
    async getQuotes(symbols: string[]): Promise<Map<string, QuoteResult>> {
        const url = `https://api.twelvedata.com/quote?symbol=${symbols.join(",")}&apikey=${TWELVEDATA_API_KEY}`;
        let res: Response;
        try {
            res = await fetch(url);
        } catch {
            throw new HttpException(502, "Impossible de contacter Twelve Data");
        }
        if (!res.ok) throw new HttpException(502, `Erreur Twelve Data (HTTP ${res.status})`);

        const data = (await res.json()) as TwelveDataResponse; // ← cast ajouté
        const resultats = new Map<string, QuoteResult>();
        const entries: Record<string, TwelveDataQuoteEntry> =
            symbols.length === 1 ? { [symbols[0]]: data as TwelveDataQuoteEntry } : (data as Record<string, TwelveDataQuoteEntry>);

        for (const symbol of symbols) {
            const entry = entries[symbol];
            if (entry && !entry.code && entry.close) {
                resultats.set(symbol, { symbol, close: parseFloat(entry.close), percent_change: entry.percent_change });
            } else {
                console.warn(`[twelvedata]: symbole "${symbol}" indisponible sur le plan gratuit ou invalide — ignoré`);
            }
        }
        return resultats;
    }
}