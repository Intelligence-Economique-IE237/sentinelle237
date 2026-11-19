// Préparation des mots-clés pour la recherche d'articles (alertes, recherche avancée).
//
// Objectif : qu'une alerte « economie camerounaise » retrouve aussi
// « L'économie du Cameroun », « économique camerounais », etc.
//  - insensible à la casse et aux accents ;
//  - mots vides ignorés (de, du, la, the, of…) ;
//  - chaque mot réduit à une racine simple (camerounaise → cameroun) ;
//  - tous les mots doivent être présents, dans n'importe quel ordre.

const STOPWORDS = new Set([
  // français
  "le", "la", "les", "l", "un", "une", "des", "de", "du", "d", "au", "aux", "et", "ou", "en", "dans", "sur", "pour",
  "par", "avec", "sans", "sous", "que", "qui", "quoi", "ce", "cet", "cette", "ces", "son", "sa", "ses", "leur",
  "leurs", "est", "sont", "a", "plus", "moins", "entre", "vers", "chez",
  // anglais
  "the", "a", "an", "of", "and", "or", "in", "on", "for", "to", "with", "by", "at", "from", "is", "are",
]);

// Suffixes retirés, du plus long au plus court. Une seule suppression par mot,
// et la racine doit garder au moins 4 lettres.
const SUFFIXES = [
  "issements", "issement", "ements", "ement", "ations", "ation", "iennes", "ienne", "iens", "ien",
  "aises", "aise", "ais", "aines", "aine", "ains", "ain", "iques", "ique", "euses", "euse", "eurs", "eur",
  "ees", "ee", "es", "e", "s",
];

/** Minuscules, sans accents, ponctuation remplacée par des espaces. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function stem(word: string): string {
  for (const suffix of SUFFIXES) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 4) {
      return word.slice(0, -suffix.length);
    }
  }
  return word;
}

/**
 * Découpe une requête en racines à rechercher.
 * « Économie camerounaise » → ["economi", "cameroun"]
 */
export function keywordTerms(query: string): string[] {
  const words = normalizeText(query)
    .split(" ")
    .filter((w) => w.length >= 2 && !STOPWORDS.has(w));
  const terms = words.map((w) => (w.length >= 5 ? stem(w) : w));
  if (terms.length === 0) {
    // Requête composée uniquement de mots vides (« la une ») : on la garde telle quelle
    const brute = normalizeText(query);
    return brute ? [brute] : [];
  }
  return Array.from(new Set(terms));
}

// Caractères accentués et leur équivalent sans accent, pour normaliser côté
// PostgreSQL avec translate() (sans dépendre de l'extension unaccent).
// Les deux chaînes doivent avoir exactement la même longueur.
export const SQL_ACCENTS_FROM = "àáâãäåçèéêëìíîïñòóôõöùúûüýÿ";
export const SQL_ACCENTS_TO = "aaaaaaceeeeiiiinooooouuuuyy";
