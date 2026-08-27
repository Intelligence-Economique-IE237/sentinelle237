import "dotenv/config";
import { PrismaClient, Zone, FluxType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Parser from "rss-parser";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const db = new PrismaClient({ adapter });
const parser = new Parser({ timeout: 15000 });

const { SEED_ADMIN_MAIL } = process.env as { [key: string]: string };

type CuratedFeed = {
  nom: string;
  lien_rss: string;
  zone?: Zone;
  categorie?: string;
};


function withZoneAndCategorie(
    zone: Zone | undefined,
    categorieDefaut: string,
    entries: { nom: string; lien_rss: string; categorie?: string }[],
    overrides: Record<string, string> = {}
): CuratedFeed[] {
  return entries.map((e) => ({
    ...e,
    zone,
    categorie: e.categorie ?? overrides[e.nom] ?? categorieDefaut,
  }));
}

function detectType(url: string): FluxType {
  return url.includes("youtube.com") ? FluxType.youtube : FluxType.rss;
}


const FRANCE_24 = [
  // Français
  { nom: "France 24 (FR) - Économie", lien_rss: "https://www.france24.com/fr/%C3%A9conomie/rss", categorie: "economie" },
  { nom: "France 24 (FR) - Culture", lien_rss: "https://www.france24.com/fr/culture/rss", categorie: "culture" },
  { nom: "France 24 (FR) - Sport", lien_rss: "https://www.france24.com/fr/sports/rss", categorie: "sport" },
  { nom: "France 24 (FR) - Moyen-Orient", lien_rss: "https://www.france24.com/fr/moyen-orient/rss", categorie: "environnement" },
  { nom: "France 24 (FR) - Afrique", lien_rss: "https://www.france24.com/fr/afrique/rss", categorie: "environnement" },
  // Anglais
  { nom: "France 24 (EN) - Business", lien_rss: "https://www.france24.com/en/business/rss", categorie: "economie" },
  { nom: "France 24 (EN) - Culture", lien_rss: "https://www.france24.com/en/culture/rss", categorie: "culture" },
  { nom: "France 24 (EN) - Sport", lien_rss: "https://www.france24.com/en/sports/rss", categorie: "sport" },
  { nom: "France 24 (EN) - Earth", lien_rss: "https://www.france24.com/en/earth/rss", categorie: "environnement" },

];

const RFI = [
  // Français
  { nom: "RFI (FR) - Monde", lien_rss: "https://www.rfi.fr/fr/rss" },
  { nom: "RFI (FR) - Économie", lien_rss: "https://www.rfi.fr/fr/%C3%A9conomie/rss", categorie: "economie" },
  { nom: "RFI (FR) - Culture", lien_rss: "https://www.rfi.fr/fr/culture/rss", categorie: "culture" },
  { nom: "RFI (FR) - Sports", lien_rss: "https://www.rfi.fr/fr/sports/rss", categorie: "sport" },
  { nom: "RFI (FR) - Science & Santé", lien_rss: "https://www.rfi.fr/fr/science-sant%C3%A9/rss", categorie: "sante" },
  // Anglais
  { nom: "RFI (EN) - World", lien_rss: "https://www.rfi.fr/en/rss" },
  { nom: "RFI (EN) - Business", lien_rss: "https://www.rfi.fr/en/business/rss", categorie: "economie" },
  { nom: "RFI (EN) - Culture", lien_rss: "https://www.rfi.fr/en/culture/rss", categorie: "culture" },
  { nom: "RFI (EN) - Sports", lien_rss: "https://www.rfi.fr/en/sports/rss", categorie: "sport" },
  // Langues Régionales & Africaines
  { nom: "RFI Hausa", lien_rss: "https://www.rfi.fr/ha/rss" },
  { nom: "RFI Swahili", lien_rss: "https://www.rfi.fr/sw/rss" },
  { nom: "RFI Fulfulde", lien_rss: "https://www.rfi.fr/ff/rss" },
  { nom: "RFI Mandenkan", lien_rss: "https://www.rfi.fr/man/rss" },
  // Autres Langues Internationales
  { nom: "RFI Español", lien_rss: "https://www.rfi.fr/es/rss" },
  { nom: "RFI Português", lien_rss: "https://www.rfi.fr/pt/rss" },
  { nom: "RFI Brasil", lien_rss: "https://www.rfi.fr/br/rss" },
  { nom: "RFI Tiếng Việt", lien_rss: "https://www.rfi.fr/vi/rss" },
  { nom: "RFI Română", lien_rss: "https://www.rfi.fr/ro/rss" },
  { nom: "RFI Русский", lien_rss: "https://www.rfi.fr/ru/rss" },
  { nom: "RFI Українською", lien_rss: "https://www.rfi.fr/uk/rss" },
  { nom: "RFI 简体中文", lien_rss: "https://www.rfi.fr/cn/rss" },
  { nom: "RFI 繁體中文", lien_rss: "https://www.rfi.fr/tw/rss" },
  { nom: "RFI Khmer", lien_rss: "https://www.rfi.fr/km/rss" },
];

const EURONEWS = [
  { nom: "Euronews (FR)", lien_rss: "https://fr.euronews.com/rss?format=xml" },
  { nom: "Euronews (EN)", lien_rss: "https://www.euronews.com/rss?format=xml" },
  { nom: "Euronews (DE)", lien_rss: "https://de.euronews.com/rss?format=xml" },
  { nom: "Euronews (ES)", lien_rss: "https://es.euronews.com/rss?format=xml" },
  { nom: "Euronews (IT)", lien_rss: "https://it.euronews.com/rss?format=xml" },
  { nom: "Euronews (PT)", lien_rss: "https://pt.euronews.com/rss?format=xml" },
  { nom: "Euronews (RU)", lien_rss: "https://ru.euronews.com/rss?format=xml" },
  { nom: "Euronews (TR)", lien_rss: "https://tr.euronews.com/rss?format=xml" },
  { nom: "Euronews (GR)", lien_rss: "https://gr.euronews.com/rss?format=xml" },
  { nom: "Euronews (HU)", lien_rss: "https://hu.euronews.com/rss?format=xml" },
  { nom: "Euronews (PER)", lien_rss: "https://per.euronews.com/rss?format=xml" },
  { nom: "Euronews (AR)", lien_rss: "https://arabic.euronews.com/rss?format=xml" },
  { nom: "Africanews (FR)", lien_rss: "https://fr.africanews.com/feed/" },
  { nom: "Africanews (EN)", lien_rss: "https://www.africanews.com/feed/" },
];

const BBC = [
  // Anglais & Rubriques
  { nom: "BBC News (EN) - World", lien_rss: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { nom: "BBC News (EN) - Business", lien_rss: "http://feeds.bbci.co.uk/news/business/rss.xml", categorie: "economie" },
  { nom: "BBC News (EN) - Technology", lien_rss: "http://feeds.bbci.co.uk/news/technology/rss.xml", categorie: "technologie" },
  { nom: "BBC News (EN) - Science & Environment", lien_rss: "http://feeds.bbci.co.uk/news/science_and_environment/rss.xml", categorie: "environnement" },
  { nom: "BBC News (EN) - Entertainment & Arts", lien_rss: "http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", categorie: "culture" },
  { nom: "BBC Sport", lien_rss: "http://feeds.bbci.co.uk/sport/rss.xml", categorie: "sport" },
  // Langues BBC World Service
  { nom: "BBC Afrique (FR)", lien_rss: "https://www.bbc.com/afrique/index.xml" },
  { nom: "BBC Hausa", lien_rss: "https://www.bbc.com/hausa/index.xml" },
  { nom: "BBC Swahili", lien_rss: "https://www.bbc.com/swahili/index.xml" },
  { nom: "BBC Somali", lien_rss: "https://www.bbc.com/somali/index.xml" },
  { nom: "BBC Gahuza", lien_rss: "https://www.bbc.com/gahuza/index.xml" },
  { nom: "BBC Igbo", lien_rss: "https://www.bbc.com/igbo/index.xml" },
  { nom: "BBC Yoruba", lien_rss: "https://www.bbc.com/yoruba/index.xml" },
  { nom: "BBC Pidgin", lien_rss: "https://www.bbc.com/pidgin/index.xml" },
  { nom: "BBC Arabic", lien_rss: "https://www.bbc.com/arabic/index.xml" },
  { nom: "BBC Persian", lien_rss: "https://www.bbc.com/persian/index.xml" },
  { nom: "BBC Pashto", lien_rss: "https://www.bbc.com/pashto/index.xml" },
  { nom: "BBC Urdu", lien_rss: "https://www.bbc.com/urdu/index.xml" },
  { nom: "BBC Hindi", lien_rss: "https://www.bbc.com/hindi/index.xml" },
  { nom: "BBC Bengali", lien_rss: "https://www.bbc.com/bengali/index.xml" },
  { nom: "BBC Tamil", lien_rss: "https://www.bbc.com/tamil/index.xml" },
  { nom: "BBC Nepali", lien_rss: "https://www.bbc.com/nepali/index.xml" },
  { nom: "BBC Sinhala", lien_rss: "https://www.bbc.com/sinhala/index.xml" },
  { nom: "BBC Burmese", lien_rss: "https://www.bbc.com/burmese/index.xml" },
  { nom: "BBC Indonesian", lien_rss: "https://www.bbc.com/indonesia/index.xml" },
  { nom: "BBC Vietnamese", lien_rss: "https://www.bbc.com/vietnamese/index.xml" },
  { nom: "BBC Russian", lien_rss: "https://www.bbc.com/russian/index.xml" },
  { nom: "BBC Ukrainian", lien_rss: "https://www.bbc.com/ukrainian/index.xml" },
  { nom: "BBC Brasil", lien_rss: "https://www.bbc.com/portuguese/index.xml" },
  { nom: "BBC Mundo", lien_rss: "https://www.bbc.com/mundo/index.xml" },
  { nom: "BBC Turkish", lien_rss: "https://www.bbc.com/turkce/index.xml" },
];

const CNN = [
  { nom: "CNN International", lien_rss: "http://rss.cnn.com/rss/edition.rss" },
  { nom: "CNN World", lien_rss: "http://rss.cnn.com/rss/edition_world.rss" },
  { nom: "CNN Business", lien_rss: "http://rss.cnn.com/rss/money_news_international.rss", categorie: "economie" },
  { nom: "CNN Technology", lien_rss: "http://rss.cnn.com/rss/edition_technology.rss", categorie: "technologie" },
  { nom: "CNN Entertainment", lien_rss: "http://rss.cnn.com/rss/edition_entertainment.rss", categorie: "culture" },
  { nom: "CNN Sport", lien_rss: "http://rss.cnn.com/rss/edition_sport.rss", categorie: "sport" },
  { nom: "CNN en Español", lien_rss: "https://cnnespanol.cnn.com/feed/" },
  { nom: "CNN Brasil", lien_rss: "https://www.cnnbrasil.com.br/feed/" },
  { nom: "CNN Indonesia", lien_rss: "https://www.cnnindonesia.com/rss" },
];

// ==========================================
// AUTRES PAYS ET RÉGIONS
// ==========================================

const AUSTRALIA = [
  { nom: "Daily Telegraph AU", lien_rss: "https://www.dailytelegraph.com.au/news/breaking-news/rss" },
  { nom: "Sydney Morning Herald", lien_rss: "https://www.smh.com.au/rss/feed.xml" },
  { nom: "Herald Sun", lien_rss: "https://www.heraldsun.com.au/news/breaking-news/rss" },
  { nom: "ABC News Australia", lien_rss: "https://www.abc.net.au/news/feed/1948/rss.xml" },
  { nom: "The Age", lien_rss: "https://www.theage.com.au/rss/feed.xml" },
  { nom: "The Courier Mail", lien_rss: "https://www.couriermail.com.au/rss" },
  { nom: "PerthNow", lien_rss: "https://www.perthnow.com.au/news/feed" },
  { nom: "The Canberra Times", lien_rss: "https://www.canberratimes.com.au/rss.xml" },
  { nom: "Brisbane Times", lien_rss: "https://www.brisbanetimes.com.au/rss/feed.xml" },
  { nom: "Independent Australia", lien_rss: "http://feeds.feedburner.com/IndependentAustralia" },
  { nom: "Business News Australia", lien_rss: "https://www.businessnews.com.au/rssfeed/latest.rss", categorie: "economie" },
  { nom: "InDaily", lien_rss: "https://indaily.com.au/feed/" },
  { nom: "The Mercury", lien_rss: "https://www.themercury.com.au/rss" },
  { nom: "Crikey", lien_rss: "https://feeds.feedburner.com/com/rCTl" },
  { nom: "Michael West", lien_rss: "https://www.michaelwest.com.au/feed/" },
];

const BANGLADESH = [
  { nom: "The Daily Star", lien_rss: "https://www.thedailystar.net/frontpage/rss.xml" },
  { nom: "BD24Live", lien_rss: "https://www.bd24live.com/feed" },
  { nom: "bdnews24.com", lien_rss: "https://bdnews24.com/?widgetName=rssfeed&widgetId=1150&getXmlFeed=true" },
  { nom: "Bangla News 24", lien_rss: "https://www.banglanews24.com/rss/rss.xml" },
  { nom: "JUGANTOR", lien_rss: "https://www.jugantor.com/feed/rss.xml" },
  { nom: "jagonews24.com", lien_rss: "https://www.jagonews24.com/rss/rss.xml" },
  { nom: "Kalerkantho", lien_rss: "https://www.kalerkantho.com/rss.xml" },
  { nom: "প্রথম আলো", lien_rss: "https://www.prothomalo.com/feed/" },
];

const HONG_KONG = [
  { nom: "Hong Kong Free Press", lien_rss: "https://www.hongkongfp.com/feed/" },
  { nom: "The Standard HK", lien_rss: "https://www.thestandard.com.hk/newsfeed/latest/news.xml" },
  { nom: "頭條日報", lien_rss: "https://hd.stheadline.com/rss/news/daily/" },
  { nom: "香港經濟日報 hket.com", lien_rss: "https://www.hket.com/rss/hongkong", categorie: "economie" },
  { nom: "South China Morning Post", lien_rss: "https://www.scmp.com/rss/91/feed" },
  { nom: "hongkongnews.net", lien_rss: "http://feeds.hongkongnews.net/rss/b82693edf38ebff8" },
];

const INDONESIA = [
  { nom: "Republika Online", lien_rss: "https://www.republika.co.id/rss/" },
  { nom: "Tribunnews.com", lien_rss: "https://www.tribunnews.com/rss" },
  { nom: "Merdeka.com", lien_rss: "https://www.merdeka.com/feed/" },
  { nom: "Suara.com", lien_rss: "https://www.suara.com/rss" },
];

const INDIA = [
  { nom: "BBC News India", lien_rss: "http://feeds.bbci.co.uk/news/world/asia/india/rss.xml" },
  { nom: "The Guardian India", lien_rss: "https://www.theguardian.com/world/india/rss" },
  { nom: "Times of India", lien_rss: "https://timesofindia.indiatimes.com/rssfeedstopstories.cms" },
  { nom: "The Hindu", lien_rss: "https://www.thehindu.com/feeder/default.rss" },
  { nom: "NDTV News", lien_rss: "https://feeds.feedburner.com/ndtvnews-top-stories" },
  { nom: "India Today", lien_rss: "https://www.indiatoday.in/rss/home" },
  { nom: "The Indian Express", lien_rss: "http://indianexpress.com/print/front-page/feed/" },
  { nom: "News18 World", lien_rss: "https://www.news18.com/rss/world.xml" },
  { nom: "DNA India", lien_rss: "https://www.dnaindia.com/feeds/india.xml" },
  { nom: "Firstpost India", lien_rss: "https://www.firstpost.com/rss/india.xml" },
  { nom: "Business Standard", lien_rss: "https://www.business-standard.com/rss/home_page_top_stories.rss", categorie: "economie" },
  { nom: "Outlook India", lien_rss: "https://www.outlookindia.com/rss/main/magazine" },
  { nom: "Free Press Journal", lien_rss: "https://www.freepressjournal.in/stories.rss" },
  { nom: "Deccan Chronicle", lien_rss: "https://www.deccanchronicle.com/rss_feed/" },
  { nom: "Moneycontrol", lien_rss: "http://www.moneycontrol.com/rss/latestnews.xml", categorie: "economie" },
  { nom: "Economic Times", lien_rss: "https://economictimes.indiatimes.com/rssfeedsdefault.cms", categorie: "economie" },
  { nom: "Oneindia", lien_rss: "https://www.oneindia.com/rss/news-fb.xml" },
  { nom: "Scroll.in", lien_rss: "http://feeds.feedburner.com/ScrollinArticles.rss" },
  { nom: "The Financial Express", lien_rss: "https://www.financialexpress.com/feed/", categorie: "economie" },
  { nom: "Business Line", lien_rss: "https://www.thehindubusinessline.com/feeder/default.rss", categorie: "economie" },
  { nom: "TechGenyz", lien_rss: "http://feeds.feedburner.com/techgenyz", categorie: "technologie" },
  { nom: "Gujarat Samachar", lien_rss: "https://www.gujaratsamachar.com/rss/top-stories" },
  { nom: "Maharashtra Times", lien_rss: "https://maharashtratimes.com/rssfeedsdefault.cms" },
  { nom: "Loksatta", lien_rss: "https://www.loksatta.com/desh-videsh/feed/" },
  { nom: "News18 Lokmat", lien_rss: "https://lokmat.news18.com/rss/program.xml" },
  { nom: "OpIndia", lien_rss: "https://feeds.feedburner.com/opindia" },
  { nom: "ThePrint", lien_rss: "https://theprint.in/feed/" },
  { nom: "Swarajya", lien_rss: "https://prod-qt-images.s3.amazonaws.com/production/swarajya/feed.xml" },
  { nom: "Amar Ujala", lien_rss: "https://www.amarujala.com/rss/breaking-news.xml" },
  { nom: "Navbharat Times", lien_rss: "https://navbharattimes.indiatimes.com/rssfeedsdefault.cms" },
  { nom: "Patrika", lien_rss: "http://api.patrika.com/rss/india-news" },
  { nom: "Jansatta", lien_rss: "https://www.jansatta.com/feed/" },
  { nom: "Live Hindustan", lien_rss: "https://feed.livehindustan.com/rss/3127" },
  { nom: "Dainik Bhaskar", lien_rss: "https://www.bhaskar.com/rss-feed/1061/" },
  { nom: "Divya Bhaskar", lien_rss: "https://www.divyabhaskar.co.in/rss-feed/1037/" },
];

const IRAN = [
  { nom: "YJC", lien_rss: "https://www.yjc.ir/fa/rss/allnews" },
  { nom: "Tabnak", lien_rss: "https://www.tabnak.ir/fa/rss/allnews" },
  { nom: "ISNA", lien_rss: "https://www.isna.ir/rss" },
  { nom: "Mehr News", lien_rss: "https://www.mehrnews.com/rss" },
  { nom: "Khabaronline", lien_rss: "https://www.khabaronline.ir/rss" },
  { nom: "Tasnim News", lien_rss: "https://www.tasnimnews.com/fa/rss/feed/0/8/0/%D9%85%D9%87%D9%85%D8%AA%D8%B1%DB%8C%D9%8BD-%D8%A7%D8%AE%D8%A8%D8%A7%D8%B1-%D8%AA%D8%B3%D9%86%DB%8C%D9%85" },
  { nom: "Asr Iran", lien_rss: "https://www.asriran.com/fa/rss/allnews" },
];

const JAPAN = [
  { nom: "Japan Times", lien_rss: "https://www.japantimes.co.jp/feed/topstories/" },
  { nom: "Japan Today", lien_rss: "https://japantoday.com/feed" },
  { nom: "News On Japan", lien_rss: "http://www.newsonjapan.com/rss/top.xml" },
  { nom: "Kyodo News+", lien_rss: "https://english.kyodonews.net/rss/all.xml" },
  { nom: "BRIDGE", lien_rss: "http://feeds.feedburner.com/SdJapan", categorie: "technologie" },
  { nom: "NYT Japan", lien_rss: "https://www.nytimes.com/svc/collections/v1/publish/http://www.nytimes.com/topic/destination/japan/rss.xml" },
  { nom: "ライブドアニュース", lien_rss: "https://news.livedoor.com/topics/rss/top.xml" },
  { nom: "朝日新聞デジタル", lien_rss: "http://rss.asahi.com/rss/asahi/newsheadlines.rdf" },
];

const MYANMAR = [
  { nom: "Myanmar Gazette", lien_rss: "http://myanmargazette.net/feed" },
  { nom: "DVB Multimedia Group", lien_rss: "http://www.dvb.no/feed" },
  { nom: "Thit Htoo Lwin", lien_rss: "http://www.thithtoolwin.com/feeds/posts/default" },
];

const PHILIPPINES = [
  { nom: "INQUIRER.net", lien_rss: "https://www.inquirer.net/fullfeed" },
  { nom: "Interaksyon", lien_rss: "https://www.interaksyon.com/feed/" },
  { nom: "philstar.com", lien_rss: "https://www.philstar.com/rss/headlines" },
  { nom: "BusinessWorld", lien_rss: "https://www.bworldonline.com/feed/", categorie: "economie" },
  { nom: "SunStar", lien_rss: "https://www.sunstar.com.ph/rssFeed/selected" },
  { nom: "PhilNews.XYZ", lien_rss: "https://www.philnews.xyz/feeds/posts/default?alt=rss" },
  { nom: "Manila Standard", lien_rss: "https://manilastandard.net/feed/all" },
  { nom: "GMA News Online", lien_rss: "https://data.gmanews.tv/gno/rss/news/feed.xml" },
  { nom: "Current PH", lien_rss: "https://currentph.com/feed/" },
  { nom: "Top Gear Philippines", lien_rss: "https://www.topgear.com.ph/feed/rss1" },
  { nom: "Eagle News", lien_rss: "https://www.eaglenews.ph/feed/" },
  { nom: "UNBOX PH", lien_rss: "https://www.unbox.ph/feed/", categorie: "technologie" },
  { nom: "Tempo", lien_rss: "http://tempo.com.ph/feed/" },
  { nom: "Abante Tonite", lien_rss: "https://tonite.abante.com.ph/feed/" },
  { nom: "BusinessMirror", lien_rss: "https://businessmirror.com.ph/feed/", categorie: "economie" },
  { nom: "Philippine News Agency", lien_rss: "https://www.pna.gov.ph/latest.rss" },
  { nom: "TechPinas", lien_rss: "http://feeds.feedburner.com/Techpinas", categorie: "technologie" },
  { nom: "Bicol Standard", lien_rss: "http://www.bicolstandard.com/feeds/posts/default?alt=rss" },
];

const PAKISTAN = [
  { nom: "The Express Tribune", lien_rss: "https://tribune.com.pk/feed/home" },
  { nom: "The Nation Pakistan", lien_rss: "https://nation.com.pk/rss/top-stories" },
  { nom: "Jang", lien_rss: "https://jang.com.pk/rss/1/1" },
  { nom: "The News International", lien_rss: "https://www.thenews.com.pk/rss/1/1" },
  { nom: "News n Blogs", lien_rss: "https://newsnblogs.com/feed/" },
  { nom: "UrduPoint", lien_rss: "https://www.urdupoint.com/rss/urdupoint.rss" },
  { nom: "Express Urdu", lien_rss: "https://www.express.pk/feed/" },
];

const GERMANY = [
  { nom: "ZEIT ONLINE", lien_rss: "http://newsfeed.zeit.de/index" },
  { nom: "FOCUS Online", lien_rss: "https://rss.focus.de/fol/XML/rss_folnews.xml" },
  { nom: "FAZ.NET", lien_rss: "https://www.faz.net/rss/aktuell/" },
  { nom: "tagesschau.de", lien_rss: "http://www.tagesschau.de/xml/rss2" },
  { nom: "Deutsche Welle", lien_rss: "https://rss.dw.com/rdf/rss-en-all" },
];

const SPAIN = [
  { nom: "The Local Spain", lien_rss: "https://feeds.thelocal.com/rss/es" },
  { nom: "EL PAÍS", lien_rss: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada" },
  { nom: "El Confidencial España", lien_rss: "https://rss.elconfidencial.com/espana/" },
  { nom: "ElDiario.es", lien_rss: "https://www.eldiario.es/rss/" },
  { nom: "Expansión", lien_rss: "https://e00-expansion.uecdn.es/rss/portada.xml", categorie: "economie" },
  { nom: "El Periódico", lien_rss: "https://www.elperiodico.com/es/rss/rss_portada.xml" },
  { nom: "HuffPost España", lien_rss: "https://www.huffingtonpost.es/feeds/index.xml" },
  { nom: "Euro Weekly News Spain", lien_rss: "https://www.euroweeklynews.com/feed/" },
  { nom: "Agencia EFE (English)", lien_rss: "https://www.efe.com/efe/english/4/rss" },
];

const FRANCE = [
  { nom: "France24 EN", lien_rss: "https://www.france24.com/en/rss" },
  { nom: "Mediapart", lien_rss: "https://www.mediapart.fr/articles/feed" },
  { nom: "Paris Star", lien_rss: "https://www.parisstaronline.com/feed" },
  { nom: "Le Monde.fr - Une", lien_rss: "https://www.lemonde.fr/rss/une.xml" },
  { nom: "L'Obs", lien_rss: "https://www.nouvelobs.com/a-la-une/rss.xml" },
  { nom: "Franceinfo", lien_rss: "https://www.francetvinfo.fr/titres.rss" },
  { nom: "Le Huffington Post FR", lien_rss: "https://www.huffingtonpost.fr/feeds/index.xml" },
  { nom: "La Dépêche du Midi", lien_rss: "https://www.ladepeche.fr/rss.xml" },
  { nom: "Diplomatie.gouv.fr", lien_rss: "https://www.diplomatie.gouv.fr/spip.php?page=backend-fd&lang=en", categorie: "politique" },
  { nom: "L'essentiel (Sud Ouest)", lien_rss: "https://www.sudouest.fr/essentiel/rss.xml" },
  { nom: "Ouest-France", lien_rss: "https://www.ouest-france.fr/rss-en-continu.xml" },
];

const UK = [
  { nom: "BBC News Home", lien_rss: "http://feeds.bbci.co.uk/news/rss.xml" },
  { nom: "The Guardian World", lien_rss: "https://www.theguardian.com/world/rss" },
  { nom: "Daily Mail", lien_rss: "https://www.dailymail.co.uk/home/index.rss" },
  { nom: "The Independent UK", lien_rss: "http://www.independent.co.uk/news/uk/rss" },
  { nom: "Daily Express", lien_rss: "http://feeds.feedburner.com/daily-express-news-showbiz" },
];

const IRELAND = [
  { nom: "TheJournal.ie", lien_rss: "https://www.thejournal.ie/feed/" },
  { nom: "BreakingNews.ie", lien_rss: "https://feeds.breakingnews.ie/bntopstories" },
  { nom: "The42", lien_rss: "https://www.the42.ie/feed/", categorie: "sport" },
  { nom: "IrishExaminer.com", lien_rss: "https://feeds.feedburner.com/ietopstories" },
  { nom: "IrishCentral.com", lien_rss: "https://feeds.feedburner.com/IrishCentral" },
  { nom: "Irish Mirror", lien_rss: "https://www.irishmirror.ie/?service=rss" },
];

const ITALY = [
  { nom: "ANSA.it", lien_rss: "https://www.ansa.it/sito/ansait_rss.xml" },
  { nom: "The Local Italy", lien_rss: "https://feeds.thelocal.com/rss/it" },
  { nom: "DiariodelWeb.it", lien_rss: "https://www.diariodelweb.it/rss/home/" },
  { nom: "Fanpage", lien_rss: "https://www.fanpage.it/feed/" },
  { nom: "Libero Quotidiano", lien_rss: "https://www.liberoquotidiano.it/rss.xml" },
  { nom: "Il Mattino", lien_rss: "https://www.ilmattino.it/?sez=XML&args&p=search&args[box]=Home&limit=20&layout=rss" },
  { nom: "Adnkronos", lien_rss: "http://rss.adnkronos.com/RSS_PrimaPagina.xml" },
  { nom: "Milan News", lien_rss: "https://www.milannews.it/rss/", categorie: "sport" },
  { nom: "Internazionale", lien_rss: "https://www.internazionale.it/sitemaps/rss.xml" },
  { nom: "Panorama", lien_rss: "https://www.panorama.it/feeds/feed.rss" },
  { nom: "The Guardian Italy", lien_rss: "https://www.theguardian.com/world/italy/rss" },
  { nom: "Repubblica.it", lien_rss: "https://www.repubblica.it/rss/homepage/rss2.0.xml" },
  { nom: "Il Post", lien_rss: "https://www.ilpost.it/feed/" },
];

const POLAND = [
  { nom: "wPolityce", lien_rss: "http://feeds.feedburner.com/wPolitycepl", categorie: "politique" },
  { nom: "Newsweek Polska", lien_rss: "https://www.newsweek.pl/rss.xml" },
  { nom: "Dziennik.pl", lien_rss: "http://rss.dziennik.pl/Dziennik-PL/" },
  { nom: "Wirtualnemedia.pl", lien_rss: "https://www.wirtualnemedia.pl/rss/wirtualnemedia_rss.xml", categorie: "technologie" },
  { nom: "GazetaPrawna.pl", lien_rss: "http://rss.gazetaprawna.pl/GazetaPrawna", categorie: "economie" },
  { nom: "Rzeczpospolita", lien_rss: "https://www.rp.pl/rss/1019" },
  { nom: "PAP", lien_rss: "https://www.pap.pl/rss.xml" },
  { nom: "RMF24.pl", lien_rss: "https://www.rmf24.pl/feed" },
];

const RUSSIA = [
  { nom: "Lenta.ru", lien_rss: "https://lenta.ru/rss" },
  { nom: "Vesti.ru", lien_rss: "https://www.vesti.ru/vesti.rss" },
  { nom: "Gazeta.ru", lien_rss: "https://www.gazeta.ru/export/rss/first.xml" },
  { nom: "MK.ru", lien_rss: "https://www.mk.ru/rss/index.xml" },
  { nom: "Rossiyskaya Gazeta", lien_rss: "https://rg.ru/xml/index.xml" },
  { nom: "NEWSru.com", lien_rss: "https://rss.newsru.com/top/big/" },
  { nom: "RT", lien_rss: "https://www.rt.com/rss/" },
  { nom: "Meduza.io", lien_rss: "https://meduza.io/rss/all" },
  { nom: "Russia Insider", lien_rss: "https://russia-insider.com/en/all-content/rss" },
  { nom: "TASS", lien_rss: "http://tass.com/rss/v2.xml" },
  { nom: "The Moscow Times", lien_rss: "https://www.themoscowtimes.com/rss/news" },
  { nom: "Kommersant", lien_rss: "https://www.kommersant.ru/RSS/main.xml", categorie: "economie" },
  { nom: "PravdaReport", lien_rss: "https://www.pravdareport.com/export.xml" },
];

const UKRAINE = [
  { nom: "UNIAN (EN)", lien_rss: "https://rss.unian.net/site/news_eng.rss" },
  { nom: "Telegraf.ua", lien_rss: "https://telegraf.com.ua/yandex-feed/" },
  { nom: "Korrespondent.net", lien_rss: "http://k.img.com.ua/rss/ru/all_news2.0.xml" },
  { nom: "Tsenzor.net", lien_rss: "https://censor.net.ua/includes/news_ru.xml" },
  { nom: "TSN.ua", lien_rss: "https://tsn.ua/rss/full.rss" },
  { nom: "Ukrainska Pravda", lien_rss: "https://www.pravda.com.ua/rss/" },
  { nom: "Gordon", lien_rss: "https://gordonua.com/xml/rss_category/top.html" },
  { nom: "NV.ua", lien_rss: "https://nv.ua/rss/all.xml" },
  { nom: "UNIAN (RU)", lien_rss: "https://rss.unian.net/site/news_rus.rss" },
  { nom: "Espreso.tv", lien_rss: "https://espreso.tv/rss" },
  { nom: "Gazeta.ua", lien_rss: "https://gazeta.ua/rss" },
  { nom: "Vesti.ua", lien_rss: "https://vesti.ua/feeds/partners" },
];

const BRAZIL = [
  { nom: "Folha de S.Paulo", lien_rss: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml" },
  { nom: "Portal EBC", lien_rss: "http://www.ebc.com.br/rss/feed.xml" },
  { nom: "R7 Notícias", lien_rss: "https://noticias.r7.com/feed.xml" },
  { nom: "UOL", lien_rss: "http://rss.home.uol.com.br/index.xml" },
  { nom: "The Rio Times", lien_rss: "https://riotimesonline.com/feed/" },
  { nom: "Brasil Wire", lien_rss: "http://www.brasilwire.com/feed/" },
  { nom: "Jornal de Brasília", lien_rss: "https://jornaldebrasilia.com.br/feed/" },
];

const CANADA = [
  { nom: "CBC Top Stories", lien_rss: "https://www.cbc.ca/cmlink/rss-topstories" },
  { nom: "CTVNews.ca", lien_rss: "https://www.ctvnews.ca/rss/ctvnews-ca-top-stories-public-rss-1.822009" },
  { nom: "Global News", lien_rss: "https://globalnews.ca/feed/" },
  { nom: "Financial Post", lien_rss: "https://business.financialpost.com/feed/", categorie: "economie" },
  { nom: "National Post", lien_rss: "https://nationalpost.com/feed/" },
  { nom: "Ottawa Citizen", lien_rss: "https://ottawacitizen.com/feed/" },
  { nom: "The Province", lien_rss: "https://theprovince.com/feed/" },
  { nom: "LaPresse.ca", lien_rss: "https://www.lapresse.ca/actualites/rss" },
  { nom: "Toronto Star", lien_rss: "https://www.thestar.com/content/thestar/feed.RSSManagerServlet.articles.topstories.rss" },
  { nom: "Toronto Sun", lien_rss: "https://torontosun.com/category/news/feed" },
];

const MEXICO = [
  { nom: "The Guardian Mexico", lien_rss: "https://www.theguardian.com/world/mexico/rss" },
  { nom: "Excélsior", lien_rss: "https://www.excelsior.com.mx/rss.xml" },
  { nom: "Reforma", lien_rss: "https://www.reforma.com/rss/portada.xml" },
  { nom: "Vanguardia MX", lien_rss: "https://vanguardia.com.mx/rss.xml" },
  { nom: "El Siglo de Torreón", lien_rss: "https://www.elsiglodetorreon.com.mx/index.xml" },
  { nom: "El Financiero", lien_rss: "https://www.elfinanciero.com.mx/arc/outboundfeeds/rss/?outputType=xml", categorie: "economie" },
  { nom: "ElNorte", lien_rss: "https://www.elnorte.com/rss/portada.xml" },
  { nom: "El Informador", lien_rss: "https://www.informador.mx/rss/ultimas-noticias.xml" },
  { nom: "24 Horas MX", lien_rss: "https://www.24-horas.mx/feed/" },
  { nom: "DEBATE", lien_rss: "https://www.debate.com.mx/rss/feed.xml" },
  { nom: "Mexico News Daily", lien_rss: "https://mexiconewsdaily.com/feed/" },
  { nom: "El Diario (Juárez)", lien_rss: "https://diario.mx/jrz/media/sitemaps/rss.xml" },
  { nom: "8 Columnas", lien_rss: "https://8columnas.com.mx/feed/" },
  { nom: "El Universal MX", lien_rss: "https://www.eluniversal.com.mx/seccion/1671/rss.xml" },
];

const UNITED_STATES = [
  { nom: "HuffPost World News", lien_rss: "https://www.huffpost.com/section/world-news/feed" },
  { nom: "NYT Top Stories", lien_rss: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml" },
  { nom: "FOX News", lien_rss: "http://feeds.foxnews.com/foxnews/latest" },
  { nom: "Washington Post World", lien_rss: "http://feeds.washingtonpost.com/rss/world" },
  { nom: "WSJ World News", lien_rss: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
  { nom: "LA Times World & Nation", lien_rss: "https://www.latimes.com/world-nation/rss2.0.xml" },
  { nom: "CNN International", lien_rss: "http://rss.cnn.com/rss/edition.rss" },
  { nom: "Yahoo News", lien_rss: "https://news.yahoo.com/rss/mostviewed" },
  { nom: "CNBC US Top News", lien_rss: "https://www.cnbc.com/id/100003114/device/rss/rss.html", categorie: "economie" },
  { nom: "Politico Playbook", lien_rss: "https://rss.politico.com/playbook.xml", categorie: "politique" },
];

const CAMEROUN = [
  { nom: "Journal du Cameroun", lien_rss: "https://www.journalducameroun.com/feed/" },
  { nom: "Actu Cameroun", lien_rss: "https://actucameroun.com/feed/" },
  { nom: "Cameroon Info Net", lien_rss: "https://www.cameroon-info.net/rss.xml" },
  { nom: "Cameroon Intelligence Report", lien_rss: "https://www.cameroonintelligencereport.com/feed/" },
  { nom: "EcoMatin", lien_rss: "https://ecomatin.net/feed.xml", categorie: "economie" },
  { nom: "Financial Afrik", lien_rss: "https://www.financialafrik.com/feed/", categorie: "economie" },
  { nom: "Digital Business Africa", lien_rss: "https://www.digitalbusiness.africa/feed/", categorie: "technologie" },
  { nom: "Investir au Cameroun", lien_rss: "https://www.investiraucameroun.com/component/obrss/fullrss", categorie: "economie" },
  { nom: "We Are Tech Africa", lien_rss: "https://www.wearetech.africa/component/obrss/fluxrss", categorie: "technologie" },
  { nom: "StopBlaBlaCam", lien_rss: "http://www.stopblablacam.com/component/obrss/sbbc-francais" },
];

const NIGERIA = [
  { nom: "Sahara Reporters", lien_rss: "http://saharareporters.com/feeds/latest/feed" },
  { nom: "Nigerian Bulletin", lien_rss: "https://www.nigerianbulletin.com/forums/-/index.rss" },
  { nom: "Nigerianeye", lien_rss: "http://feeds.feedburner.com/Nigerianeye" },
  { nom: "Legit.ng", lien_rss: "https://www.legit.ng/rss/all.rss" },
  { nom: "The Nation Nigeria", lien_rss: "https://thenationonlineng.net/feed/" },
  { nom: "Daily Post Nigeria", lien_rss: "https://dailypost.ng/feed" },
  { nom: "Premium Times Nigeria", lien_rss: "https://www.premiumtimesng.com/feed" },
  { nom: "Information Nigeria", lien_rss: "https://www.informationng.com/feed" },
  { nom: "The Guardian Nigeria", lien_rss: "https://guardian.ng/feed/" },
  { nom: "Tribune Online", lien_rss: "http://tribuneonlineng.com/feed/" },
  { nom: "Punch Newspapers", lien_rss: "https://punchng.com/feed/" },
];

const SOUTH_AFRICA = [
  { nom: "SowetanLIVE", lien_rss: "https://www.sowetanlive.co.za/rss/?publication=sowetan-live" },
  { nom: "BusinessTech", lien_rss: "https://businesstech.co.za/news/feed/", categorie: "economie" },
  { nom: "TechCentral", lien_rss: "https://techcentral.co.za/feed", categorie: "technologie" },
  { nom: "News24 Top Stories", lien_rss: "http://feeds.news24.com/articles/news24/TopStories/rss" },
  { nom: "Eyewitness News", lien_rss: "https://ewn.co.za/RSS%20Feeds/Latest%20News" },
  { nom: "The Citizen", lien_rss: "https://citizen.co.za/feed/" },
  { nom: "Daily Maverick", lien_rss: "https://www.dailymaverick.co.za/dmrss/" },
  { nom: "Moneyweb", lien_rss: "https://www.moneyweb.co.za/feed/", categorie: "economie" },
  { nom: "IOL News", lien_rss: "http://rss.iol.io/iol/news" },
  { nom: "TimesLIVE", lien_rss: "https://www.timeslive.co.za/rss/" },
  { nom: "The South African", lien_rss: "https://www.thesouthafrican.com/feed/" },
];

const SENEGAL = [
  { nom: "SeneNews", lien_rss: "https://www.senenews.com/feed" },
  { nom: "Seneweb", lien_rss: "https://www.seneweb.com/news/rss.php" },
  { nom: "Dakaractu", lien_rss: "https://www.dakaractu.com/xml/rss.xml" },
  { nom: "L'Aps (Agence de Presse Sénégalaise)", lien_rss: "https://aps.sn/feed/" },
  { nom: "Le Soleil", lien_rss: "https://lesoleil.sn/feed/" },
];

const COTE_D_IVOIRE = [
  { nom: "Abidjan.net", lien_rss: "https://www.abidjan.net/rss/news.xml" },
  { nom: "Fraternité Matin", lien_rss: "https://www.fratmat.info/index.php?option=com_rss&feed=RSS2.0&no_html=1" },
  { nom: "L'Inter Express", lien_rss: "https://www.Linfodrome.com/rss/news.xml" },
  { nom: "KOACI", lien_rss: "https://www.koaci.com/rss.xml" },
];

const RDC = [
  { nom: "Actualite.cd", lien_rss: "https://actualite.cd/feed" },
  { nom: "Radio Okapi", lien_rss: "https://www.radiookapi.net/rss.xml" },
  { nom: "Politico.cd", lien_rss: "https://www.politico.cd/feed", categorie: "politique" },
  { nom: "Forum des As", lien_rss: "https://www.forumdesas.cd/feed/" },
];

const MAROC = [
  { nom: "Le360", lien_rss: "https://fr.le360.ma/rss" },
  { nom: "L'Économiste", lien_rss: "https://www.leconomiste.com/rss.xml", categorie: "economie" },
  { nom: "Hespress FR", lien_rss: "https://fr.hespress.com/feed" },
  { nom: "TelQuel", lien_rss: "https://telquel.ma/feed" },
];

const ALGERIE = [
  { nom: "TSA Algérie", lien_rss: "https://www.tsa-algerie.com/feed/" },
  { nom: "El Watan", lien_rss: "https://elwatan-dz.com/feed" },
  { nom: "APS (Algérie Presse Service)", lien_rss: "https://www.aps.dz/algerie/fichiers/rss/aps-algerie.xml" },
];

const TUNISIE = [
  { nom: "Business News TN", lien_rss: "https://www.businessnews.com.tn/rss.xml", categorie: "economie" },
  { nom: "Mosaique FM", lien_rss: "https://www.mosaiquefm.net/fr/rss" },
  { nom: "Kapitalis", lien_rss: "https://kapitalis.com/tunisie/feed/" },
];

const KENYA = [
  { nom: "The Nation Kenya", lien_rss: "https://nation.africa/kenya/rss" },
  { nom: "The Standard Kenya", lien_rss: "https://www.standardmedia.co.ke/rss/kenya.php" },
  { nom: "Capital FM Kenya", lien_rss: "https://www.capitalfm.co.ke/news/feed/" },
  { nom: "Kenyans.co.ke", lien_rss: "https://www.kenyans.co.ke/feeds/news" },
];

const EGYPTE = [
  { nom: "Ahram Online", lien_rss: "https://english.ahram.org.eg/rss/News/0.aspx" },
  { nom: "Egypt Today", lien_rss: "https://www.egypttoday.com/rss" },
  { nom: "Daily News Egypt", lien_rss: "https://dailynewsegypt.com/feed/" },
];

const GHANA = [
  { nom: "GhanaWeb", lien_rss: "https://www.ghanaweb.com/GhanaHomePage/rss/news.xml" },
  { nom: "MyJoyOnline", lien_rss: "https://www.myjoyonline.com/feed/" },
  { nom: "Citi Newsroom", lien_rss: "https://citinewsroom.com/feed/" },
];

const RWANDA = [
  { nom: "The New Times Rwanda", lien_rss: "https://www.newtimes.co.rw/rss" },
  { nom: "IGIHE", lien_rss: "https://en.igihe.com/spip.php?page=backend" },
];

const AFRIQUE_GENERALISTE = [
  { nom: "RFI Afrique", lien_rss: "https://www.rfi.fr/afrique/rss" },
  { nom: "Jeune Afrique", lien_rss: "https://www.jeuneafrique.com/feed/" },
  { nom: "BBC Afrique", lien_rss: "https://www.bbc.com/afrique/index.xml" },
  { nom: "AllAfrica Headlines", lien_rss: "https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf" },
];

const AGENCE_ECOFIN = [
  { nom: "Agence Ecofin - Toute l'actualité", lien_rss: "https://www.agenceecofin.com/obrss-2/agence-rss" },
  { nom: "Agence Ecofin - Finance", lien_rss: "https://www.agenceecofin.com/obrss-2/finance-rss", categorie: "economie" },
  { nom: "Agence Ecofin - Gestion Publique", lien_rss: "https://www.agenceecofin.com/obrss-2/gestionpublique-rss", categorie: "politique" },
  { nom: "Agence Ecofin - Agro", lien_rss: "https://www.agenceecofin.com/obrss-2/agro-rss", categorie: "economie" },
  { nom: "Agence Ecofin - Électricité", lien_rss: "https://www.agenceecofin.com/obrss-2/electricite-rss", categorie: "economie" },
  { nom: "Agence Ecofin - Hydrocarbures", lien_rss: "https://www.agenceecofin.com/obrss-2/hydrocarbures-rss", categorie: "economie" },
  { nom: "Agence Ecofin - Mines", lien_rss: "https://www.agenceecofin.com/obrss-2/mines-rss", categorie: "economie" },
  { nom: "Agence Ecofin - Tic et Télécom", lien_rss: "https://www.agenceecofin.com/obrss-2/telecom-rss", categorie: "technologie" },
  { nom: "Agence Ecofin - Communication", lien_rss: "https://www.agenceecofin.com/obrss-2/comm-rss" },
  { nom: "Agence Ecofin - Droits", lien_rss: "https://www.agenceecofin.com/obrss-2/droits-rss", categorie: "politique" },
];

const INTERNATIONAL = [
  { nom: "RFI Monde", lien_rss: "https://www.rfi.fr/fr/rss" },
  { nom: "BBC World News", lien_rss: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { nom: "Le Monde Diplomatique", lien_rss: "https://www.monde-diplomatique.fr/rss" },
];

// ============================================================================
// CONSOLIDATION ET COMPILATION GLOBALE DES FLUX
// ============================================================================
const CURATED_FEEDS: CuratedFeed[] = [
  ...withZoneAndCategorie(Zone.international, "generale", FRANCE_24),
  ...withZoneAndCategorie(Zone.international, "generale", RFI),
  ...withZoneAndCategorie(Zone.international, "generale", EURONEWS),
  ...withZoneAndCategorie(Zone.international, "generale", BBC),
  ...withZoneAndCategorie(Zone.international, "generale", CNN),

  // Zones Géographiques
  ...withZoneAndCategorie(Zone.asie, "generale", AUSTRALIA),
  ...withZoneAndCategorie(Zone.asie, "generale", BANGLADESH),
  ...withZoneAndCategorie(Zone.asie, "generale", HONG_KONG),
  ...withZoneAndCategorie(Zone.asie, "generale", INDONESIA),
  ...withZoneAndCategorie(Zone.asie, "generale", INDIA),
  ...withZoneAndCategorie(Zone.asie, "generale", IRAN),
  ...withZoneAndCategorie(Zone.asie, "generale", JAPAN),
  ...withZoneAndCategorie(Zone.asie, "generale", MYANMAR),
  ...withZoneAndCategorie(Zone.asie, "generale", PHILIPPINES),
  ...withZoneAndCategorie(Zone.asie, "generale", PAKISTAN),
  ...withZoneAndCategorie(Zone.europe, "generale", GERMANY),
  ...withZoneAndCategorie(Zone.europe, "generale", SPAIN),
  ...withZoneAndCategorie(Zone.europe, "generale", FRANCE),
  ...withZoneAndCategorie(Zone.europe, "generale", UK),
  ...withZoneAndCategorie(Zone.europe, "generale", IRELAND),
  ...withZoneAndCategorie(Zone.europe, "generale", ITALY),
  ...withZoneAndCategorie(Zone.europe, "generale", POLAND),
  ...withZoneAndCategorie(Zone.europe, "generale", RUSSIA),
  ...withZoneAndCategorie(Zone.europe, "generale", UKRAINE),
  ...withZoneAndCategorie(Zone.amerique, "generale", BRAZIL),
  ...withZoneAndCategorie(Zone.amerique, "generale", CANADA),
  ...withZoneAndCategorie(Zone.amerique, "generale", MEXICO),
  ...withZoneAndCategorie(Zone.amerique, "generale", UNITED_STATES),
  ...withZoneAndCategorie(Zone.afrique, "generale", CAMEROUN),
  ...withZoneAndCategorie(Zone.afrique, "generale", NIGERIA),
  ...withZoneAndCategorie(Zone.afrique, "generale", SOUTH_AFRICA),
  ...withZoneAndCategorie(Zone.afrique, "generale", SENEGAL),
  ...withZoneAndCategorie(Zone.afrique, "generale", COTE_D_IVOIRE),
  ...withZoneAndCategorie(Zone.afrique, "generale", RDC),
  ...withZoneAndCategorie(Zone.afrique, "generale", MAROC),
  ...withZoneAndCategorie(Zone.afrique, "generale", ALGERIE),
  ...withZoneAndCategorie(Zone.afrique, "generale", TUNISIE),
  ...withZoneAndCategorie(Zone.afrique, "generale", KENYA),
  ...withZoneAndCategorie(Zone.afrique, "generale", EGYPTE),
  ...withZoneAndCategorie(Zone.afrique, "generale", GHANA),
  ...withZoneAndCategorie(Zone.afrique, "generale", RWANDA),
  ...withZoneAndCategorie(Zone.afrique, "generale", AFRIQUE_GENERALISTE),
  ...withZoneAndCategorie(Zone.afrique, "economie", AGENCE_ECOFIN),
  ...withZoneAndCategorie(Zone.international, "generale", INTERNATIONAL),
];

async function main() {
  const admin = await db.user.findUnique({ where: { mail: SEED_ADMIN_MAIL } });
  if (!admin) {
    console.error("Aucun admin trouvé. Lance d'abord le seed admin (npx ts-node prisma/seed.ts).");
    return;
  }

  // Résout tous les codes de catégorie en id une seule fois
  const categories = await db.categorieFlux.findMany();
  const categorieIdByCode = new Map(categories.map((c) => [c.code, c.id_categorie]));

  if (categorieIdByCode.size === 0) {
    console.error("Aucune catégorie trouvée. Lance d'abord npx ts-node prisma/seed-categories.ts.");
    return;
  }

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const feed of CURATED_FEEDS) {
    const existing = await db.flux.findUnique({ where: { lien_rss: feed.lien_rss } });
    if (existing) {
      skipped++;
      continue;
    }

    const categorieId = feed.categorie ? categorieIdByCode.get(feed.categorie) : undefined;
    if (feed.categorie && !categorieId) {
      console.error(`Code de catégorie inconnu "${feed.categorie}" pour "${feed.nom}" — ajouté sans catégorie`);
    }

    try {
      const parsed = await parser.parseURL(feed.lien_rss);

      const flux = await db.flux.create({
        data: {
          nom: feed.nom,
          url_site: parsed.link ?? null,
          lien_rss: feed.lien_rss,
          logo: (parsed as any).image?.url ?? null,
          type: detectType(feed.lien_rss),
          zone: feed.zone ?? null,
          categorie_id: categorieId ?? null,
          is_suggestion: true,
          last_crawled_at: new Date(),
          created_by: admin.id_user,
        },
      });

      const articlesData = (parsed.items ?? [])
          .filter((item) => !!item.link)
          .map((item) => ({
            flux_id: flux.id_flux,
            titre: item.title ?? "Sans titre",
            lien: item.link as string,
            description: item.contentSnippet ?? item.content ?? null,
            date_publication: item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : null,
          }));

      if (articlesData.length > 0) {
        await db.article.createMany({ data: articlesData, skipDuplicates: true });
      }

      console.log(`Ajouté : ${feed.nom} [${feed.categorie ?? "sans catégorie"}] (${articlesData.length} articles)`);
      added++;
    } catch (err) {
      console.error(`Échec pour "${feed.nom}" (${feed.lien_rss}) :`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\n── Résumé ──`);
  console.log(`Total tenté : ${CURATED_FEEDS.length}`);
  console.log(`Ajoutés : ${added}`);
  console.log(`Déjà présents (ignorés) : ${skipped}`);
  console.log(`Échecs : ${failed}`);
}

main()
    .catch((err) => {
      console.error("Erreur pendant le seed des flux :", err);
      process.exit(1);
    })
    .finally(async () => {
      await db.$disconnect();
    });