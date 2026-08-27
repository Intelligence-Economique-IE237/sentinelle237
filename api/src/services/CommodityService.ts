import { HttpException } from "../utils/HttpExceptions";

const GOLD_API_BASE = "https://api.gold-api.com";

export type MetalPrice = {
    symbol: string;
    price: number;
    currency: string;
    updatedAt: string;
};

type GoldApiResponse = {
    symbol: string;
    price: number;
    currency: string;
    updatedAt: string;
};

type OilPriceApiResponse = {
    status: string;
    data: { price: number; currency: string; code: string };
};

export class CommodityService {
    async getMetalPrice(symbol: string, currency = "USD"): Promise<MetalPrice> {
        let res: Response;
        try {
            res = await fetch(`${GOLD_API_BASE}/price/${symbol}/${currency}`);
        } catch {
            throw new HttpException(502, "Impossible de contacter Gold API");
        }
        if (!res.ok) throw new HttpException(502, `Erreur Gold API (HTTP ${res.status}) pour ${symbol}`);

        const data = (await res.json()) as GoldApiResponse;
        return { symbol: data.symbol, price: data.price, currency: data.currency, updatedAt: data.updatedAt };
    }

    async getOilPrice(code: string): Promise<{ price: number; currency: string }> {
        const { OILPRICEAPI_TOKEN } = process.env as { [key: string]: string };

        let res: Response;
        try {
            res = await fetch(`https://api.oilpriceapi.com/v1/prices/latest?by_code=${code}`, {
                headers: { Authorization: `Token ${OILPRICEAPI_TOKEN}` },
            });
        } catch {
            throw new HttpException(502, "Impossible de contacter Oil Price API");
        }
        if (!res.ok) {
            const errorBody = await res.text().catch(() => "");
            throw new HttpException(502, `Erreur Oil Price API (HTTP ${res.status}): ${errorBody}`);
        }

        const data = (await res.json()) as OilPriceApiResponse;
        return { price: data.data.price, currency: data.data.currency };
    }
}