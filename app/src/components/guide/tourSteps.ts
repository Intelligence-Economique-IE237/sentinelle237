/**
 * Étapes de la visite guidée. `target` correspond à un attribut
 * data-tour="…" posé dans l'interface. `action: "click"` attend que
 * l'utilisateur clique lui-même sur l'élément mis en avant.
 */
export type TourStep = {
  id: string
  target?: string
  title: string
  body: string
  /** Étape interactive : on avance quand l'utilisateur clique sur la cible */
  action?: "click"
  actionLabel?: string
  /** Élément de la sidebar : sur mobile, on ouvre le tiroir */
  sidebar?: boolean
  /** Rayon de la découpe autour de la cible */
  radius?: number
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "bienvenue",
    title: "Visite guidée de Sentinelle237",
    body: "En deux minutes, découvre où lire tes articles, comment surveiller un sujet et ouvrir une enquête. Tu peux quitter à tout moment avec Échap.",
  },
  {
    id: "aujourdhui",
    target: "nav-today",
    sidebar: true,
    radius: 999,
    title: "Ton fil du jour",
    body: "Tous les nouveaux articles de tes flux, du plus récent au plus ancien. Fais défiler : la suite se charge toute seule.",
  },
  {
    id: "ajout-flux",
    target: "flux-add",
    sidebar: true,
    radius: 999,
    title: "Ajoute des sources",
    body: "Ce bouton ouvre l’ajout d’un flux : colle l’adresse d’un site ou d’un flux RSS, ou pioche dans le catalogue de sources.",
  },
  {
    id: "flux-suivis",
    target: "flux-list",
    sidebar: true,
    radius: 22,
    title: "Tes flux, rangés par catégorie",
    body: "Clique sur un flux pour ne lire que lui. Son menu ⋯ permet de l’épingler en haut de la liste ou de ne plus le suivre.",
  },
  {
    id: "plus-tard",
    target: "nav-later",
    sidebar: true,
    radius: 999,
    title: "Garde le meilleur de côté",
    body: "Sur chaque article, mets-le de côté pour plus tard ou ajoute une note : tu le retrouves ici et dans « Annotées ».",
  },
  {
    id: "alertes-nav",
    target: "nav-alertes",
    sidebar: true,
    radius: 999,
    action: "click",
    actionLabel: "Clique sur « Alertes »",
    title: "Surveille un sujet",
    body: "Les alertes guettent un mot-clé pour toi, dans tes flux et sur le web.",
  },
  {
    id: "alertes-nouvelle",
    target: "alertes-new",
    radius: 999,
    title: "Crée une alerte",
    body: "Un mot-clé, par exemple « économie camerounaise », et Sentinelle cherche en continu. Tu es prévenu par e-mail et, si tu les actives, par notification.",
  },
  {
    id: "enquetes-nav",
    target: "nav-dossiers",
    sidebar: true,
    radius: 999,
    action: "click",
    actionLabel: "Clique sur « Enquêtes »",
    title: "Passe à l’enquête",
    body: "Les dossiers d’enquête rassemblent alertes et flux autour d’un même sujet.",
  },
  {
    id: "enquetes-nouveau",
    target: "dossiers-new",
    radius: 999,
    title: "Ouvre un dossier",
    body: "Relie-lui des alertes et des flux : la timeline réunit tout au même endroit, et tu peux en tirer une revue de presse en PDF.",
  },
  {
    id: "recherche",
    target: "header-search",
    radius: 999,
    title: "Recherche multilingue",
    body: "Cherche dans tes flux et sur le web : ta requête est traduite automatiquement dans la langue choisie. Raccourci : Ctrl K.",
  },
  {
    id: "tableau-de-bord",
    target: "nav-secondary",
    sidebar: true,
    radius: 22,
    title: "Chiffres et marchés",
    body: "Le tableau de bord résume ta veille ; « Marchés » suit les devises, les indices et les matières premières.",
  },
  {
    id: "compte",
    target: "user-menu",
    radius: 999,
    title: "Ton compte",
    body: "Profil, double authentification, notifications push… Et cette visite, à relancer quand tu veux depuis ce menu.",
  },
  {
    id: "fin",
    title: "Tu es prêt !",
    body: "Tu connais l’essentiel. Bonne veille sur Sentinelle237.",
  },
]
