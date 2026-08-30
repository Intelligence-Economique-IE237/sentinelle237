// --- Auth ---
export interface User {
  id_user: string
  pseudo: string
  mail: string
  verified: boolean
  role: string
  offre: string
  pays?: string
  ville?: string
  totp_enabled: boolean
}

export interface RegisterPayload {
  pseudo: string
  mail: string
  password: string
  pays: string
  ville: string
}

export interface RegisterResponse {
  message: string
  user: User
}

export interface MessageResponse {
  message: string
}

export interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

// --- Flux ---
export type FluxType = "rss" | "x" | "youtube" | "telegram"

export interface Categorie {
  code: string
  nom: string
}

export interface Flux {
  id_flux: string
  nom: string
  lien_rss: string
  url_site: string
  type: FluxType
  categorie_id: string | null
  zone: string | null
  logo: string | null
  is_suggestion: boolean
  last_crawled_at: string | null
  createdAt: string
  updatedAt: string
  created_by: string
  isEpingle: boolean
}

export interface AddFluxPayload {
  identifiant: string
  type?: FluxType
  nom?: string
  categorie?: string // code de catégorie, optionnel
}

export interface AddFluxResponse {
  flux: Flux
  articles: unknown[]
  total: number
  alreadyExisted: boolean
}

export interface FluxSuggestion extends Flux {
  isSubscribed: boolean
}

// --- Alertes ---
export type Frequence = "immediat" | "quotidien" | "hebdomadaire"
export type Langue =
  | "toutes"
  | "fr"
  | "en"
  | "es"
  | "zh"
  | "hi"
  | "ar"
  | "pt"
  | "ru"
  | "ja"
  | "de"
export type NombreResultats = "meilleurs" | "tous"

export interface Alerte {
  id_alerte: string
  mot_cle: string
  frequence: Frequence
  langue: Langue
  pays: string | null
  nombre_resultats: NombreResultats
  envoye_a: string
}

export interface CreateAlertePayload {
  mot_cle: string
  frequence?: Frequence
  langue?: Langue
  pays?: string
  nombre_resultats?: NombreResultats
}

export type UpdateAlertePayload = Partial<CreateAlertePayload>

export interface AlerteResultat {
  id_resultat: string
  titre: string
  description: string
  lien: string
  source: "flux" | "web"
  lu: boolean
  date_publication: string
}

// --- Dossiers (OSINT) ---
export interface DossierAlerteLink {
  id_dossier_alerte: string
  dossier_id: string
  alerte_id: string
  createdAt: string
}

export interface DossierFluxLink {
  id_dossier_flux: string
  dossier_id: string
  flux_id: string
  createdAt: string
}

export interface Dossier {
  id_dossier: string
  nom: string
  description: string | null
  alertes?: DossierAlerteLink[]
  flux?: DossierFluxLink[]
}

export interface CreateDossierPayload {
  nom: string
  description?: string
}

export type UpdateDossierPayload = Partial<CreateDossierPayload>

export interface TimelineEntry {
  type: "alerte" | "flux"
  id: string
  titre: string
  lien: string
  description: string
  image: string | null
  date: string
  sourceLabel: string
  signalFort: boolean
}

export interface TimelineResponse {
  timeline: TimelineEntry[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}

export interface FluxArticle {
  id_article: string
  titre: string
  lien: string
  description: string
  image: string | null
  date_publication: string
  lu: boolean
}


export interface CategorieFlux {
  id_categorie: string
  code: string
  libelle: string
  couleur: string
  description: string | null
}

export interface ArticleFavori {
  id_article: string
  titre: string
  lien: string
  note: string | null
  favori: boolean
}

export interface ArticleDetail {
  id_article: string
  titre: string
  lien: string
  description: string
  categorie: string
  resume: string
  note: string | null
  favori: boolean
}

export interface ArticleAnnote {
  id_article: string
  titre: string
  note: string | null
  favori: boolean
}

export interface CorpusInterneResult {
  id_article: string
  titre: string
  lien: string
  flux_id: string
}

export interface WebSearchResult {
  titre: string
  lien: string
  description: string
  date_publication: string
}

export interface RechercheAvanceePayload {
  requete: string
  langue_source: Langue
  langue_cible: Langue
  pays?: string
}

export interface RechercheAvanceeResponse {
  requete_originale: string
  requete_traduite: string
  corpus_interne: CorpusInterneResult[]
  web: Record<string, WebSearchResult[]>
  webIndisponible: boolean
}

export interface ModeleRevue {
  id_modele: string
  nom: string
  chemin_fichier: string
}

export interface Revue {
  id_revue: string
  titre: string
  chemin_fichier: string
}

export interface GenererRevuePayload {
  modele_id: string
  titre: string
  dossier_id?: string
  flux_ids?: string[]
}

export interface UpdateMePayload {
  pseudo?: string
  pays?: string
  ville?: string
  currentPassword?: string
  newPassword?: string
}

export interface AdminUpdateUserPayload {
  pseudo?: string
  pays?: string
  ville?: string
  role?: "admin" | "veilleur"
  activated?: boolean
  offre?: "community" | "entreprise"
}

export interface TotpEnableStartResponse {
  qrCode: string
  otpauthUrl: string
}

export interface TotpEnableConfirmResponse {
  message: string
  recoveryCodes: string[]
}

export interface TotpRegenerateResponse {
  recoveryCodes: string[]
}

export interface TotpRemainingResponse {
  remaining: number
}

export type MatierePremiere =
  | "or"
  | "argent"
  | "platine"
  | "palladium"
  | "cuivre"
  | "petrole_wti"
  | "petrole_brent"

export interface CoursDevise {
  paire: string
  taux: number
  variation_24h: number | null
  recorded_at: string
}

export interface CoursMatiere {
  matiere: MatierePremiere
  prix: number
  devise: string
  variation_24h: number | null
  recorded_at: string
}

export interface DashboardKpis {
  devises: CoursDevise[]
  matieres: CoursMatiere[]
}

export interface HistoriqueCoursItem {
  id_cours: string
  matiere: MatierePremiere
  prix: number
  devise: string
  variation_24h: number | null
  recorded_at: string
}

export interface HistoriqueMatiereResponse {
  historique: HistoriqueCoursItem[]
  pagination: { total: number; page: number; limit: number; totalPages: number }
}


export type UserRole = "veilleur" | "admin"

export interface AdminUser {
  id_user: string
  pseudo: string
  mail: string
  role: UserRole
  pays: string | null
  ville: string | null
  verified: boolean
  activated: boolean
  totp_enabled: boolean
  offre: string
  createdAt: string
  updatedAt: string
}

export interface AdminUserListParams {
  page?: number
  limit?: number
  role?: UserRole
  offre?: string
  activated?: boolean
  verified?: boolean
  search?: string
}

export interface AdminUserListResponse {
  users: AdminUser[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface AdminUserUpdatePayload {
  role?: UserRole
  activated?: boolean
  offre?: string
  pseudo?: string
  pays?: string
  ville?: string
}

// --- Flux (vue admin) ---
export interface AdminFluxItem {
  id_flux: string
  nom: string
  url_site: string
  lien_rss: string
  logo: string | null
  type: string
  zone: string
  categorie_id: string | null
  is_suggestion: boolean
  last_crawled_at: string | null
  created_by: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminFluxListParams {
  page?: number
  limit?: number
  type?: string
  categorie?: string
}

export interface AdminFluxListResponse {
  flux: AdminFluxItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface ImportOpmlPayload {
  opmlUrl?: string
  opmlContent?: string
  zone?: string
}

export interface ImportOpmlResponse {
  importedCount: number
  skippedCount: number
  errors?: string[]
}

export interface CategorieFluxPayload {
  code: string
  libelle: string
  couleur: string
  description?: string
}

export interface MlFeedbackPayload {
  texte: string
  label: string
  [key: string]: unknown
}