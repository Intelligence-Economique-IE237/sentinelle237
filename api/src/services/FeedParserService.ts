import Parser from "rss-parser";
import { HttpException } from "../utils/HttpExceptions";
import { DIRECT_RSS_MAPPING } from "../config/directRssMapping";

const parser = new Parser();

export type ParsedFeed = {
  title?: string;
  link?: string;
  image?: { url?: string };
  items: {
    title?: string;
    link?: string;
    contentSnippet?: string;
    content?: string;
    isoDate?: string;
    pubDate?: string;
    creator?: string;
    enclosure?: { url?: string };
  }[];
};

const BROWSER_HEADERS = {
  "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
    url: string,
    timeoutMs = 15000,
    extraHeaders?: Record<string, string>
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { ...BROWSER_HEADERS, ...extraHeaders },
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export class FeedParserService {
  private readonly nitterInstances: string[];
  private readonly youtubeApiKey: string | undefined;

  constructor() {
    this.nitterInstances = [process.env.NITTER_INSTANCE, "https://xcancel.com"].filter(Boolean) as string[];
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;
  }

  // ── Validation permissive avant le parsing strict rss-parser ──
  // Accepte tout ce qui RESSEMBLE à un flux (marqueurs textuels) avant de tenter le parsing
  // strict — évite de rejeter des flux réels mais légèrement mal formés.
  private ressembleAUnFlux(contentType: string, body: string): boolean {
    const ctOk = /xml|rss|atom/i.test(contentType);
    const bodyOk = /<rss|<feed|<channel/i.test(body.slice(0, 2000));
    return ctOk || bodyOk;
  }

  async parseFeed(feedUrl: string): Promise<ParsedFeed> {
    try {
      const isFeed = this.looksLikeFeedUrl(feedUrl);
      const extraHeaders: Record<string, string> = isFeed
          ? { Accept: "application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8" }
          : {};

      const res = await fetchWithTimeout(feedUrl, 15000, extraHeaders);
      if (res.status === 403 || res.status === 429) {
        throw new HttpException(
            422,
            "Ce site bloque les requêtes automatisées. Essaie de coller directement l'URL du flux RSS."
        );
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const xml = await res.text();
      const contentType = res.headers.get("content-type") ?? "";

      if (!this.ressembleAUnFlux(contentType, xml)) {
        throw new Error("Le contenu ne ressemble pas à un flux RSS/Atom");
      }

      return (await parser.parseString(xml)) as ParsedFeed;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(422, this.explainFailure(err));
    }
  }

  // Expose la résolution de hostname pour que FluxService puisse suggérer categorie/zone
  // depuis DIRECT_RSS_MAPPING au moment de la création d'un flux.
  extraireHostname(url: string): string | null {
    try {
      const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
      return new URL(normalized).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  async discoverFeedUrl(pageUrl: string): Promise<string> {
    // ── Dictionnaire de correspondances directes, consulté en tout premier ──
    // Zéro requête de découverte pour ces domaines connus et déjà validés.
    const hostname = this.extraireHostname(pageUrl);
    if (hostname && DIRECT_RSS_MAPPING[hostname]) {
      const urlDirecte = DIRECT_RSS_MAPPING[hostname].lien_rss;
      try {
        await this.parseFeed(urlDirecte);
        return urlDirecte;
      } catch {
        console.warn(`[feed-parser]: mapping direct cassé pour ${hostname}, bascule sur la découverte normale`);
      }
    }

    // Un échec ici n'est JAMAIS fatal — retombe toujours vers le HTML/chemins communs
    // au lieu d'arrêter tout le processus de découverte.
    if (this.looksLikeFeedUrl(pageUrl)) {
      try {
        await this.parseFeed(pageUrl);
        return pageUrl;
      } catch {
        console.warn(`[feed-parser]: échec sur l'URL fournie directement (${pageUrl}), tentative de repli...`);
      }
    } else {
      try {
        await this.parseFeed(pageUrl);
        return pageUrl; // l'identifiant n'avait pas l'air d'un flux mais en était bien un
      } catch {
        /* pas un flux direct, continue normalement */
      }
    }

    let html: string | null = null;
    try {
      const res = await fetchWithTimeout(pageUrl);
      if (res.ok) html = await res.text();
    } catch {
      /* HTML inaccessible, on retombe quand même sur les chemins communs ci-dessous */
    }

    if (html) {
      const feedUrl = this.extractFeedUrlFromHtml(html, pageUrl);
      if (feedUrl) {
        try {
          await this.parseFeed(feedUrl);
          return feedUrl;
        } catch {
          /* lien découvert mort, continue vers les chemins communs */
        }
      }
    }

    return await this.tryCommonFeedPaths(pageUrl);
  }

  async resolveTwitterFeedUrl(username: string): Promise<string> {
    const clean = username.replace(/^@/, "").replace(/\/$/, "");

    for (const instance of this.nitterInstances) {
      const url = `${instance}/${clean}/rss`;
      try {
        await this.parseFeed(url);
        return url;
      } catch {
        continue;
      }
    }

    throw new HttpException(422, "Aucune instance Nitter disponible pour ce compte Twitter/X. Réessaie plus tard.");
  }

  async resolveYoutubeFeedUrl(channelUrl: string): Promise<string> {
    const normalized = channelUrl.replace(/\/$/, "");

    const directMatch = normalized.match(/\/channel\/(UC[\w-]+)/);
    if (directMatch) {
      return `https://www.youtube.com/feeds/videos.xml?channel_id=${directMatch[1]}`;
    }

    const handleMatch = normalized.match(/\/@([\w-]+)/);
    if (handleMatch) {
      const handle = handleMatch[1];

      if (this.youtubeApiKey) {
        const channelId = await this.resolveHandleViaApi(handle, this.youtubeApiKey);
        if (channelId) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      }

      const channelId = await this.resolveHandleViaOembed(handle);
      if (channelId) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

      const channelIdHtml = await this.resolveHandleViaHtml(handle);
      if (channelIdHtml) return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelIdHtml}`;

      throw new HttpException(
          422,
          `Impossible de résoudre le handle @${handle}. ` +
          `Collez directement l'URL du flux RSS (ex: https://www.youtube.com/feeds/videos.xml?channel_id=UC...) ` +
          `ou configurez YOUTUBE_API_KEY dans votre .env pour activer la résolution automatique.`
      );
    }

    const legacyMatch = normalized.match(/\/(?:user|c)\/([\w-]+)/);
    if (legacyMatch) {
      return `https://www.youtube.com/feeds/videos.xml?user=${legacyMatch[1]}`;
    }

    throw new HttpException(
        422,
        "URL YouTube non reconnue. Utilisez /channel/UC..., /@handle, /user/... ou collez directement l'URL du flux RSS."
    );
  }

  private async resolveHandleViaApi(handle: string, apiKey: string): Promise<string | null> {
    try {
      const res = await fetchWithTimeout(
          `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${apiKey}`,
          10000
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { items?: { id: string }[] };
      return data.items?.[0]?.id || null;
    } catch {
      return null;
    }
  }

  private async resolveHandleViaOembed(handle: string): Promise<string | null> {
    try {
      const res = await fetchWithTimeout(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/@${handle}`)}&format=json`,
          10000
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { author_url?: string };
      const match = data.author_url?.match(/\/channel\/(UC[\w-]+)/);
      return match?.[1] || null;
    } catch {
      return null;
    }
  }

  private async resolveHandleViaHtml(handle: string): Promise<string | null> {
    try {
      const extraHeaders: Record<string, string> = {
        Cookie: "CONSENT=YES+cb.20210328-17-p0.en+FX+{}",
      };
      const res = await fetchWithTimeout(`https://www.youtube.com/@${handle}`, 15000, extraHeaders);
      if (!res.ok) return null;
      const html = await res.text();
      const m =
          html.match(/"channelId":"(UC[\w-]+)"/) ||
          html.match(/<meta itemprop="channelId" content="(UC[\w-]+)">/);
      return m?.[1] || null;
    } catch {
      return null;
    }
  }

  private looksLikeFeedUrl(url: string): boolean {
    const lower = url.toLowerCase();
    const feedExts = [".xml", ".rss", ".atom", ".rdf", ".json"];
    const feedPaths = ["/rss", "/feed", "/atom", "/feeds/", "/index.xml", "/index.rss"];
    return feedExts.some((e) => lower.endsWith(e)) || feedPaths.some((p) => lower.includes(p));
  }

  private async tryCommonFeedPaths(baseUrl: string): Promise<string> {
    const parsed = new URL(/^https?:\/\//i.test(baseUrl) ? baseUrl : `https://${baseUrl}`);
    const origin = parsed.origin;
    const langMatch = parsed.pathname.match(/^\/(fr|en|es|ar|de|it)\//);
    const langPrefix = langMatch ? `/${langMatch[1]}` : "";

    const candidates = [
      `${langPrefix}/rss`,
      `${langPrefix}/feed`,
      `${langPrefix}/feed.xml`,
      `${langPrefix}/rss.xml`,
      "/rss",
      "/feed",
      "/feed.xml",
      "/rss.xml",
      "/index.xml",
      "/atom.xml",
      "/feeds/posts/default",
      "/?feed=rss2",
    ].map((path) => new URL(path, origin).toString());

    const CONCURRENCE = 2;
    for (let i = 0; i < candidates.length; i += CONCURRENCE) {
      const lot = candidates.slice(i, i + CONCURRENCE);
      const resultats = await Promise.all(
          lot.map(async (candidate) => {
            try {
              await this.parseFeed(candidate);
              return candidate;
            } catch {
              return null;
            }
          })
      );

      const trouve = resultats.find((r) => r !== null);
      if (trouve) return trouve;

      if (i + CONCURRENCE < candidates.length) await sleep(200);
    }

    throw new HttpException(
        422,
        "Aucun flux RSS détecté sur ce site. Essaie de coller directement l'URL du flux (/rss, /feed, /feed.xml...)."
    );
  }

  private extractFeedUrlFromHtml(html: string, baseUrl: string): string | null {
    const patterns = [
      /<link[^>]+type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/rss\+xml["']/i,
      /<link[^>]+type=["']application\/atom\+xml["'][^>]*href=["']([^"']+)["']/i,
      /<link[^>]+href=["']([^"']+)["'][^>]*type=["']application\/atom\+xml["']/i,
    ];

    for (const regex of patterns) {
      const match = html.match(regex);
      if (match) {
        const discovered = match[1];
        return discovered.startsWith("http") ? discovered : new URL(discovered, baseUrl).toString();
      }
    }
    return null;
  }

  private explainFailure(err: unknown): string {
    const msg = err instanceof Error ? err.message : "";
    if (/403|forbidden/i.test(msg)) {
      return "Ce site bloque les requêtes automatisées. Essaie de coller directement l'URL du flux RSS.";
    }
    if (/timeout|abort|etimedout|econnrefused/i.test(msg)) {
      return "Le site est inaccessible (timeout). Vérifie que le domaine est joignable depuis ton serveur.";
    }
    return "Impossible de lire ce flux RSS (format invalide ou inaccessible)";
  }
}