import { HttpException } from "../utils/HttpExceptions";

const { CURRENTS_API_KEY } = process.env as { [key: string]: string };

export type CurrentsArticle = {
  title?: string;
  url?: string;
  description?: string;
  image?: string;
  published?: string;
};

type CurrentsSearchResponse = {
  status?: string;
  news?: CurrentsArticle[];
};

// Liste fermée des codes pays acceptés par Currents API (plan gratuit).
const SUPPORTED_COUNTRIES = new Set([
  "US", "TW", "DE", "GB", "CN", "IN", "ES", "IT", "PL", "AU", "MY", "SG", "CA", "KR", "DK",
  "FR", "BE", "JP", "AT", "PT", "PH", "HK", "AR", "VE", "BR", "FI", "ID", "VN", "MX", "GR",
  "NL", "NO", "NZ", "RU", "SA", "CH", "TH", "AE", "IE", "IR", "IQ", "RO", "AF", "ZW", "MM",
  "SE", "PE", "PA", "EG", "TR", "IL", "CZ", "BD", "NG", "KE", "CL", "UY", "EC", "RS", "HU",
  "SI", "GH", "BO", "PK", "CO", "NK", "PY", "PS", "EE", "LB", "QA", "KW", "KH", "NP", "LU",
  "EU", "ASIA", "INT", "BA",
]);

export class CurrentsApiService {
  async search(keyword: string, options?: { language?: string; country?: string }): Promise<CurrentsArticle[]> {
    const params = new URLSearchParams({ keywords: keyword, apiKey: CURRENTS_API_KEY });
    if (options?.language) params.set("language", options.language);

    if (options?.country) {
      if (SUPPORTED_COUNTRIES.has(options.country)) {
        params.set("country", options.country);
      } else {
        console.log(
          `[currents-api]: code pays "${options.country}" non supporté par Currents (couverture limitée à ~90 pays) — recherche effectuée sans filtre pays`
        );
      }
    }

    const url = `https://api.currentsapi.services/v1/search?${params.toString()}`;

    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      throw new HttpException(502, "Impossible de contacter l'API de recherche web (Currents API)");
    }

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "(corps de réponse illisible)");
      throw new HttpException(502, `Erreur de l'API de recherche web (HTTP ${res.status}): ${errorBody}`);
    }

    const data = (await res.json()) as CurrentsSearchResponse;
    return data?.news ?? [];
  }
}