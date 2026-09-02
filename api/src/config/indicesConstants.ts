export const INDICES_US_FINNHUB: { code: string; nom: string; symbol: string }[] = [
    { code: "SPX", nom: "S&P 500 (États-Unis)", symbol: "^GSPC" },
    { code: "DJI", nom: "Dow Jones (États-Unis)", symbol: "^DJI" },
    { code: "IXIC", nom: "Nasdaq Composite (États-Unis)", symbol: "^IXIC" },
];


export const INDICES_NON_US_TWELVEDATA: { code: string; nom: string; symbol: string }[] = [
    { code: "FCHI", nom: "CAC 40 (France)", symbol: "FCHI" },
    { code: "GDAXI", nom: "DAX (Allemagne)", symbol: "GDAXI" },
    { code: "FTSE", nom: "FTSE 100 (Royaume-Uni)", symbol: "FTSE" },
    { code: "N225", nom: "Nikkei 225 (Japon)", symbol: "N225" },
];

export const INDICES_BRVM: { code: string; nom: string; libelleSite: string }[] = [
    { code: "BRVM-30", nom: "BRVM 30", libelleSite: "BRVM-30" },
    { code: "BRVM-COMPOSITE", nom: "BRVM Composite", libelleSite: "BRVM - COMPOSITE" },
    { code: "BRVM-PRESTIGE", nom: "BRVM Prestige", libelleSite: "BRVM - PRESTIGE" },
    { code: "BRVM-PRINCIPAL", nom: "BRVM Principal", libelleSite: "BRVM - PRINCIPAL" },
];

export const BVMAC_INDEX = { code: "BVMAC-ALL-SHARE", nom: "BVMAC All Share Index" };

// Liste consolidée de tous les codes suivis utilisée par getDashboardKpis()
export const TOUS_LES_CODES_INDICES = [
    ...INDICES_US_FINNHUB.map((i) => i.code),
    ...INDICES_NON_US_TWELVEDATA.map((i) => i.code),
    ...INDICES_BRVM.map((i) => i.code),
    BVMAC_INDEX.code,
];