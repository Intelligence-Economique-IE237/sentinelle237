export const INDICE_ZONES: Record<string, string> = {
  SPX: "États-Unis",
  DJI: "États-Unis",
  IXIC: "États-Unis",
  FCHI: "Europe",
  GDAXI: "Europe",
  FTSE: "Europe",
  N225: "Asie",
  "BRVM-30": "Afrique de l'Ouest (UEMOA)",
  "BRVM-COMPOSITE": "Afrique de l'Ouest (UEMOA)",
  "BRVM-PRESTIGE": "Afrique de l'Ouest (UEMOA)",
  "BRVM-PRINCIPAL": "Afrique de l'Ouest (UEMOA)",
  "BVMAC-ALL-SHARE": "Afrique Centrale (CEMAC)",
}

export function getIndiceZone(code: string): string {
  return INDICE_ZONES[code] ?? "Autre"
}

// Ordre d'affichage préféré des zones (Afrique en premier, cohérent avec
// le contexte du projet)
export const ZONE_ORDER = [
  "Afrique de l'Ouest (UEMOA)",
  "Afrique Centrale (CEMAC)",
  "Europe",
  "États-Unis",
  "Asie",
  "Autre",
]
