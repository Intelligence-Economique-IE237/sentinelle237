import { useEffect, useMemo, useState } from "react"
import type React from "react"
import {
  Gauge,
  AlertCircle,
  ArrowLeft,
  Bell,
  BellPlus,
  Bookmark,
  BookmarkCheck,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Flame,
  FolderPlus,
  FolderSearch,
  Inbox,
  LineChart,
  Link2,
  PenLine,
  Pencil,
  Rss,
  Trash2,
  Plus,
} from "lucide-react"
import { AlertFormDialog, FREQUENCE_LABELS, LANGUE_LABELS } from "@/components/AlertFormDialog"
import { AlertResultsDialog } from "@/components/AlertsResultsDialog"
import { AppSidebar, type SelectedView } from "@/components/app-sidebar"
import { MarchesView } from "@/components/MarchesView"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { getFavoris, getAnnotes, updateArticleAnnotation, updateArticleFavori, updateArticleLu  } from "@/lib/api/articles"
import {
  createAlerte,
  deleteAlerte,
  getAlertes,
  getAlerteResultats,
  marquerResultatLu,
  updateAlerte,
} from "@/lib/api/alerts"
import { ApiError } from "@/lib/api/client"
import { getFluxArticles, getMyFluxes } from "@/lib/api/feeds"
import type {
  Alerte,
  AlerteResultat,
  ArticleFavori,
  Flux,
  FluxArticle,
  Frequence,
  Langue,
  NombreResultats,
} from "@/lib/api/types"
import { DossierFormDialog } from "@/components/DossierFormDialog"
import { LinkToDossierDialog } from "@/components/LinkToDossierDialog"
import { RevuesDialog } from "@/components/RevuesDialog"
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
import type { Dossier, TimelineEntry } from "@/lib/api/types"
import UserDashboard from "@/components/UserDashboardView"
// --- Forme d'article unifiee pour l'affichage (peu importe la source) ---
interface DisplayArticle {
  id_article: string
  feedId: string
  feedName: string
  title: string
  excerpt: string
  imageUrl: string | null
  url: string
  publishedAt: string
  read: boolean
  savedForLater: boolean
  annotation: string | null
}

const PAGE_SIZE = 10

type SectionMetaEntry = {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}

const SECTION_META: Record<SelectedView["type"], SectionMetaEntry> = {
  today: {
    icon: Inbox,
    title: "Aujourd'hui",
    description: "Articles publies aujourd'hui, tous flux confondus",
  },
  later: {
    icon: Clock,
    title: "A lire plus tard",
    description: "Tes articles favoris",
  },
  annotated: {
    icon: Bookmark,
    title: "Annotees",
    description: "Articles sur lesquels tu as laisse une note",
  },
  alertes: {
    icon: AlertCircle,
    title: "Alertes",
    description: "Resultats de tes alertes mots-cles",
  },
  dossiers: {
    icon: FolderSearch,
    title: "Enquetes",
    description: "Tes dossiers d'investigation",
  },
  marches: {
    icon: LineChart,
    title: "Marches",
    description: "Cours des devises et matieres premieres",
  },
  dashboard: {
    icon: Gauge,
    title: "Tableau de bord",
    description: "Tableau de board",
  },
  feed: {
    icon: Rss,
    title: "",
    description: "Tous les articles de cette source",
  },
}

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
    savedForLater: false,
    annotation: null,
  }
}

function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function dateSectionLabel(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  if (isSameDay(d, now)) return "Aujourd'hui"
  if (isSameDay(d, yesterday)) return "Hier"
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
}

function groupByDateSection(list: DisplayArticle[]) {
  const groups: { label: string; items: DisplayArticle[] }[] = []
  for (const article of list) {
    const label = dateSectionLabel(article.publishedAt)
    const existing = groups.find((g) => g.label === label)
    if (existing) {
      existing.items.push(article)
    } else {
      groups.push({ label, items: [article] })
    }
  }
  return groups
}

const sortedDesc = (list: DisplayArticle[]) =>
  [...list].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

function formatDate(iso: string) {
  if (!iso) return ""
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// --- Carte article - composant independant (jamais recree au render du parent) ---
interface ArticleCardProps {
  article: DisplayArticle
  onOpen: (article: DisplayArticle) => void
  onToggleRead: (id: string, e: React.MouseEvent) => void
  onToggleSaved: (id: string, e: React.MouseEvent) => void
  openNoteId: string | null
  onOpenNoteChange: (id: string | null) => void
  noteDraft: string
  onNoteDraftChange: (value: string) => void
  onSaveAnnotation: (id: string) => void
}

function ArticleCard({
  article,
  onOpen,
  onToggleRead,
  onToggleSaved,
  openNoteId,
  onOpenNoteChange,
  noteDraft,
  onNoteDraftChange,
  onSaveAnnotation,
}: ArticleCardProps) {
  return (
    <Card
      className="flex h-full cursor-pointer flex-col overflow-hidden pt-0 transition-shadow hover:shadow-md"
      onClick={() => onOpen(article)}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-muted">
        {article.imageUrl ? (
          <img src={article.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-muted-foreground/10">
            <Rss className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        {!article.read && (
          <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-background" />
        )}
      </div>

      <CardHeader className="gap-1.5 pb-2">
        <div className="flex items-center justify-between">
          {article.feedName && (
            <Badge variant="outline" className="min-w-0 max-w-[120px] shrink truncate">
              {article.feedName}
            </Badge>
          )}
          {article.publishedAt && (
            <span className="shrink-0 text-xs text-muted-foreground">{formatDate(article.publishedAt)}</span>
          )}
        </div>
        <CardTitle className="line-clamp-2 min-h-11 text-base leading-snug">
          {article.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between space-y-2 pb-3">
        {article.excerpt && (
          <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{article.excerpt}</p>
        )}

        <div className="mt-auto flex items-center gap-1 border-t pt-1.5" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => onToggleRead(article.id_article, e)}
            title={article.read ? "Marquer comme non lu" : "Marquer comme vu"}
          >
            {article.read ? (
              <Eye className="h-3 w-3 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3 w-3" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => onToggleSaved(article.id_article, e)}
            title={article.savedForLater ? "Retirer de plus tard" : "A lire plus tard"}
          >
            {article.savedForLater ? (
              <BookmarkCheck className="h-3 w-3 text-primary" />
            ) : (
              <Bookmark className="h-3 w-3" />
            )}
          </Button>

          <Popover
            open={openNoteId === article.id_article}
            onOpenChange={(open) => onOpenNoteChange(open ? article.id_article : null)}
          >
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onNoteDraftChange(article.annotation ?? "")}
                  title="Annoter"
                >
                  <PenLine className={article.annotation ? "h-3 w-3 text-primary" : "h-3 w-3"} />
                </Button>
              }
            />
            <PopoverContent className="w-64 space-y-2">
              <Textarea
                placeholder="Ta note sur cet article..."
                value={noteDraft}
                onChange={(e) => onNoteDraftChange(e.target.value)}
                rows={4}
              />
              <Button size="sm" className="w-full" onClick={() => onSaveAnnotation(article.id_article)}>
                Enregistrer
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </CardContent>
    </Card>
  )
}

function PaginationBar({
  currentPage,
  totalPages,
  onChange,
}: {
  currentPage: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => onChange(currentPage - 1)}>
        Precedent
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {currentPage} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === totalPages}
        onClick={() => onChange(currentPage + 1)}
      >
        Suivant
      </Button>
    </div>
  )
}

const gridStyle = { gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }

export default function Dashboard() {
  const [selected, setSelected] = useState<SelectedView>({ type: "today" })

  // const [selected, setSelected] = useState<SelectedView>({ type: "today" })
  const [openArticle, setOpenArticle] = useState<DisplayArticle | null>(null)
  const [displayArticle, setDisplayArticle] = useState<DisplayArticle | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [revuesDialogOpen, setRevuesDialogOpen] = useState(false)

  useEffect(() => {
    if (openArticle) setDisplayArticle(openArticle)
  }, [openArticle])

  // --- Flux suivis, mis en cache (2 min) ---
  const { data: feedsData } = useCachedFetch<Flux[]>(
    "feeds",
    getMyFluxes,
    2 * 60 * 1000,
    [],
    2 * 60 * 1000 // revalide automatiquement toutes les 2 min, sans spinner
  )
  const feeds = feedsData ?? []

  // --- Articles agreges de tous les flux - utilises pour "Aujourd'hui" ---
  const feedIds = useMemo(() => feeds.map((f) => f.id_flux).sort().join(","), [feeds])

  const { data: allArticlesData, loading: allArticlesLoading } = useCachedFetch<DisplayArticle[]>(
    `all-articles:${feedIds}`,
    () =>
      Promise.all(
        feeds.map((f) =>
          getFluxArticles(f.id_flux, { limit: 50 }).then((arts) =>
            arts.map((a) => toDisplay(a, f.id_flux, f.nom))
          )
        )
      ).then((results) => results.flat()),
    2 * 60 * 1000,
    [feedIds],
    2 * 60 * 1000
  )
  const allArticles = allArticlesData ?? []

useEffect(() => {
  const ids = allArticles.map((a) => a.id_article)
  const uniqueIds = new Set(ids)
  console.log("total articles:", ids.length, "— IDs uniques:", uniqueIds.size)
  if (ids.length !== uniqueIds.size) {
    console.warn("Des articles partagent le même id !", ids)
  }
}, [allArticles])

  const {
    data: feedArticlesRaw,
    loading: feedArticlesLoading,
  } = useCachedFetch(
    selected.type === "feed" ? `feed-articles:${selected.feedId}` : "feed-articles:none",
    () =>
      selected.type === "feed"
        ? getFluxArticles(selected.feedId, { limit: 50 })
        : Promise.resolve([]),
    2 * 60 * 1000,
    [selected]
  )
  const feedArticles = useMemo(
    () =>
      selected.type === "feed"
        ? feedArticlesRaw?.map((a) => toDisplay(a, selected.feedId, selected.feedName)) ?? []
        : [],
    [feedArticlesRaw, selected]
  )

  // --- Favoris ("A lire plus tard") - vraie pagination serveur ---
  const [favorisTotal, setFavorisTotal] = useState(0)
  const [favorisPage, setFavorisPage] = useState(1)

  const {
    data: favorisResult,
    loading: favorisLoading,
    refresh: refreshFavoris,
  } = useCachedFetch(
    `favoris:${favorisPage}`,
    () => getFavoris({ page: favorisPage, limit: PAGE_SIZE }),
    60 * 1000,
    [favorisPage]
  )
  const favoris = favorisResult?.data ?? []

  const favorisAsDisplay: DisplayArticle[] = useMemo(
    () =>
      favoris.map((f) => ({
        id_article: f.id_article,
        feedId: "",
        feedName: "",
        title: f.titre,
        excerpt: "",
        imageUrl: null,
        url: f.lien,
        publishedAt: "",
        read: false,
        savedForLater: f.favori,
        annotation: f.note,
      })),
    [favoris]
  )

  // --- Favoris precharges au montage (pour le badge coeur partout) ---
  const [favoriIds, setFavoriIds] = useState<Set<string>>(new Set())
  const [favoriNotes, setFavoriNotes] = useState<Record<string, string | null>>({})

  useEffect(() => {
    async function loadAllFavoris() {
      let page = 1
      const limit = 100
      let all: ArticleFavori[] = []
      let total = 0
      while (true) {
        const res = await getFavoris({ page, limit })
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

  // --- Annotees - vraie pagination serveur ---
  const [annotesTotal, setAnnotesTotal] = useState(0)
  const [annotesPage, setAnnotesPage] = useState(1)

  const {
    data: annotesResult,
    loading: annotesLoading,
    refresh: refreshAnnotes,
  } = useCachedFetch(
    `annotes:${annotesPage}`,
    () => getAnnotes({ page: annotesPage, limit: PAGE_SIZE }),
    60 * 1000,
    [annotesPage]
  )
  const annotes = annotesResult?.data ?? []

  useEffect(() => {
    getAnnotes({ page: 1, limit: 1 })
      .then((res) => setAnnotesTotal(res.pagination.total))
      .catch(() => {})
  }, [])

  const annotesAsDisplay: DisplayArticle[] = useMemo(
    () =>
      annotes.map((a) => ({
        id_article: a.id_article,
        feedId: "",
        feedName: "",
        title: a.titre,
        excerpt: "",
        imageUrl: null,
        url: "",
        publishedAt: "",
        read: false,
        savedForLater: a.favori,
        annotation: a.note,
      })),
    [annotes]
  )

  // --- Etat "vu" - TODO: pas de route backend documentee pour ca, reste client-only ---
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [localAnnotations, setLocalAnnotations] = useState<Record<string, string | null>>({})
  const [localFavoris, setLocalFavoris] = useState<Record<string, boolean>>({})

  function enrich(a: DisplayArticle): DisplayArticle {
    const savedForLater =
      localFavoris[a.id_article] !== undefined
        ? localFavoris[a.id_article]
        : favoriIds.has(a.id_article) || a.savedForLater
    return {
      ...a,
      read: readIds.has(a.id_article),
      annotation: localAnnotations[a.id_article] ?? favoriNotes[a.id_article] ?? a.annotation,
      savedForLater,
    }
  }

  const enrichedAllArticles = useMemo(
    () => allArticles.map(enrich),
    [allArticles, readIds, localAnnotations, localFavoris, favoriIds, favoriNotes]
  )
  const enrichedFeedArticles = useMemo(
    () => feedArticles.map(enrich),
    [feedArticles, readIds, localAnnotations, localFavoris, favoriIds, favoriNotes]
  )
  const enrichedFavoris = useMemo(
    () => favorisAsDisplay.map(enrich),
    [favorisAsDisplay, readIds, localAnnotations, localFavoris, favoriIds, favoriNotes]
  )
  const enrichedAnnotes = useMemo(
    () => annotesAsDisplay.map(enrich),
    [annotesAsDisplay, readIds, localAnnotations, localFavoris, favoriIds, favoriNotes]
  )

  // --- Alertes, mises en cache (1 min) ---
  const {
    data: alertesData,
    loading: alertesLoading,
    refresh: refreshAlertes,
  } = useCachedFetch<Alerte[]>("alertes", getAlertes, 60 * 1000)
  const alertes = alertesData ?? []

  const [alertResults, setAlertResults] = useState<AlerteResultat[]>([])
  const [alertResultsLoading, setAlertResultsLoading] = useState(false)
  const [alertFormOpen, setAlertFormOpen] = useState(false)
  const [editingAlerte, setEditingAlerte] = useState<Alerte | null>(null)
  const [viewingResultsFor, setViewingResultsFor] = useState<Alerte | null>(null)
  const [alertSearch, setAlertSearch] = useState("")

  useEffect(() => {
    if (!viewingResultsFor) {
      setAlertResults([])
      return
    }
    setAlertResultsLoading(true)
    getAlerteResultats(viewingResultsFor.id_alerte, { page: 1, limit: 50 })
      .then((res) => setAlertResults(res.data))
      .catch(() => toast.add({ title: "Impossible de charger les resultats", type: "error" }))
      .finally(() => setAlertResultsLoading(false))
  }, [viewingResultsFor])

  const filteredAlertes = useMemo(
    () => alertes.filter((a) => a.mot_cle.toLowerCase().includes(alertSearch.toLowerCase())),
    [alertes, alertSearch]
  )

  // --- Dossiers, mis en cache (2 min) ---
  const {
    data: dossiersData,
    loading: dossiersLoading,
    refresh: refreshDossiers,
  } = useCachedFetch<Dossier[]>("dossiers", getDossiers, 2 * 60 * 1000)
  const dossiers = dossiersData ?? []

  const [dossierFormOpen, setDossierFormOpen] = useState(false)
  const [editingDossier, setEditingDossier] = useState<Dossier | null>(null)
  const [viewingDossier, setViewingDossier] = useState<Dossier | null>(null)
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [timelineLoading, setTimelineLoading] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [dossierSearch, setDossierSearch] = useState("")
  const [dossierDetail, setDossierDetail] = useState<Dossier | null>(null)

  useEffect(() => {
    if (!viewingDossier) {
      setTimeline([])
      return
    }
    setTimelineLoading(true)
    getDossierTimeline(viewingDossier.id_dossier, { page: 1, limit: 30 })
      .then((res) => setTimeline(res.timeline))
      .catch(() => toast.add({ title: "Impossible de charger la timeline", type: "error" }))
      .finally(() => setTimelineLoading(false))
  }, [viewingDossier])

  useEffect(() => {
    if (!viewingDossier) {
      setDossierDetail(null)
      return
    }
    getDossier(viewingDossier.id_dossier)
      .then(setDossierDetail)
      .catch(() => toast.add({ title: "Impossible de charger le dossier", type: "error" }))
  }, [viewingDossier])

  const linkedAlerteIds = useMemo(
    () => new Set((dossierDetail?.alertes ?? []).map((a) => a.alerte_id)),
    [dossierDetail]
  )
  const linkedFluxIds = useMemo(
    () => new Set((dossierDetail?.flux ?? []).map((f) => f.flux_id)),
    [dossierDetail]
  )

  const filteredDossiers = useMemo(
    () =>
      dossiers.filter(
        (d) =>
          d.nom.toLowerCase().includes(dossierSearch.toLowerCase()) ||
          (d.description ?? "").toLowerCase().includes(dossierSearch.toLowerCase())
      ),
    [dossiers, dossierSearch]
  )

  // --- Pagination generique (10/page), reinitialisee a chaque changement de vue ---
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [selected])

  const todayArticles = useMemo(
    () => sortedDesc(enrichedAllArticles.filter((a) => dateSectionLabel(a.publishedAt) === "Aujourd'hui")),
    [enrichedAllArticles]
  )
  const todayTotalPages = Math.max(1, Math.ceil(todayArticles.length / PAGE_SIZE))
  const todayPageItems = todayArticles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const feedArticlesSorted = useMemo(() => sortedDesc(enrichedFeedArticles), [enrichedFeedArticles])
  const feedTotalPages = Math.max(1, Math.ceil(feedArticlesSorted.length / PAGE_SIZE))
  const feedPageItems = feedArticlesSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const feedGroups = useMemo(() => groupByDateSection(feedPageItems), [feedPageItems])

  const favorisTotalPages = Math.max(1, Math.ceil(favorisTotal / PAGE_SIZE))
  const annotesTotalPages = Math.max(1, Math.ceil(annotesTotal / PAGE_SIZE))

  const sectionMeta = SECTION_META[selected.type]

  const counts = useMemo(
    () => ({
      today: todayArticles.filter((a) => !a.read).length,
      later: favorisTotal,
      annotated: annotesTotal,
      alertes: 0,
      dossiers: dossiers.length,
    }),
    [todayArticles, favorisTotal, annotesTotal, dossiers]
  )

async function toggleRead(id_article: string, e: React.MouseEvent) {
  e.stopPropagation()
  const current = readIds.has(id_article)
  const next = !current

  setReadIds((prev) => {
    const updated = new Set(prev)
    if (next) updated.add(id_article)
    else updated.delete(id_article)
    return updated
  })

  try {
    await updateArticleLu(id_article, next)
  } catch {
    setReadIds((prev) => {
      const updated = new Set(prev)
      if (current) updated.add(id_article)
      else updated.delete(id_article)
      return updated
    })
    toast.add({ title: "Erreur", description: "Impossible de marquer l'article", type: "error" })
  }
}

  async function toggleSavedForLater(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const current = localFavoris[id] !== undefined ? localFavoris[id] : favoriIds.has(id)
    const next = !current
    setLocalFavoris((prev) => ({ ...prev, [id]: next }))
    setFavoriIds((prev) => {
      const updated = new Set(prev)
      if (next) updated.add(id)
      else updated.delete(id)
      return updated
    })
    setFavorisTotal((prev) => (next ? prev + 1 : Math.max(0, prev - 1)))

    try {
      await updateArticleFavori(id, next)
      if (selected.type === "later" && !next) {
        await refreshFavoris()
      }
    } catch {
      setLocalFavoris((prev) => ({ ...prev, [id]: current }))
      setFavoriIds((prev) => {
        const updated = new Set(prev)
        if (current) updated.add(id)
        else updated.delete(id)
        return updated
      })
      setFavorisTotal((prev) => (current ? prev + 1 : Math.max(0, prev - 1)))
      toast.add({ title: "Erreur", description: "Impossible de mettre a jour le favori", type: "error" })
    }
  }

  async function saveAnnotation(id: string) {
    const note = noteDraft || null
    try {
      await updateArticleAnnotation(id, note)
      setLocalAnnotations((prev) => ({ ...prev, [id]: note }))
      setAnnotesTotal((prev) => (note ? prev + (localAnnotations[id] ? 0 : 1) : Math.max(0, prev - 1)))
      toast.add({ title: "Note enregistree", type: "success" })
      setOpenNoteId(null)
      if (selected.type === "annotated") {
        await refreshAnnotes()
      }
    } catch {
      toast.add({ title: "Erreur", description: "Impossible d'enregistrer la note", type: "error" })
    }
  }

  async function handleOpenArticle(article: DisplayArticle) {
    setOpenArticle(article)
    if (!readIds.has(article.id_article)) {
      setReadIds((prev) => new Set(prev).add(article.id_article))
      try {
        await updateArticleLu(article.id_article, true)
      } catch {
        
      }
    }
  }

  // --- Handlers alertes ---
  function openCreateAlert() {
    setEditingAlerte(null)
    setAlertFormOpen(true)
  }

  function openEditAlert(alerte: Alerte) {
    setEditingAlerte(alerte)
    setAlertFormOpen(true)
  }

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
        toast.add({ title: "Alerte mise a jour", type: "success" })
      } else {
        const created = await createAlerte(payload)
        toast.add({ title: "Alerte creee", description: created.mot_cle, type: "success" })
      }
      await refreshAlertes()
      setAlertFormOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const message =
          err.status === 409
            ? "Ce mot-cle a deja une alerte active"
            : err.status === 429
              ? "Tu as atteint la limite d'alertes actives"
              : err.message
        toast.add({ title: "Erreur", description: message, type: "error" })
      } else {
        toast.add({ title: "Erreur", description: "Impossible de contacter le serveur", type: "error" })
      }
      throw err
    }
  }

  async function handleDeleteAlert(alerte: Alerte) {
    try {
      await deleteAlerte(alerte.id_alerte)
      await refreshAlertes()
      toast.add({ title: "Alerte supprimee", description: alerte.mot_cle, type: "error" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de supprimer l'alerte", type: "error" })
    }
  }

  async function handleMarkResultRead(resultatId: string) {
    if (!viewingResultsFor) return
    try {
      await marquerResultatLu(viewingResultsFor.id_alerte, resultatId)
      setAlertResults((prev) =>
        prev.map((r) => (r.id_resultat === resultatId ? { ...r, lu: true } : r))
      )
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de marquer comme lu", type: "error" })
    }
  }

  // --- Handlers dossiers ---
  function openCreateDossier() {
    setEditingDossier(null)
    setDossierFormOpen(true)
  }

  function openEditDossier(dossier: Dossier) {
    setEditingDossier(dossier)
    setDossierFormOpen(true)
  }

  async function handleDossierFormSubmit(values: { nom: string; description: string }) {
    try {
      if (editingDossier) {
        await updateDossier(editingDossier.id_dossier, values)
        toast.add({ title: "Dossier mis a jour", type: "success" })
      } else {
        const created = await createDossier(values)
        toast.add({ title: "Dossier cree", description: created.nom, type: "success" })
      }
      await refreshDossiers()
      setDossierFormOpen(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 409
            ? "Ce nom de dossier est deja utilise"
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
      toast.add({ title: "Dossier supprime", description: dossier.nom, type: "error" })
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

  async function handleLinkAlerte(alerteId: string) {
    if (!viewingDossier) return
    try {
      await linkAlerteToDossier(viewingDossier.id_dossier, alerteId)
      toast.add({ title: "Alerte liee", type: "success" })
      await refreshDossierAfterLinkChange()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de lier l'alerte"
      toast.add({ title: "Erreur", description: message, type: "error" })
    }
  }

  async function handleUnlinkAlerte(alerteId: string) {
    if (!viewingDossier) return
    try {
      await unlinkAlerteFromDossier(viewingDossier.id_dossier, alerteId)
      toast.add({ title: "Alerte deliee", type: "success" })
      await refreshDossierAfterLinkChange()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de delier l'alerte"
      toast.add({ title: "Erreur", description: message, type: "error" })
    }
  }

  async function handleLinkFlux(fluxId: string) {
    if (!viewingDossier) return
    try {
      await linkFluxToDossier(viewingDossier.id_dossier, fluxId)
      toast.add({ title: "Flux lie", type: "success" })
      await refreshDossierAfterLinkChange()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de lier le flux"
      toast.add({ title: "Erreur", description: message, type: "error" })
    }
  }

  async function handleUnlinkFlux(fluxId: string) {
    if (!viewingDossier) return
    try {
      await unlinkFluxFromDossier(viewingDossier.id_dossier, fluxId)
      toast.add({ title: "Flux delie", type: "success" })
      await refreshDossierAfterLinkChange()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de delier le flux"
      toast.add({ title: "Erreur", description: message, type: "error" })
    }
  }

  return (
    <SidebarProvider className="h-svh" style={{ "--sidebar-width": "350px" } as React.CSSProperties}>
      <AppSidebar selected={selected} onSelect={setSelected} counts={counts} />

      <SidebarInset className="overflow-y-auto">
        <div className="relative flex-1 overflow-y-auto">
          <div className="sticky top-0 z-20 flex items-start justify-between gap-3 bg-background px-4 py-3">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <Separator orientation="vertical" className="h-4! self-center!" />
              <p className="text-sm leading-none">{sectionMeta.description}</p>
              {selected.type === "feed" && (
                <>
                  <Separator orientation="vertical" className="h-4! self-center!" />
                  <p className="text-sm font-medium leading-none">{selected.feedName}</p>
                </>
              )}
            </div>

            {/* <div className="flex items-center gap-2">
              <Button size="sm" className="gap-2" onClick={() => setRevuesDialogOpen(true)}>
                <FileText className="h-4 w-4" />
                Generer une revue
              </Button>
            </div> */}
          </div>

          <div
            className="pointer-events-none sticky top-[45px] z-10 -mt-6 h-6 w-full backdrop-blur-sm"
            style={{
              maskImage: "linear-gradient(to bottom, black, transparent)",
              WebkitMaskImage: "linear-gradient(to bottom, black, transparent)",
            }}
          />

          {selected.type === "alertes" ? (
            <div className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-3">
                <Button onClick={openCreateAlert} className="gap-1.5">
                  <BellPlus className="h-4 w-4" />
                  Nouvelle alerte
                </Button>
                <Input
                  placeholder="Rechercher l'alerte parmis plusieurs..."
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  className="pl-2"
                />
                <Badge variant="default" className="h-5 px-1.5 text-xs">
                  {filteredAlertes.length} alerte{filteredAlertes.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {alertesLoading && (
                <p className="pt-8 text-center text-sm text-muted-foreground">Chargement...</p>
              )}
              {!alertesLoading && filteredAlertes.length === 0 && (
                <p className="pt-8 text-center text-sm text-muted-foreground">
                  {alertSearch ? "Aucune alerte ne correspond" : "Aucune alerte pour l'instant"}
                </p>
              )}

              {filteredAlertes.map((alerte) => (
                <div key={alerte.id_alerte} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50">
                  <button
                    type="button"
                    onClick={() => setViewingResultsFor(alerte)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Bell className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">{alerte.mot_cle}</span>
                      <p className="text-xs text-muted-foreground">
                        {FREQUENCE_LABELS[alerte.frequence]} - {LANGUE_LABELS[alerte.langue]}
                        {alerte.pays ? ` - ${alerte.pays}` : ""}
                      </p>
                    </div>
                  </button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAlert(alerte)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAlert(alerte)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : selected.type === "dossiers" ? (
            viewingDossier ? (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setViewingDossier(null)}>
                    <ArrowLeft className="h-4 w-4" />
                    {viewingDossier.nom}
                  </Button>
                  <Button size="sm" className="gap-1.5" onClick={() => setLinkDialogOpen(true)}>
                    <Link2 className="h-4 w-4" />
                    Lier alerte/flux
                  </Button>
                </div>

                {timelineLoading && (
                  <p className="pt-8 text-center text-sm text-muted-foreground">Chargement...</p>
                )}
                {!timelineLoading && timeline.length === 0 && (
                  <p className="pt-8 text-center text-sm text-muted-foreground">
                    Aucun element dans cette timeline - lie une alerte ou un flux pour commencer
                  </p>
                )}

                {timeline.map((entry) => (
                  <div key={entry.id} className="group relative">
                    <a
                      href={entry.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 rounded-lg border p-3 pr-10 hover:bg-accent/50"
                    >
                      {entry.image && (
                        <img src={entry.image} alt="" className="h-16 w-16 shrink-0 rounded-md object-cover" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{entry.sourceLabel}</Badge>
                          <Badge variant="secondary" className="text-xs">
                            {entry.type === "alerte" ? "Alerte" : "Flux"}
                          </Badge>
                          {entry.signalFort && (
                            <Badge className="gap-1 bg-orange-500 text-xs text-white hover:bg-orange-500">
                              <Flame className="h-3 w-3" />
                              Signal fort
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(entry.date)}</span>
                        </div>
                        <p className="mt-1 text-sm font-medium">{entry.titre}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">{entry.description}</p>
                      </div>
                    </a>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (entry.type === "alerte") handleUnlinkAlerte(entry.id)
                        else handleUnlinkFlux(entry.id)
                      }}
                      title="Delier"
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between gap-3">
                  <Button onClick={openCreateDossier} className="gap-1.5">
                    <FolderPlus className="h-4 w-4" />
                    Nouveau dossier
                  </Button>
                  <Input
                    placeholder="Rechercher un dossier..."
                    value={dossierSearch}
                    onChange={(e) => setDossierSearch(e.target.value)}
                    className="pl-2"
                  />
                  <Badge variant="default" className="h-5 px-1.5 text-xs">
                    {filteredDossiers.length} dossier{filteredDossiers.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {dossiersLoading && (
                  <p className="pt-8 text-center text-sm text-muted-foreground">Chargement...</p>
                )}
                {!dossiersLoading && filteredDossiers.length === 0 && (
                  <p className="pt-8 text-center text-sm text-muted-foreground">
                    {dossierSearch ? "Aucun dossier ne correspond" : "Aucun dossier pour l'instant"}
                  </p>
                )}

                {filteredDossiers.map((dossier) => (
                  <div key={dossier.id_dossier} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50">
                    <button
                      type="button"
                      onClick={() => setViewingDossier(dossier)}
                      className="flex flex-1 items-center gap-3 text-left"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        <FolderSearch className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{dossier.nom}</span>
                        {dossier.description && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{dossier.description}</p>
                        )}
                      </div>
                    </button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDossier(dossier)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteDossier(dossier)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )
          ) : selected.type === "marches" ? (
            <MarchesView />
            ) : selected.type === "dashboard" ? (
            <UserDashboard />
          ) : selected.type === "today" ? (
            <div className="flex flex-col gap-4 p-4">
              <div className="grid content-start gap-4" style={gridStyle}>
                {allArticlesLoading && (
                  <p className="col-span-full text-center text-sm text-muted-foreground">Chargement...</p>
                )}
                {!allArticlesLoading && todayPageItems.length === 0 && (
                  <div className="col-span-full flex flex-col items-center gap-3 px-4 py-8 text-center">
                    <p className="flex flex-wrap items-center justify-center gap-1 text-sm text-muted-foreground">
                      <span>Aucun article publie aujourd'hui - ajoute des flux pour voir des articles - Aller sur</span>
                      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted">
                        <Plus className="h-3 w-3" />
                      </span>
                    </p>
                  </div>
                )}
                {todayPageItems.map((article) => (
                  <ArticleCard
                    key={article.id_article}
                    article={article}
                    onOpen={handleOpenArticle}
                    onToggleRead={toggleRead}
                    onToggleSaved={toggleSavedForLater}
                    openNoteId={openNoteId}
                    onOpenNoteChange={setOpenNoteId}
                    noteDraft={noteDraft}
                    onNoteDraftChange={setNoteDraft}
                    onSaveAnnotation={saveAnnotation}
                  />
                ))}
              </div>
              <PaginationBar currentPage={page} totalPages={todayTotalPages} onChange={setPage} />
            </div>
          ) : selected.type === "later" ? (
            <div className="flex flex-col gap-4 p-4">
              <div className="grid content-start gap-4" style={gridStyle}>
                {favorisLoading && (
                  <p className="col-span-full text-center text-sm text-muted-foreground">Chargement...</p>
                )}
                {!favorisLoading && enrichedFavoris.length === 0 && (
                  <p className="col-span-full text-center text-sm text-muted-foreground">
                    Aucun article mis de côté
                  </p>
                )}
                {enrichedFavoris.map((article) => (
                  <ArticleCard
                    key={article.id_article}
                    article={article}
                    onOpen={handleOpenArticle}
                    onToggleRead={toggleRead}
                    onToggleSaved={toggleSavedForLater}
                    openNoteId={openNoteId}
                    onOpenNoteChange={setOpenNoteId}
                    noteDraft={noteDraft}
                    onNoteDraftChange={setNoteDraft}
                    onSaveAnnotation={saveAnnotation}
                  />
                ))}
              </div>
              <PaginationBar currentPage={favorisPage} totalPages={favorisTotalPages} onChange={setFavorisPage} />
            </div>
          ) : selected.type === "annotated" ? (
            <div className="flex flex-col gap-4 p-4">
              <div className="grid content-start gap-4" style={gridStyle}>
                {annotesLoading && (
                  <p className="col-span-full text-center text-sm text-muted-foreground">Chargement...</p>
                )}
                {!annotesLoading && enrichedAnnotes.length === 0 && (
                  <p className="col-span-full text-center text-sm text-muted-foreground">
                    Aucun article annote pour l'instant
                  </p>
                )}
                {enrichedAnnotes.map((article) => (
                  <ArticleCard
                    key={article.id_article}
                    article={article}
                    onOpen={handleOpenArticle}
                    onToggleRead={toggleRead}
                    onToggleSaved={toggleSavedForLater}
                    openNoteId={openNoteId}
                    onOpenNoteChange={setOpenNoteId}
                    noteDraft={noteDraft}
                    onNoteDraftChange={setNoteDraft}
                    onSaveAnnotation={saveAnnotation}
                  />
                ))}
              </div>
              <PaginationBar currentPage={annotesPage} totalPages={annotesTotalPages} onChange={setAnnotesPage} />
            </div>
          ) : (
            <div className="flex flex-col gap-6 p-4">
              {feedArticlesLoading && (
                <p className="text-center text-sm text-muted-foreground">Chargement...</p>
              )}
              {!feedArticlesLoading && feedGroups.length === 0 && (
                <p className="text-center text-sm text-muted-foreground">Aucun article pour ce flux</p>
              )}
              {feedGroups.map((group) => (
                <div key={group.label} className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground">{group.label}</h3>
                  <div className="grid content-start gap-4" style={gridStyle}>
                    {group.items.map((article) => (
                      <ArticleCard
                        key={article.id_article}
                        article={article}
                        onOpen={handleOpenArticle}
                        onToggleRead={toggleRead}
                        onToggleSaved={toggleSavedForLater}
                        openNoteId={openNoteId}
                        onOpenNoteChange={setOpenNoteId}
                        noteDraft={noteDraft}
                        onNoteDraftChange={setNoteDraft}
                        onSaveAnnotation={saveAnnotation}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <PaginationBar currentPage={page} totalPages={feedTotalPages} onChange={setPage} />
            </div>
          )}
        </div>
      </SidebarInset>

      <Dialog open={!!openArticle} onOpenChange={(open) => !open && setOpenArticle(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          {displayArticle && (
            <>
              {displayArticle.imageUrl && (
                <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
                  <img src={displayArticle.imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {displayArticle.feedName && (
                    <Badge
                      variant="outline"
                      className="max-w-[140px] truncate sm:max-w-none"
                    >
                      {displayArticle.feedName}
                    </Badge>
                  )}
                  {displayArticle.publishedAt && (
                    <span className="text-xs text-muted-foreground">{formatDate(displayArticle.publishedAt)}</span>
                  )}
                </div>
                <DialogTitle className="text-lg leading-snug">{displayArticle.title}</DialogTitle>
                <DialogDescription className="pt-2 text-sm leading-relaxed text-foreground">
                  {displayArticle.excerpt}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(displayArticle.url, "_blank", "noopener,noreferrer")}
                >
                  Lire l'article original
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertFormDialog
        open={alertFormOpen}
        onOpenChange={setAlertFormOpen}
        editingAlerte={editingAlerte}
        onSubmit={handleAlertFormSubmit}
      />

      <AlertResultsDialog
        alerte={viewingResultsFor}
        results={alertResults}
        loading={alertResultsLoading}
        onOpenChange={(open) => !open && setViewingResultsFor(null)}
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

      <RevuesDialog
        open={revuesDialogOpen}
        onOpenChange={setRevuesDialogOpen}
        dossiers={dossiers}
        feeds={feeds}
      />
    </SidebarProvider>
  )
}
