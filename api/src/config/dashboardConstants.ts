export const XAF_PEG_RATE = 655.957;

export const PAIRES_DEVISES_SUIVIES = [
    "EUR/USD",
    "EUR/GBP",
    "EUR/CHF",
    "EUR/CNY",
    "EUR/XAF",
    "USD/CNY",
    "USD/XAF",
    "GBP/USD",
    "USD/JPY",
    "EUR/JPY",
];

export const METAUX_SUIVIS: { type: string; symbol: string }[] = [
    { type: "or", symbol: "XAU" },
    { type: "argent", symbol: "XAG" },
    { type: "platine", symbol: "XPT" },
    { type: "palladium", symbol: "XPD" },
    { type: "cuivre", symbol: "HG" },
];

export const PETROLE_SUIVI: { type: string; code: string }[] = [
    { type: "petrole_wti", code: "WTI_USD" },
    { type: "petrole_brent", code: "BRENT_CRUDE_USD" },
];