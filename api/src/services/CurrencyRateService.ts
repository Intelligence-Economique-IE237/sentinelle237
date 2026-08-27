import { HttpException } from "../utils/HttpExceptions";
import { XAF_PEG_RATE } from "../config/dashboardConstants";

type FrankfurterResponse = {
    amount?: number;
    base?: string;
    date?: string;
    rates?: Record<string, number>;
};

export class CurrencyRateService {
    async getEcbRates(base: string, symbols: string[]): Promise<Record<string, number>> {
        const url = `https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols.join(",")}`;
        let res: Response;
        try {
            res = await fetch(url);
        } catch {
            throw new HttpException(502, "Impossible de contacter Frankfurter API");
        }
        if (!res.ok) throw new HttpException(502, `Erreur Frankfurter API (HTTP ${res.status})`);

        const data = (await res.json()) as FrankfurterResponse;
        return data.rates ?? {};
    }

    // XAF n'est pas suivi par Frankfurter (parité fixe, pas un taux de marché) : calculé via la parité EUR/XAF
    private async getRateToXaf(base: string): Promise<number> {
        if (base === "EUR") return XAF_PEG_RATE;
        const rates = await this.getEcbRates("EUR", [base]);
        const eurToBase = rates[base];
        if (!eurToBase) throw new HttpException(502, `Taux EUR/${base} indisponible via Frankfurter`);
        return XAF_PEG_RATE / eurToBase;
    }

    // Calcule le taux pour n'importe quelle paire "FROM/TO", y compris via XAF (parité fixe) ou une devise pivot EUR
    async getPairRate(from: string, to: string): Promise<number> {
        if (from === to) return 1;

        if (to === "XAF") return await this.getRateToXaf(from);
        if (from === "XAF") {
            const toXaf = await this.getRateToXaf(to);
            return 1 / toXaf;
        }

        const rates = await this.getEcbRates("EUR", [from, to]);
        const eurToFrom = from === "EUR" ? 1 : rates[from];
        const eurToTo = to === "EUR" ? 1 : rates[to];
        if (!eurToFrom || !eurToTo) throw new HttpException(502, `Taux ${from}/${to} indisponible via Frankfurter`);

        return eurToTo / eurToFrom;
    }
}