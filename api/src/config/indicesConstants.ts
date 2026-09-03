export const INDICES_US_FINNHUB: { code: string; nom: string; symbol: string }[] = [
  { code: "SPX", nom: "S&P 500 (via ETF SPY)", symbol: "SPY" },
  { code: "DJI", nom: "Dow Jones (via ETF DIA)", symbol: "DIA" },
  { code: "IXIC", nom: "Nasdaq (via ETF QQQ)", symbol: "QQQ" },
];

export const INDICES_NON_US_SERPAPI: { code: string; nom: string; ticker: string }[] = [
  { code: "FCHI", nom: "CAC 40 (France)", ticker: "CAC40:INDEXEURO" },
  { code: "GDAXI", nom: "DAX (Allemagne)", ticker: "DAX:INDEXDB" },
  { code: "FTSE", nom: "FTSE 100 (Royaume-Uni)", ticker: "UKX:INDEXFTSE" },
  { code: "N225", nom: "Nikkei 225 (Japon)", ticker: "NI225:INDEXNIKKEI" },
];

// Noms exacts tels qu'affichés sur brvm.org/fr/indices
export const INDICES_BRVM: { code: string; nom: string; libelleSite: string }[] = [
  { code: "BRVM-30", nom: "BRVM 30", libelleSite: "BRVM-30" },
  { code: "BRVM-COMPOSITE", nom: "BRVM Composite", libelleSite: "BRVM - COMPOSITE" },
  { code: "BRVM-PRESTIGE", nom: "BRVM Prestige", libelleSite: "BRVM - PRESTIGE" },
  { code: "BRVM-PRINCIPAL", nom: "BRVM Principal", libelleSite: "BRVM - PRINCIPAL" },
];

export const BVMAC_INDEX = { code: "BVMAC-ALL-SHARE", nom: "BVMAC All Share Index" };

export const TOUS_LES_CODES_INDICES = [
  ...INDICES_US_FINNHUB.map((i) => i.code),
  ...INDICES_NON_US_SERPAPI.map((i) => i.code),
  ...INDICES_BRVM.map((i) => i.code),
  BVMAC_INDEX.code,
];