import * as cheerio from "cheerio";
import { HttpException } from "../utils/HttpExceptions";

const BOT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
};

export type TelegramPost = {
  text?: string;
  link?: string;
  date?: string;
  image?: string;
};

export class TelegramService {
  async fetchChannelPosts(
    identifiant: string
  ): Promise<{ channelName?: string; channelLink: string; posts: TelegramPost[] }> {
    const username = identifiant
      .replace(/^@/, "")
      .replace(/^https?:\/\/t\.me\//i, "")
      .replace(/\/$/, "");

    const channelLink = `https://t.me/${username}`;
    const previewUrl = `https://t.me/s/${username}`;

    let html: string;
    try {
      const res = await fetch(previewUrl, { headers: BOT_HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      html = await res.text();
    } catch {
      throw new HttpException(422, "Impossible d'accéder à ce canal Telegram (nom invalide, ou canal privé/inexistant)");
    }

    const $ = cheerio.load(html);
    const channelName = $(".tgme_channel_info_header_title span").first().text().trim() || undefined;

    const posts: TelegramPost[] = [];
    $(".tgme_widget_message").each((_, el) => {
      const dataPost = $(el).attr("data-post");
      const link = dataPost ? `https://t.me/${dataPost}` : undefined;
      const text = $(el).find(".tgme_widget_message_text").first().text().trim() || undefined;
      const date = $(el).find("time").first().attr("datetime");
      const styleAttr = $(el).find(".tgme_widget_message_photo_wrap").first().attr("style");
      const image = styleAttr?.match(/url\(['"]?([^'")]+)['"]?\)/)?.[1];

      if (link) posts.push({ text, link, date, image });
    });

    if (posts.length === 0) {
      throw new HttpException(422, "Aucune publication trouvée : le canal est peut-être privé, inexistant, ou vide");
    }

    return { channelName, channelLink, posts };
  }
}