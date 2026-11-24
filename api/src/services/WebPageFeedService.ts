import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";
import http from "node:http";
import https from "node:https";
import zlib from "node:zlib";
import { HttpException } from "../utils/HttpExceptions";
import type { ParsedFeed } from "./FeedParserService";

/**
 * « Flux » pour les sites sans RSS (sites gouvernementaux, ministères…) :
 * on lit la page d'actualités / de communiqués et on en extrait les articles
 * par analyse de la structure HTML (blocs répétés contenant un lien et un titre).
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const MAX_ITEMS = 40;
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 20000;
const MIN_TITLE = 18;

/** Liens de navigation à ignorer (menus, pages institutionnelles fixes…) */
const NAV_TEXT =
  /^(accueil|home|contact(ez[- ]nous)?|mentions l[ée]gales|plan du site|connexion|login|s'inscrire|inscription|recherche|search|lire la suite|en savoir plus|voir plus|read more|suivant|pr[ée]c[ée]dent|next|previous|retour|fran[çc]ais|english|faq|cookies?|newsletter|partager|imprimer|top)$/i;
const NAV_HREF =
  /\/(tag|tags|category|categorie|categories|author|auteur|page|login|user|wp-login|search|recherche|contact|feed|rss)(\/|$|\?)|[?&](page|lang)=|^(mailto|tel|javascript):/i;
/** Classes d'état ou d'alternance (« views-row-odd », « is-active »…) : ignorées pour reconnaître les blocs répétés */
const STATE_CLASS = /^(is-|has-|clearfix$)|(^|[-_])(odd|even|first|last|active|current|selected|alt)$/;
const SOCIAL = /(facebook|twitter|x\.com|linkedin|youtube|instagram|whatsapp|t\.me|tiktok)\./i;

const MOIS: Record<string, number> = {
  janvier: 0, janv: 0, january: 0, jan: 0,
  fevrier: 1, fevr: 1, fev: 1, february: 1, feb: 1,
  mars: 2, march: 2, mar: 2,
  avril: 3, avr: 3, april: 3, apr: 3,
  mai: 4, may: 4,
  juin: 5, june: 5, jun: 5,
  juillet: 6, juil: 6, july: 6, jul: 6,
  aout: 7, august: 7, aug: 7,
  septembre: 8, sept: 8, september: 8, sep: 8,
  octobre: 9, oct: 9, october: 9,
  novembre: 10, nov: 10, november: 10,
  decembre: 11, dec: 11, december: 11,
};

export type WebPageFeed = ParsedFeed & { finalUrl: string; insecureTls: boolean };

type FetchResult = { body: string; finalUrl: string; status: number; contentType: string };

function stripAccents(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Refuse les adresses internes (protection basique contre les requêtes vers le réseau du serveur). */
function assertPublicUrl(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new HttpException(400, "Adresse invalide : http(s) uniquement");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host === "::1" ||
    /^f[cd][0-9a-f]{2}:/.test(host);
  if (privateHost && process.env.WEB_FEED_ALLOW_PRIVATE !== "true") {
    throw new HttpException(400, "Adresse interne non autorisée");
  }
}

/** Date en français/anglais/numérique trouvée dans un texte, ou null. */
export function parseDateFr(raw: string): Date | null {
  const s = stripAccents(raw.toLowerCase());
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[t ](\d{2}):(\d{2}))?/);
  if (m) return build(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 12, m[5] ? +m[5] : 0);
  m = s.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})\b/);
  if (m) {
    const y = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    return build(y, +m[2] - 1, +m[1]);
  }
  m = s.match(/\b(\d{1,2})(?:er)?\s+([a-z]{3,9})\.?,?\s+(\d{4})\b/);
  if (m && MOIS[m[2]] !== undefined) return build(+m[3], MOIS[m[2]], +m[1]);
  m = s.match(/\b([a-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m && MOIS[m[1]] !== undefined) return build(+m[3], MOIS[m[1]], +m[2]);
  return null;
}

function build(y: number, mo: number, d: number, h = 12, mi = 0): Date | null {
  if (y < 1990 || mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, mo, d, h, mi));
  // Une date dans le futur (au-delà de 2 jours) est probablement autre chose (événement, échéance)
  if (date.getTime() > Date.now() + 2 * 86400000) return null;
  return date;
}

export class WebPageFeedService {
  /** Récupère la page. Les sites publics ont souvent un certificat expiré : on réessaie alors sans vérification TLS. */
  private async fetchPage(pageUrl: string): Promise<FetchResult & { insecureTls: boolean }> {
    try {
      return { ...(await this.request(pageUrl, true)), insecureTls: false };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code ?? "";
      const tlsError =
        /CERT|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS|DEPTH_ZERO|UNABLE_TO_GET_ISSUER|HOSTNAME_MISMATCH|ERR_SSL/i.test(code);
      if (tlsError) {
        console.warn(`[web-feed]: certificat TLS invalide pour ${new URL(pageUrl).hostname} (${code}), lecture sans vérification`);
        return { ...(await this.request(pageUrl, false)), insecureTls: true };
      }
      // Site uniquement en http
      if (pageUrl.startsWith("https://") && /ECONNREFUSED|ECONNRESET|EPROTO/i.test(code)) {
        return { ...(await this.request(pageUrl.replace(/^https:/, "http:"), true)), insecureTls: false };
      }
      throw err;
    }
  }

  private request(url: string, verifyTls: boolean, redirects = 0): Promise<FetchResult> {
    const parsed = new URL(url);
    assertPublicUrl(parsed);
    const lib = parsed.protocol === "http:" ? http : https;
    return new Promise((resolve, reject) => {
      const req = lib.get(
        parsed,
        {
          headers: {
            "User-Agent": USER_AGENT,
            Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
          },
          timeout: TIMEOUT_MS,
          ...(parsed.protocol === "https:" ? { rejectUnauthorized: verifyTls } : {}),
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && res.headers.location) {
            res.resume();
            if (redirects >= 5) return reject(new HttpException(422, "Trop de redirections"));
            const next = new URL(res.headers.location, parsed).toString();
            return resolve(this.request(next, verifyTls, redirects + 1));
          }
          let stream: NodeJS.ReadableStream = res;
          const enc = String(res.headers["content-encoding"] ?? "");
          if (enc.includes("br")) stream = res.pipe(zlib.createBrotliDecompress());
          else if (enc.includes("gzip")) stream = res.pipe(zlib.createGunzip());
          else if (enc.includes("deflate")) stream = res.pipe(zlib.createInflate());
          const chunks: Buffer[] = [];
          let size = 0;
          stream.on("data", (c: Buffer) => {
            size += c.length;
            if (size > MAX_BYTES) {
              req.destroy();
              reject(new HttpException(422, "Page trop volumineuse"));
            } else chunks.push(c);
          });
          stream.on("end", () => {
            const buf = Buffer.concat(chunks);
            const contentType = String(res.headers["content-type"] ?? "");
            const charset = /charset=([\w-]+)/i.exec(contentType)?.[1]?.toLowerCase();
            let body = buf.toString("utf8");
            const metaCharset = /<meta[^>]+charset=["']?([\w-]+)/i.exec(body.slice(0, 3000))?.[1]?.toLowerCase();
            if ((charset ?? metaCharset)?.match(/iso-8859-1|latin1|windows-1252/)) body = buf.toString("latin1");
            resolve({ body, finalUrl: url, status, contentType });
          });
          stream.on("error", reject);
        }
      );
      req.on("timeout", () => req.destroy(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })));
      req.on("error", reject);
    });
  }

  async parsePage(pageUrl: string): Promise<WebPageFeed> {
    let page: FetchResult & { insecureTls: boolean };
    try {
      page = await this.fetchPage(pageUrl);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      const code = (err as NodeJS.ErrnoException)?.code ?? (err as Error)?.message;
      throw new HttpException(422, `Site inaccessible (${code}). Vérifie l'adresse ou réessaie plus tard.`);
    }
    if (page.status === 403 || page.status === 429) {
      throw new HttpException(422, "Ce site bloque les lectures automatiques.");
    }
    if (page.status >= 400) throw new HttpException(422, `Le site a répondu HTTP ${page.status}`);
    if (!/html|xml|^$/i.test(page.contentType)) {
      throw new HttpException(422, "Cette adresse n'est pas une page web");
    }
    const feed = this.extract(page.body, page.finalUrl);
    return { ...feed, finalUrl: page.finalUrl, insecureTls: page.insecureTls };
  }

  /** Analyse du HTML : exposée séparément pour les tests. */
  extract(html: string, pageUrl: string): ParsedFeed {
    const $ = cheerio.load(html);
    const base = new URL($("base[href]").attr("href") ?? pageUrl, pageUrl);
    const origin = new URL(pageUrl);

    const siteName =
      clean($('meta[property="og:site_name"]').attr("content") ?? "") ||
      clean($("title").first().text()).split(/\s[|–—-]\s/)[0] ||
      origin.hostname;
    const iconHref =
      $('link[rel="apple-touch-icon"]').attr("href") ??
      $('link[rel~="icon"]').attr("href") ??
      $('meta[property="og:image"]').attr("content");
    const logo = iconHref ? this.abs(iconHref, base) : null;

    const fromJsonLd = this.fromJsonLd($, base);

    // On retire tout ce qui n'est pas du contenu
    $(
      "script,style,noscript,template,svg,iframe,form,nav,aside,[role=navigation],[role=banner],[role=contentinfo]," +
        "[class*=breadcrumb],[class*=pagination],[class*=pager],[id*=menu],[class*=navbar],[class*=share],[class*=social]," +
        "[class*=cookie],[class*=sidebar],[id*=sidebar],[class*=widget]"
    ).remove();
    // En-têtes / pieds / menus de la page — mais pas l'en-tête d'un article (« entry-header », « card-header »…)
    $("header,footer,[class*=header],[id*=header],[class*=footer],[id*=footer],[class*=menu]").each((_, el) => {
      const $el = $(el);
      if ($el.closest("article,li,[class*=post],[class*=item],[class*=card],[class*=entry],[class*=views-row],[class*=news]").length === 0) {
        $el.remove();
      }
    });

    const items = fromJsonLd.length >= 3 ? fromJsonLd : this.fromRepeatedBlocks($, base, origin);
    if (items.length === 0) {
      throw new HttpException(
        422,
        "Aucun article détecté sur cette page. Indique plutôt l'adresse de la page « Actualités » ou « Communiqués » du site."
      );
    }
    return { title: siteName, link: origin.origin, image: logo ? { url: logo } : undefined, items: items.slice(0, MAX_ITEMS) };
  }

  private abs(href: string, base: URL): string | null {
    try {
      const u = new URL(href.trim(), base);
      if (!/^https?:$/.test(u.protocol)) return null;
      u.hash = "";
      return u.toString();
    } catch {
      return null;
    }
  }

  private fromJsonLd($: cheerio.CheerioAPI, base: URL): ParsedFeed["items"] {
    const out: ParsedFeed["items"] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).text());
        const nodes: unknown[] = Array.isArray(data) ? data : data["@graph"] ?? [data];
        const visit = (n: unknown) => {
          if (!n || typeof n !== "object") return;
          const o = n as Record<string, unknown>;
          const type = String(o["@type"] ?? "");
          if (type === "ItemList" && Array.isArray(o.itemListElement)) {
            (o.itemListElement as unknown[]).forEach((li) => visit((li as Record<string, unknown>)?.item ?? li));
          } else if (/Article|NewsArticle|BlogPosting|Report/.test(type) && o.headline && o.url) {
            const link = this.abs(String(o.url), base);
            if (!link) return;
            const img = o.image as unknown;
            const imgUrl = typeof img === "string" ? img : Array.isArray(img) ? img[0] : (img as Record<string, unknown>)?.url;
            out.push({
              title: clean(String(o.headline)),
              link,
              contentSnippet: o.description ? clean(String(o.description)).slice(0, 400) : undefined,
              isoDate: o.datePublished ? new Date(String(o.datePublished)).toISOString() : undefined,
              enclosure: imgUrl ? { url: this.abs(String(imgUrl), base) ?? undefined } : undefined,
            });
          }
        };
        nodes.forEach(visit);
      } catch {
        /* JSON-LD invalide : ignoré */
      }
    });
    return this.dedupe(out);
  }

  /**
   * Cœur de l'heuristique : chaque lien « article » (texte assez long, même site,
   * pas un lien de navigation) est rattaché au bloc qui le contient et qui se
   * répète chez ses frères (même balise + mêmes classes). Le groupe de blocs
   * répétés le plus riche est la liste d'articles de la page.
   */
  private fromRepeatedBlocks($: cheerio.CheerioAPI, base: URL, origin: URL): ParsedFeed["items"] {
    const sameSite = (u: string) => {
      const h = new URL(u).hostname.replace(/^www\./, "");
      const o = origin.hostname.replace(/^www\./, "");
      return h === o || h.endsWith(`.${o}`) || o.endsWith(`.${h}`);
    };
    const signature = (el: Element) =>
      `${el.tagName}.${(el.attribs.class ?? "").split(/\s+/).filter((c) => c && !STATE_CLASS.test(c) && !/\d/.test(c)).sort().join(".")}`;

    type Candidate = { a: Element; block: Element; groupKey: string; viaHeading: boolean };
    const candidates: Candidate[] = [];
    const parentIds = new Map<AnyNode, number>();
    const idOf = (n: AnyNode) => {
      if (!parentIds.has(n)) parentIds.set(n, parentIds.size);
      return parentIds.get(n)!;
    };

    $("a[href]").each((_, a) => {
      const href = $(a).attr("href") ?? "";
      const link = this.abs(href, base);
      if (!link || NAV_HREF.test(href) || SOCIAL.test(link) || !sameSite(link)) return;
      if (link.replace(/\/$/, "") === origin.toString().replace(/\/$/, "")) return;
      const text = this.titleFor($, a);
      if (text.length < MIN_TITLE || NAV_TEXT.test(text)) return;

      // Bloc répété : on remonte tant que le parent n'a pas au moins 2 frères de même signature
      let block: Element = a;
      for (let depth = 0; depth < 6; depth++) {
        const parent = block.parent as Element | null;
        if (!parent || parent.type !== "tag" || parent.tagName === "body") break;
        const sig = signature(block);
        const siblings = parent.children.filter((c) => c.type === "tag" && signature(c as Element) === sig);
        if (siblings.length >= 2 && block.tagName !== "a") break;
        if (siblings.length >= 3) break;
        block = parent;
      }
      // Tableau de communiqués : la ligne entière est le bloc (la date est dans une autre cellule)
      if (block.tagName === "td" || block.tagName === "th") {
        const row = $(block).closest("tr").get(0) as Element | undefined;
        if (row) block = row;
      }
      const parent = block.parent as AnyNode | null;
      const viaHeading = $(a).closest("h1,h2,h3,h4").length > 0 || $(a).find("h1,h2,h3,h4").length > 0;
      candidates.push({ a, block, viaHeading, groupKey: `${parent ? idOf(parent) : -1}|${signature(block)}` });
    });

    // Groupes de blocs répétés, notés par nombre de blocs et longueur des titres
    const groups = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const g = groups.get(c.groupKey) ?? [];
      if (!g.some((x) => x.block === c.block)) g.push(c);
      groups.set(c.groupKey, g);
    }
    const scored = [...groups.values()]
      .map((g) => ({ g, score: g.length * 10 + g.reduce((s, c) => s + Math.min(120, this.titleFor($, c.a).length), 0) / g.length }))
      .sort((x, y) => y.score - x.score);

    let chosen: Candidate[];
    if (scored.length && scored[0].g.length >= 3) {
      const best = scored[0].score;
      // On garde aussi les autres listes comparables (ex. « à la une » + « dernières actualités »)
      chosen = scored.filter((s) => s.g.length >= 3 && s.score >= best * 0.6).flatMap((s) => s.g);
      // Liste à titres (h2/h3…) : on ajoute les articles isolés titrés de la même façon (ex. l'article « à la une »)
      if (chosen.filter((c) => c.viaHeading).length >= chosen.length / 2) {
        const pris = new Set(chosen.map((c) => c.block));
        const ordre = new Map(candidates.map((c, i) => [c.a, i]));
        chosen = [...chosen, ...candidates.filter((c) => c.viaHeading && !pris.has(c.block))].sort(
          (x, y) => (ordre.get(x.a) ?? 0) - (ordre.get(y.a) ?? 0)
        );
      }
    } else {
      // Pas de liste claire : tous les liens « article » de la page
      chosen = candidates;
    }

    const items = chosen.map(({ a, block }) => this.itemFrom($, a, block, base));
    return this.dedupe(items.filter((i): i is NonNullable<typeof i> => i !== null));
  }

  private titleFor($: cheerio.CheerioAPI, a: Element): string {
    const $a = $(a);
    const heading = $a.find("h1,h2,h3,h4,h5,h6").first().text();
    return clean(heading || $a.attr("title") || $a.text() || $a.find("img").attr("alt") || "");
  }

  private itemFrom($: cheerio.CheerioAPI, a: Element, block: Element, base: URL): ParsedFeed["items"][number] | null {
    const $b = $(block);
    // Le titre du bloc (souvent un h2/h3 qui contient le lien) prime sur le texte brut du lien
    const heading = clean($b.find("h1,h2,h3,h4,h5,h6").first().text());
    const linkText = this.titleFor($, a);
    const title = heading.length >= MIN_TITLE ? heading : linkText;
    const headingLink = $b.find("h1 a[href],h2 a[href],h3 a[href],h4 a[href]").first().attr("href");
    const link = this.abs(headingLink ?? $(a).attr("href") ?? "", base);
    if (!link || title.length < MIN_TITLE) return null;

    const timeEl = $b.find("time").first();
    const dateText =
      timeEl.attr("datetime") ??
      timeEl.text() ??
      "";
    // On ne cherche une date dans le texte que si le bloc ne contient qu'un seul article
    const liensDistincts = new Set(
      $b.find("a[href]").toArray().map((x) => this.abs($(x).attr("href") ?? "", base)).filter(Boolean)
    ).size
    const blocUnique = liensDistincts <= 2 && clean($b.text()).length < 800;
    const date =
      parseDateFr(dateText) ??
      (blocUnique ? parseDateFr(clean($b.find("[class*=date],[class*=time],[class*=meta],[class*=publi]").first().text())) : null) ??
      (blocUnique ? parseDateFr(clean($b.text()).replace(title, "")) : null);

    const img = $b.find("img").first();
    const src =
      img.attr("data-src") ??
      img.attr("data-lazy-src") ??
      img.attr("src") ??
      img.attr("srcset")?.split(",")[0]?.trim().split(/\s+/)[0];
    const image = src && !src.startsWith("data:") ? this.abs(src, base) : null;

    const description = $b
      .find("p")
      .toArray()
      .map((p) => clean($(p).text()))
      .find((t) => t.length > 40 && t !== title && !parseDateFr(t.slice(0, 40)));

    return {
      title: title.slice(0, 300),
      link,
      contentSnippet: description?.slice(0, 400),
      isoDate: date?.toISOString(),
      enclosure: image ? { url: image } : undefined,
    };
  }

  private dedupe(items: ParsedFeed["items"]): ParsedFeed["items"] {
    const seen = new Set<string>();
    return items.filter((i) => {
      const k = (i.link ?? "").replace(/\/$/, "");
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }
}
