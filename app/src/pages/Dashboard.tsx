import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Bell,
  BellPlus,
  ExternalLink,
  Flame,
  FolderPlus,
  FolderSearch,
  Link2,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { AlertFormDialog } from "@/components/AlertFormDialog"
import { FREQUENCE_LABELS, LANGUE_LABELS } from "@/lib/labels"
import { AlertResultsDialog } from "@/components/AlertsResultsDialog"
import { MarchesView } from "@/components/MarchesView"
import { DossierFormDialog } from "@/components/DossierFormDialog"
import { LinkToDossierDialog } from "@/components/LinkToDossierDialog"
import { RevuesDialog } from "@/components/RevuesDialog"
import { MainLayout } from "@/components/app/MainLayout"
import { ArticleGrid, type ArticleHandlers } from "@/components/app/articles"
import { isToday, type DisplayArticle } from "@/components/app/articleUtils"
import { VIEW_META, type SelectedView } from "@/components/app/navigation"
import {
  MButton,
  MCard,
  MCardHeader,
  MDialog,
  MEmpty,
  MHero,
  MInput,
  MPill,
  MSkeleton,
} from "@/components/mira/mira"
import { toast } from "@/components/mira/toast-manager"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { useRevealCount, useServerInfinite } from "@/hooks/useInfiniteReveal"
import { getFavoris, getAnnotes, updateArticleAnnotation, updateArticleFavori, updateArticleLu } from "@/lib/api/articles"
import {
  createAlerte,
  deleteAlerte,
  getAlertes,
  getAlerteResultats,
  marquerResultatLu,
  updateAlerte,
} from "@/lib/api/alerts"
import { ApiError } from "@/lib/api/client"
import { getFluxArticles, getFluxArticlesPage, getMyFluxes } from "@/lib/api/feeds"
import {
  createDossier,
  deleteDossier,
  getDossier,
  getDossiers,
  getDossierTimeline,
  linkAlerteToDossier,
  linkFluxToDossier,
  unlinkAlerteFromDossier,
  unlinkFluxFromDossier,
  updateDossier,
} from "@/lib/api/dossiers"
import type {
  Alerte,
  AlerteResultat,
  ArticleAnnote,
  ArticleFavori,
  Dossier,
  Flux,
  FluxArticle,
  Frequence,
  Langue,
  NombreResultats,
  TimelineEntry,
} from "@/lib/api/types"

/** Taille d'une tranche du défilement infini. */
const STEP = 12

function toDisplay(a: FluxArticle, feedId: string, feedName: string): DisplayArticle {
  return {
    id_article: a.id_article,
    feedId,
    feedName,
    title: a.titre,
    excerpt: a.description,
    imageUrl: a.image,
    url: a.lien,
    publishedAt: a.date_publication,
    read: a.lu,
    savedForLater: a.favori,
    annotation: a.note ?? null,
  }
}

function fromInteraction(a: ArticleFavori | ArticleAnnote): DisplayArticle {
  return {
    id_article: a.id_article,
    feedId: "",
    feedName: "",
    title: a.titre,
    excerpt: "",
    imageUrl: null,
    url: "lien" in a ? a.lien : "",
    publishedAt: "",
    read: true,
    savedForLater: a.favori,
    annotation: a.note,
  }
}

const sortedDesc = (list: DisplayArticle[]) =>
  [...list].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

function formatDate(iso: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

/** Vue demandée dans l'URL (liens des notifications push) : /?vue=alertes, /?vue=dossiers&dossier=… */
function viewFromSearch(search: string): SelectedView | null {
  const vue = new URLSearchParams(search).get("vue")
  if (vue === "alertes" || vue === "dossiers") return { type: vue }
  return null
}

export default function Dashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [selected, setSelected] = useState<SelectedView>(
    () => viewFromSearch(location.search) ?? (location.state as { view?: SelectedView } | null)?.view ?? { type: "today" }
  )
  const pendingDossierId = useRef(new URLSearchParams(location.search).get("dossier"))
  const [openArticle, setOpenArticle] = useState<DisplayArticle | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [revuesDialogOpen, setRevuesDialogOpen] = useState(false)

  const selectView = useCallback((view: SelectedView) => {
    setSelected(view)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, [])

  // --- Flux suivis, mis en cache (2 min) ---
  const { data: feedsData } = useCachedFetch<Flux[]>("feeds", getMyFluxes, 2 * 60 * 1000, [], 2 * 60 * 1000)
  const feeds = useMemo(() => feedsData ?? [], [feedsData])

  // --- Articles agrégés de tous les flux — utilisés pour « Aujourd'hui » ---
  const feedIds = useMemo(() => feeds.map((f) => f.id_flux).sort().join(","), [feeds])
  const { data: allArticlesData, loading: allArticlesLoading } = useCachedFetch<DisplayArticle[]>(
    `all-articles:${feedIds}`,
    () =>
      Promise.all(
        feeds.map((f) =>
          getFluxArticles(f.id_flux, { limit: 50 }).then((arts) => arts.map((a) => toDisplay(a, f.id_flux, f.nom)))
        )
      ).then((results) => results.flat()),
    2 * 60 * 1000,
    [feedIds],
    2 * 60 * 1000
  )
  const allArticles = useMemo(() => allArticlesData ?? [], [allArticlesData])

  // --- Articles d'un flux : pagination serveur cumulée au défilement ---
  const feedId = selected.type === "feed" ? selected.feedId : ""
  const feedName = selected.type === "feed" ? selected.feedName : ""
  const feedInfinite = useServerInfinite<DisplayArticle>(
    `feed:${feedId}`,
    async (page) => {
      const res = await getFluxArticlesPage(feedId, { page, limit: STEP })
      return { ...res, data: res.data.map((a) => toDisplay(a, feedId, feedName)) }
    },
    selected.type === "feed"
  )

  // --- « À lire plus tard » et « Annotées » : pagination serveur cumulée ---
  const favorisInfinite = useServerInfinite<DisplayArticle>(
    "favoris",
    async (page) => {
      const res = await getFavoris({ page, limit: STEP })
      return { data: res.data.map(fromInteraction), total: res.pagination.total, totalPages: res.pagination.totalPages }
    },
    selected.type === "later"
  )
  const annotesInfinite = useServerInfinite<DisplayArticle>(
    "annotes",
    async (page) => {
      const res = await getAnnotes({ page, limit: STEP })
      return { data: res.data.map(fromInteraction), total: res.pagination.total, totalPages: res.pagination.totalPages }
    },
    selected.type === "annotated"
  )

  // --- Favoris préchargés au montage (état « à lire plus tard » partout + compteur) ---
  const [favorisTotal, setFavorisTotal] = useState(0)
  const [favoriIds, setFavoriIds] = useState<Set<string>>(new Set())
  const [favoriNotes, setFavoriNotes] = useState<Record<string, string | null>>({})

  useEffect(() => {
    async function loadAllFavoris() {
      let page = 1
      let all: ArticleFavori[] = []
      let total: number
      while (true) {
        const res = await getFavoris({ page, limit: 100 })
        all = all.concat(res.data)
        total = res.pagination.total
        if (all.length >= res.pagination.total || res.data.length === 0) break
        page++
      }
      setFavoriIds(new Set(all.map((a) => a.id_article)))
      setFavoriNotes(Object.fromEntries(all.map((a) => [a.id_article, a.note])))
      setFavorisTotal(total)
    }
    loadAllFavoris().catch(() => {})
  }, [])

  const [annotesTotal, setAnnotesTotal] = useState(0)
  useEffect(() => {
    getAnnotes({ page: 1, limit: 1 })
      .then((res) => setAnnotesTotal(res.pagination.total))
      .catch(() => {})
  }, [])

  // --- Surcharges locales : reflètent un clic immédiat en attendant le
  // prochain refetch, et retombent sur la valeur serveur sinon.
  const [localReadOverrides, setLocalReadOverrides] = useState<Record<string, boolean>>({})
  const [localAnnotations, setLocalAnnotations] = useState<Record<string, string | null>>({})
  const [localFavoris, setLocalFavoris] = useState<Record<string, boolean>>({})

  const enrich = useCallback(
    (a: DisplayArticle): DisplayArticle => ({
      ...a,
      read: localReadOverrides[a.id_article] ?? a.read,
      savedForLater: localFavoris[a.id_article] ?? (favoriIds.has(a.id_article) || a.savedForLater),
      annotation:
        a.id_article in localAnnotations
          ? localAnnotations[a.id_article]
          : (favoriNotes[a.id_article] ?? a.annotation),
    }),
    [localReadOverrides, localFavoris, favoriIds, localAnnotations, favoriNotes]
  )

  const todayArticles = useMemo(
    () => sortedDesc(allArticles.filter((a) => isToday(a.publishedAt))).map(enrich),
    [allArticles, enrich]
  )
  const todayReveal = useRevealCount(todayArticles.length, STEP, "today")
  const feedArticles = useMemo(() => feedInfinite.items.map(enrich), [feedInfinite.items, enrich])
  const favorisArticles = useMemo(() => favorisInfinite.items.map(enrich), [favorisInfinite.items, enrich])
  const annotesArticles = useMemo(() => annotesInfinite.items.map(enrich), [annotesInfinite.items, enrich])

  // --- Alertes, mises en cache (1 min) ---
  const { data: alertesData, loading: alertesLoading, refresh: refreshAlertes } = useCachedFetch<Alerte[]>(
    "alertes",
    getAlertes,
    60 * 1000
  )
  const alertes = useMemo(() => alertesData ?? [], [alertesData])

  const [alertResults, setAlertResults] = useState<AlerteResultat[]>([])
  const [alertResultsLoading, setAlertResultsLoading] = useState(false)
  const [alertFormOpen, setAlertFormOpen] = useState(false)
  const [editingAlerte, setEditingAlerte] = useState<Alerte | null>(null)
  const [viewingResultsFor, setViewingResultsFor] = useState<Alerte | null>(null)
  const [alertSearch, setAlertSearch] = useState("")

  function openAlertResults(alerte: Alerte | null) {
    setViewingResultsFor(alerte)
    setAlertResults([])
    if (!alerte) return
    setAlertResultsLoading(true)
    getAlerteResultats(alerte.id_alerte, { page: 1, limit: 50 })
      .then((res) => setAlertResults(res.data))
      .catch(() => toast.add({ title: "Impossible de charger les résultats", type: "error" }))
      .finally(() => setAlertResultsLoading(false))
  }

  const filteredAlertes = useMemo(
    () => alertes.filter((a) => a.mot_cle.toLowerCase().includes(alertSearch.toLowerCase())),
    [alertes, alertSearch]
  )

  // --- Dossiers, mis en cache (2 min) ---
  const { data: dossiersData, loading: dossiersLoading, refresh: refreshDossiers } = useCachedFetch<Dossier[]>(
    "dossiers",
    getDossiers,
    2 * 60 * 1000
  )
  const dossiers = useMemo(() => dossiersData ?? [], [dossiersData])

  const [dossierFormOpen, setDossierFormOpen] = useState(false)
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null)
  const [viewingDossier, setViewingDossier] = useState<Dossier | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [dossierSearch, setDossierSearch] = useState("")
  const [dossierDetail, setDossierDetail] = useState<Dossier | null>(null)

  function openDossier(dossier: Dossier | null) {
    setViewingDossier(dossier)
    setTimeline([])
    setDossierDetail(null)
    if (!dossier) return
    setTimelineLoading(true)
    getDossierTimeline(dossier.id_dossier, { page: 1, limit: 30 })
      .then((res) => setTimeline(res.timeline))
      .catch(() => toast.add({ title: "Impossible de charger la timeline", type: "error" }))
      .finally(() => setTimelineLoading(false))
    getDossier(dossier.id_dossier)
      .then(setDossierDetail)
      .catch(() => toast.add({ title: "Impossible de charger le dossier", type: "error" }))
  }

  // Notification d'enquête : on ouvre le dossier concerné dès que la liste est chargée
  useEffect(() => {
    const id = pendingDossierId.current
    if (!id || !dossiersData) return
    pendingDossierId.current = null
    const dossier = dossiersData.find((d) => d.id_dossier === id)
    if (dossier) openDossier(dossier)
  }, [dossiersData])

  // Paramètres de notification consommés : on nettoie l'URL
  useEffect(() => {
    if (location.search && viewFromSearch(location.search)) navigate("/", { replace: true })
  }, [location.search, navigate])

  const linkedAlerteIds = useMemo(() => new Set((dossierDetail?.alertes ?? []).map((a) => a.alerte_id)), [dossierDetail])
  const linkedFluxIds = useMemo(() => new Set((dossierDetail?.flux ?? []).map((f) => f.flux_id)), [dossierDetail])

  const filteredDossiers = useMemo(
    () =>
      dossiers.filter(
        (d) =>
          d.nom.toLowerCase().includes(dossierSearch.toLowerCase()) ||
          (d.description ?? "").toLowerCase().includes(dossierSearch.toLowerCase())
      ),
    [dossiers, dossierSearch]
  )

  const counts = useMemo(
    () => ({
      today: todayArticles.filter((a) => !a.read).length,
      later: favorisTotal,
      annotated: annotesTotal,
      alertes: alertes.length,
      dossiers: dossiers.length,
    }),
    [todayArticles, favorisTotal, annotesTotal, alertes, dossiers]
  )

  // --- Actions sur les articles ---
  async function toggleRead(id_article: string, currentRead: boolean, e: React.MouseEvent) {
    e.stopPropagation()
    const next = !currentRead
    setLocalReadOverrides((prev) => ({ ...prev, [id_article]: next }))
    try {
      await updateArticleLu(id_article, next)
    } catch {
      setLocalReadOverrides((prev) => ({ ...prev, [id_article]: currentRead }))
      toast.add({ title: "Erreur", description: "Impossible de marquer l’article", type: "error" })
    }
  }

  async function toggleSavedForLater(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const current = localFavoris[id] ?? favoriIds.has(id)
    const next = !current
    const applyFavori = (value: boolean) => {
      setLocalFavoris((prev) => ({ ...prev, [id]: value }))
      setFavoriIds((prev) => {
        const updated = new Set(prev)
        if (value) updated.add(id)
        else updated.delete(id)
        return updated
      })
    }
    applyFavori(next)
    setFavorisTotal((prev) => (next ? prev + 1 : Math.max(0, prev - 1)))
    try {
      await updateArticleFavori(id, next)
      if (selected.type === "later" && !next) await favorisInfinite.refresh()
    } catch {
      applyFavori(current)
      setFavorisTotal((prev) => (current ? prev + 1 : Math.max(0, prev - 1)))
      toast.add({ title: "Erreur", description: "Impossible de mettre à jour le favori", type: "error" })
    }
  }

  async function saveAnnotation(id: string) {
    const note = noteDraft.trim() || null
    const hadNote = !!(localAnnotations[id] ?? favoriNotes[id])
    try {
      await updateArticleAnnotation(id, note)
      setLocalAnnotations((prev) => ({ ...prev, [id]: note }))
      setAnnotesTotal((prev) => (note ? prev + (hadNote ? 0 : 1) : Math.max(0, prev - (hadNote ? 1 : 0))))
      toast.add({ title: "Note enregistrée", type: "success" })
      setOpenNoteId(null)
      if (selected.type === "annotated") await annotesInfinite.refresh()
    } catch {
      toast.add({ title: "Erreur", description: "Impossible d’enregistrer la note", type: "error" })
    }
  }

  async function handleOpenArticle(article: DisplayArticle) {
    setOpenArticle(article)
    if (!article.read) {
      setLocalReadOverrides((prev) => ({ ...prev, [article.id_article]: true }))
      // pas de rollback : l'article vient d'être ouvert, on le garde marqué lu
      updateArticleLu(article.id_article, true).catch(() => {})
    }
  }

  const handlers: ArticleHandlers = {
    onOpen: handleOpenArticle,
    onToggleRead: toggleRead,
    onToggleSaved: toggleSavedForLater,
    openNoteId,
    onOpenNoteChange: setOpenNoteId,
    noteDraft,
    onNoteDraftChange: setNoteDraft,
    onSaveAnnotation: saveAnnotation,
  }

  // --- Alertes ---
  async function handleAlertFormSubmit(values: {
    mot_cle: string
    frequence: Frequence
    langue: Langue
    pays: string
    nombre_resultats: NombreResultats
  }) {
    const payload = { ...values, pays: values.pays || undefined }
    try {
      if (editingAlerte) {
        await updateAlerte(editingAlerte.id_alerte, payload)
        toast.add({ title: "Alerte mise à jour", type: "success" })
      } else {
        const created = await createAlerte(payload)
        toast.add({ title: "Alerte créée", description: created.mot_cle, type: "success" })
      }
      await refreshAlertes()
      setAlertFormOpen(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Ce mot-clé a déjà une alerte active"
            : err.status === 429
              ? "Tu as atteint la limite d’alertes actives"
              : err.message
          : "Impossible de contacter le serveur"
      toast.add({ title: "Erreur", description: message, type: "error" })
      throw err
    }
  }

  async function handleDeleteAlert(alerte: Alerte) {
    try {
      await deleteAlerte(alerte.id_alerte)
      await refreshAlertes()
      toast.add({ title: "Alerte supprimée", description: alerte.mot_cle, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de supprimer l’alerte", type: "error" })
    }
  }

  async function handleMarkResultRead(resultatId: string) {
    if (!viewingResultsFor) return
    try {
      await marquerResultatLu(viewingResultsFor.id_alerte, resultatId)
      setAlertResults((prev) => prev.map((r) => (r.id_resultat === resultatId ? { ...r, lu: true } : r)))
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de marquer comme lu", type: "error" })
    }
  }

  // --- Dossiers ---
  async function handleDossierFormSubmit(values: { nom: string; description: string }) {
    try {
      if (editingDossier) {
        await updateDossier(editingDossier.id_dossier, values)
        toast.add({ title: "Dossier mis à jour", type: "success" })
      } else {
        const created = await createDossier(values)
        toast.add({ title: "Dossier créé", description: created.nom, type: "success" })
      }
      await refreshDossiers()
      setDossierFormOpen(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Ce nom de dossier est déjà utilisé"
            : err.message
          : "Impossible de contacter le serveur"
      toast.add({ title: "Erreur", description: message, type: "error" })
      throw err
    }
  }

  async function handleDeleteDossier(dossier: Dossier) {
    try {
      await deleteDossier(dossier.id_dossier)
      await refreshDossiers()
      toast.add({ title: "Dossier supprimé", description: dossier.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de supprimer le dossier", type: "error" })
    }
  }

  async function refreshDossierAfterLinkChange() {
    if (!viewingDossier) return
    const [timelineRes, dossierRes] = await Promise.all([
      getDossierTimeline(viewingDossier.id_dossier, { page: 1, limit: 30 }),
      getDossier(viewingDossier.id_dossier),
    ])
    setTimeline(timelineRes.timeline)
    setDossierDetail(dossierRes)
  }

  async function runLinkAction(action: () => Promise<unknown>, success: string, failure: string) {
    if (!viewingDossier) return
    try {
      await action()
      toast.add({ title: success, type: "success" })
      await refreshDossierAfterLinkChange()
    } catch (err) {
      toast.add({ title: "Erreur", description: err instanceof ApiError ? err.message : failure, type: "error" })
    }
  }
  const dossierId = viewingDossier?.id_dossier ?? ""
  const handleLinkAlerte = (id: string) =>
    runLinkAction(() => linkAlerteToDossier(dossierId, id), "Alerte liée", "Impossible de lier l’alerte")
  const handleUnlinkAlerte = (id: string) =>
    runLinkAction(() => unlinkAlerteFromDossier(dossierId, id), "Alerte déliée", "Impossible de délier l’alerte")
  const handleLinkFlux = (id: string) =>
    runLinkAction(() => linkFluxToDossier(dossierId, id), "Flux lié", "Impossible de lier le flux")
  const handleUnlinkFlux = (id: string) =>
    runLinkAction(() => unlinkFluxFromDossier(dossierId, id), "Flux délié", "Impossible de délier le flux")

  // --- En-tête de vue ---
  const meta = VIEW_META[selected.type]
  const hero = (() => {
    switch (selected.type) {
      case "today":
        return {
          title: "Aujourd’hui.",
          subtitle: `${counts.today} article${counts.today > 1 ? "s" : ""} non lu${counts.today > 1 ? "s" : ""}.`,
          stats: [
            { value: allArticlesLoading && !allArticlesData ? "…" : todayArticles.length, label: "Publiés", dot: "bg-m-ink" },
            { value: feeds.length, label: "Flux suivis", dot: "bg-m-ring" },
            { value: favorisTotal, label: "À lire", dot: "bg-m-green" },
          ],
        }
      case "feed":
        return {
          title: `${feedName}.`,
          subtitle: meta.description,
          stats: [{ value: feedInfinite.initialLoading ? "…" : feedInfinite.total, label: "Articles", dot: "bg-m-ink" }],
        }
      case "later":
        return { title: "À lire plus tard.", subtitle: meta.description, stats: [{ value: favorisTotal, label: "Articles", dot: "bg-m-green" }] }
      case "annotated":
        return { title: "Annotées.", subtitle: meta.description, stats: [{ value: annotesTotal, label: "Notes", dot: "bg-m-green" }] }
      case "alertes":
        return { title: "Alertes.", subtitle: meta.description, stats: [{ value: alertes.length, label: "Actives", dot: "bg-m-orange" }] }
      case "dossiers":
        return viewingDossier
          ? { title: `${viewingDossier.nom}.`, subtitle: viewingDossier.description || "Timeline de l’enquête." }
          : { title: "Enquêtes.", subtitle: meta.description, stats: [{ value: dossiers.length, label: "Dossiers", dot: "bg-m-ink" }] }
      default:
        return { title: `${meta.title}.`, subtitle: meta.description }
    }
  })()

  const emptyState = (text: string, action?: React.ReactNode) => (
    <MCard className="items-center py-14 text-center">
      <p className="max-w-sm text-sm text-m-soft">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </MCard>
  )

  return (
    <MainLayout active={selected} onSelectView={selectView} counts={counts}>
      <MHero title={hero.title} subtitle={hero.subtitle} stats={"stats" in hero ? hero.stats : undefined} />

      {selected.type === "today" && (
        <ArticleGrid
          articles={todayArticles.slice(0, todayReveal.visible)}
          handlers={handlers}
          loading={allArticlesLoading && !allArticlesData}
          hasMore={todayReveal.hasMore}
          onReveal={todayReveal.revealMore}
          step={STEP}
          empty={emptyState(
            feeds.length === 0
              ? "Tu ne suis encore aucun flux. Ajoute une source avec le bouton + de la barre latérale."
              : "Aucun article publié aujourd’hui pour l’instant dans tes flux."
          )}
        />
      )}

      {selected.type === "feed" && (
        <ArticleGrid
          articles={feedArticles}
          handlers={handlers}
          loading={feedInfinite.initialLoading}
          hasMore={feedInfinite.hasMore}
          onReveal={feedInfinite.loadMore}
          groupByDate
          step={STEP}
          empty={emptyState("Aucun article pour ce flux.")}
        />
      )}

      {selected.type === "later" && (
        <ArticleGrid
          articles={favorisArticles}
          handlers={handlers}
          loading={favorisInfinite.initialLoading}
          hasMore={favorisInfinite.hasMore}
          onReveal={favorisInfinite.loadMore}
          step={STEP}
          empty={emptyState("Aucun article mis de côté. Utilise le signet sur un article pour le retrouver ici.")}
        />
      )}

      {selected.type === "annotated" && (
        <ArticleGrid
          articles={annotesArticles}
          handlers={handlers}
          loading={annotesInfinite.initialLoading}
          hasMore={annotesInfinite.hasMore}
          onReveal={annotesInfinite.loadMore}
          step={STEP}
          empty={emptyState("Aucun article annoté pour l’instant.")}
        />
      )}

      {selected.type === "marches" && <MarchesView />}

      {selected.type === "alertes" && (
        <MCard>
          <MCardHeader
            title="Mes alertes"
            subtitle="Clique sur une alerte pour voir ses derniers résultats."
            action={
              <MButton
                size="sm"
                onClick={() => {
                  setEditingAlerte(null)
                  setAlertFormOpen(true)
                }}
              >
                <BellPlus className="size-3.5!" /> Nouvelle alerte
              </MButton>
            }
          />
          <SearchField value={alertSearch} onChange={setAlertSearch} placeholder="Filtrer les alertes…" />
          <div className="mt-4 flex flex-col gap-2">
            {alertesLoading && alertes.length === 0 && <RowSkeletons />}
            {!alertesLoading && filteredAlertes.length === 0 && (
              <MEmpty>{alertSearch ? "Aucune alerte ne correspond" : "Aucune alerte pour l’instant"}</MEmpty>
            )}
            {filteredAlertes.map((alerte) => (
              <Row
                key={alerte.id_alerte}
                icon={<Bell className="size-4" />}
                title={alerte.mot_cle}
                meta={`${FREQUENCE_LABELS[alerte.frequence]} · ${LANGUE_LABELS[alerte.langue]}${alerte.pays ? ` · ${alerte.pays}` : ""}`}
                onClick={() => openAlertResults(alerte)}
                onEdit={() => {
                  setEditingAlerte(alerte)
                  setAlertFormOpen(true)
                }}
                onDelete={() => handleDeleteAlert(alerte)}
              />
            ))}
          </div>
        </MCard>
      )}

      {selected.type === "dossiers" &&
        (viewingDossier ? (
          <MCard>
            <MCardHeader
              title={
                <button
                  type="button"
                  onClick={() => openDossier(null)}
                  className="flex cursor-pointer items-center gap-2 hover:text-m-soft"
                >
                  <ArrowLeft className="size-5" /> Timeline
                </button>
              }
              subtitle={`${timeline.length} élément${timeline.length > 1 ? "s" : ""} issus des alertes et flux liés.`}
              action={
                <MButton size="sm" onClick={() => setLinkDialogOpen(true)}>
                  <Link2 className="size-3.5!" /> Lier alerte / flux
                </MButton>
              }
            />
            <div className="mt-6 flex flex-col gap-3">
              {timelineLoading && <RowSkeletons />}
              {!timelineLoading && timeline.length === 0 && (
                <MEmpty>Aucun élément pour l’instant. Lie une alerte ou un flux pour commencer.</MEmpty>
              )}
              {timeline.map((entry) => (
                <div key={entry.id} className="group relative">
                  <a
                    href={entry.lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex gap-4 rounded-[22px] bg-m-surface-2 p-3 pr-12 transition-colors hover:bg-m-surface-3"
                  >
                    {entry.image && (
                      <img src={entry.image} alt="" loading="lazy" className="size-20 shrink-0 rounded-2xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <MPill tone="white">{entry.sourceLabel}</MPill>
                        <MPill tone={entry.type === "alerte" ? "sand" : "neutral"}>
                          {entry.type === "alerte" ? "Alerte" : "Flux"}
                        </MPill>
                        {entry.signalFort && (
                          <MPill tone="peach">
                            <Flame className="size-3" /> Signal fort
                          </MPill>
                        )}
                        <span className="font-mono text-[11px] text-m-soft">{formatDate(entry.date)}</span>
                      </div>
                      <p className="mt-2 text-[15px] leading-snug font-medium">{entry.titre}</p>
                      <p className="mt-0.5 line-clamp-1 text-[13px] text-m-soft">{entry.description}</p>
                    </div>
                  </a>
                  <MButton
                    variant="white"
                    size="icon-sm"
                    aria-label="Délier"
                    title="Délier"
                    className="absolute top-3 right-3 opacity-100 transition-opacity hover:bg-m-peach hover:text-m-orange-text lg:opacity-0 lg:group-hover:opacity-100"
                    onClick={() => (entry.type === "alerte" ? handleUnlinkAlerte(entry.id) : handleUnlinkFlux(entry.id))}
                  >
                    <X />
                  </MButton>
                </div>
              ))}
            </div>
          </MCard>
        ) : (
          <MCard>
            <MCardHeader
              title="Mes dossiers"
              subtitle="Regroupe alertes et flux autour d’un sujet d’enquête."
              action={
                <MButton
                  size="sm"
                  onClick={() => {
                    setEditingDossier(null)
                    setDossierFormOpen(true)
                  }}
                >
                  <FolderPlus className="size-3.5!" /> Nouveau dossier
                </MButton>
              }
            />
            <SearchField value={dossierSearch} onChange={setDossierSearch} placeholder="Filtrer les dossiers…" />
            <div className="mt-4 flex flex-col gap-2">
              {dossiersLoading && dossiers.length === 0 && <RowSkeletons />}
              {!dossiersLoading && filteredDossiers.length === 0 && (
                <MEmpty>{dossierSearch ? "Aucun dossier ne correspond" : "Aucun dossier pour l’instant"}</MEmpty>
              )}
              {filteredDossiers.map((dossier) => (
                <Row
                  key={dossier.id_dossier}
                  icon={<FolderSearch className="size-4" />}
                  title={dossier.nom}
                  meta={dossier.description ?? undefined}
                  onClick={() => openDossier(dossier)}
                  onEdit={() => {
                    setEditingDossier(dossier)
                    setDossierFormOpen(true)
                  }}
                  onDelete={() => handleDeleteDossier(dossier)}
                />
              ))}
            </div>
          </MCard>
        ))}

      {/* Lecture d'un article */}
      <MDialog
        open={!!openArticle}
        onOpenChange={(open) => !open && setOpenArticle(null)}
        className="max-w-xl"
        media={
          openArticle?.imageUrl ? (
            <div className="-mx-2 -mt-2 aspect-[16/9] overflow-hidden rounded-2xl bg-m-surface-4">
              <img src={openArticle.imageUrl} alt="" className="size-full object-cover" />
            </div>
          ) : undefined
        }
        title={
          <span className="flex flex-col gap-2">
            <span className="flex items-center gap-2 font-mono text-[11px] font-normal tracking-normal text-m-soft">
              {openArticle?.feedName}
              {openArticle?.feedName && openArticle?.publishedAt && <span className="text-m-ring">·</span>}
              {openArticle?.publishedAt && formatDate(openArticle.publishedAt)}
            </span>
            {openArticle?.title}
          </span>
        }
        description={openArticle?.excerpt || undefined}
        footer={
          openArticle?.url ? (
            <MButton className="w-full" onClick={() => window.open(openArticle.url, "_blank", "noopener,noreferrer")}>
              Lire l’article original <ExternalLink />
            </MButton>
          ) : undefined
        }
      />

      <AlertFormDialog open={alertFormOpen} onOpenChange={setAlertFormOpen} editingAlerte={editingAlerte} onSubmit={handleAlertFormSubmit} />
      <AlertResultsDialog
        alerte={viewingResultsFor}
        results={alertResults}
        loading={alertResultsLoading}
        onOpenChange={(open) => !open && openAlertResults(null)}
        onMarkRead={handleMarkResultRead}
      />
      <DossierFormDialog
        open={dossierFormOpen}
        onOpenChange={setDossierFormOpen}
        editingDossier={editingDossier}
        onSubmit={handleDossierFormSubmit}
      />
      <LinkToDossierDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        availableAlertes={alertes}
        availableFeeds={feeds}
        linkedAlerteIds={linkedAlerteIds}
        linkedFluxIds={linkedFluxIds}
        onLinkAlerte={handleLinkAlerte}
        onUnlinkAlerte={handleUnlinkAlerte}
        onLinkFlux={handleLinkFlux}
        onUnlinkFlux={handleUnlinkFlux}
      />
      <RevuesDialog open={revuesDialogOpen} onOpenChange={setRevuesDialogOpen} dossiers={dossiers} feeds={feeds} />
    </MainLayout>
  )
}

/* ------------------------------------------------------------------ */

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mt-6">
      <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-m-muted" />
      <MInput
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-full pl-11"
      />
    </div>
  )
}

function Row({
  icon,
  title,
  meta,
  onClick,
  onEdit,
  onDelete,
}: {
  icon: React.ReactNode
  title: string
  meta?: string
  onClick: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-[22px] bg-m-surface-2 py-2 pr-2 pl-2 transition-colors hover:bg-m-surface-3">
      <button type="button" onClick={onClick} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-m-surface text-m-ink">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-medium">{title}</span>
          {meta && <span className="block truncate text-[12px] text-m-soft">{meta}</span>}
        </span>
      </button>
      <MButton variant="ghost" size="icon-sm" aria-label={`Modifier ${title}`} onClick={onEdit}>
        <Pencil className="size-3.5!" />
      </MButton>
      <MButton
        variant="ghost"
        size="icon-sm"
        aria-label={`Supprimer ${title}`}
        className="hover:bg-m-peach hover:text-m-orange-text"
        onClick={onDelete}
      >
        <Trash2 className="size-3.5!" />
      </MButton>
    </div>
  )
}

function RowSkeletons() {
  return (
    <>
      {Array.from({ length: 3 }, (_, i) => (
        <MSkeleton key={i} className="h-14 rounded-[22px]" />
      ))}
    </>
  )
}

