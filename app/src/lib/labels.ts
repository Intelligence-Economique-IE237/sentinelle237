import type { Frequence, Langue } from "@/lib/api/types"

export const FREQUENCE_LABELS: Record<Frequence, string> = {
  immediat: "Immédiat",
  quotidien: "Digest quotidien",
  hebdomadaire: "Digest hebdomadaire",
}

export const LANGUE_LABELS: Record<Langue, string> = {
  toutes: "Toutes langues",
  fr: "Français",
  en: "Anglais",
  es: "Espagnol",
  zh: "Chinois",
  hi: "Hindi",
  ar: "Arabe",
  pt: "Portugais",
  ru: "Russe",
  ja: "Japonais",
  de: "Allemand",
}
