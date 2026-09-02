import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  FolderSearch,
  Newspaper,
  PieChart as PieChartIcon,
} from "lucide-react"
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AppSidebar, type SelectedView } from "@/components/app-sidebar"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { getAlertes, getAlerteResultats } from "@/lib/api/alerts"
import { getFavoris, getAnnotes } from "@/lib/api/articles"
import { getDossiers, getDossierTimeline } from "@/lib/api/dossiers"
import { getCategoriesFlux, getFluxArticles, getMyFluxes } from "@/lib/api/feeds"
import type { Alerte, AlerteResultat, CategorieFlux, Dossier, Flux } from "@/lib/api/types"

// Forme légère propre à cette vue — indépendante de DisplayArticle dans
// Dashboard.tsx.
interface DisplayArticle {
  id: string
  titre: string
  feedName: string
  publishedAt: string
  lien: string
}

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

// Cartes KPI dans le style du bloc officiel shadcn "section-cards" (dashboard-01) :
// même structure/typographie (CardDescription + gros chiffre + CardFooter),
// sans badge de tendance inventé — on n'a pas de donnée historique pour en
// justifier un honnêtement.
function KpiCard({
                   label,
                   value,
                   loading,
                   footerLine,
                 }: {
  label: string
  value: number
  loading: boolean
  footerLine: string
}) {
  return (
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "—" : value.toLocaleString("fr-FR")}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">{footerLine}</div>
        </CardFooter>
      </Card>
  )
}

// Page autonome avec sa propre AppSidebar. Cette vue n'affiche pas les
// autres écrans (Aujourd'hui, Alertes, etc.) elle-même — tout clic dans la
// sidebar redirige vers /dashboard (Dashboard.tsx), qui les gère réellement.
export default function UserDashboardView() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<SelectedView>({ type: "dashboard" })

  const { data: feedsData, loading: feedsLoading } = useCachedFetch<Flux[]>(
      "feeds",
      getMyFluxes,
      2 * 60 * 1000
  )
  const feeds = feedsData ?? []

  const { data: categoriesData } = useCachedFetch<CategorieFlux[]>(
      "categories-flux",
      getCategoriesFlux,
      30 * 60 * 1000
  )
  const categories = categoriesData ?? []
  const categoriesById = useMemo(
      () => Object.fromEntries(categories.map((c) => [c.id_categorie, c])),
      [categories]
  )

  const { data: alertesData, loading: alertesLoading } = useCachedFetch<Alerte[]>(
      "alertes",
      getAlertes,
      60 * 1000
  )
  const alertes = alertesData ?? []

  const { data: dossiersData, loading: dossiersLoading } = useCachedFetch<Dossier[]>(
      "dossiers",
      getDossiers,
      2 * 60 * 1000
  )
  const dossiers = dossiersData ?? []

  const feedIds = useMemo(() => feeds.map((f) => f.id_flux).sort().join(","), [feeds])
  const { data: allArticlesData, loading: articlesLoading } = useCachedFetch<DisplayArticle[]>(
      // Clé distincte de "all-articles:..." utilisée par Dashboard.tsx — les
      // deux stockent des formes différentes, partager la clé corromprait
      // l'une avec la forme de l'autre.
      `dashboard-summary-articles:${feedIds}`,
      () =>
          Promise.all(
              feeds.map((f) =>
                  getFluxArticles(f.id_flux, { limit: 50 }).then((arts) =>
                      arts.map((a) => ({
                        id: a.id_article,
                        titre: a.titre,
                        feedName: f.nom,
                        publishedAt: a.date_publication,
                        lien: a.lien,
                      }))
                  )
              )
          ).then((results) => results.flat()),
      2 * 60 * 1000,
      [feedIds]
  )
  const allArticles = allArticlesData ?? []

  const todayArticles = useMemo(
      () =>
          allArticles
              .filter((a) => isToday(a.publishedAt))
              .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
      [allArticles]
  )

  const [favorisTotal, setFavorisTotal] = useState<number | null>(null)
  const [annotesTotal, setAnnotesTotal] = useState<number | null>(null)

  useEffect(() => {
    getFavoris({ page: 1, limit: 1 }).then((res) => setFavorisTotal(res.pagination.total)).catch(() => {})
    getAnnotes({ page: 1, limit: 1 }).then((res) => setAnnotesTotal(res.pagination.total)).catch(() => {})
  }, [])

  const [unreadAlertResults, setUnreadAlertResults] = useState<(AlerteResultat & { motCle: string })[]>([])
  const [loadingUnreadResults, setLoadingUnreadResults] = useState(true)

  useEffect(() => {
    if (alertes.length === 0) {
      setLoadingUnreadResults(false)
      return
    }
    setLoadingUnreadResults(true)
    Promise.all(
        alertes.slice(0, 5).map((a) =>
            getAlerteResultats(a.id_alerte, { page: 1, limit: 20, lu: false }).then((res) =>
                res.data.map((r) => ({ ...r, motCle: a.mot_cle }))
            )
        )
    )
        .then((results) => setUnreadAlertResults(results.flat().slice(0, 5)))
        .catch(() => setUnreadAlertResults([]))
        .finally(() => setLoadingUnreadResults(false))
  }, [alertes])

  const [signalFortCount, setSignalFortCount] = useState<number | null>(null)

  useEffect(() => {
    if (dossiers.length === 0) {
      setSignalFortCount(0)
      return
    }
    Promise.all(
        dossiers.slice(0, 5).map((d) =>
            getDossierTimeline(d.id_dossier, { page: 1, limit: 30 }).then(
                (res) => res.timeline.filter((e) => e.signalFort).length
            )
        )
    )
        .then((counts) => setSignalFortCount(counts.reduce((a, b) => a + b, 0)))
        .catch(() => setSignalFortCount(0))
  }, [dossiers])

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, { value: number; color: string }> = {}
    for (const f of feeds) {
      const cat = f.categorie_id ? categoriesById[f.categorie_id] : undefined
      const label = cat?.libelle ?? "Non classé"
      const color = cat?.couleur ?? "#9ca3af"
      if (!counts[label]) {
        counts[label] = { value: 0, color }
      }
      counts[label].value += 1
    }
    return Object.entries(counts).map(([name, { value, color }]) => ({ name, value, color }))
  }, [feeds, categoriesById])

  const unreadTodayCount = todayArticles.length

  const sidebarCounts = useMemo(
      () => ({
        today: todayArticles.length,
        later: favorisTotal ?? 0,
        annotated: annotesTotal ?? 0,
        alertes: alertes.length,
        dossiers: dossiers.length,
      }),
      [todayArticles, favorisTotal, annotesTotal, alertes, dossiers]
  )

  return (
      <SidebarProvider className="h-svh" style={{ "--sidebar-width": "350px" } as React.CSSProperties}>
        <AppSidebar
            selected={selected}
            onSelect={(view) => {
              setSelected(view)
              navigate("/dashboard")
            }}
            counts={sidebarCounts}
        />

        <SidebarInset className="overflow-y-auto">
          <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background px-4 py-3">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4!" />
            <p className="text-sm">Tableau de bord</p>
          </div>

          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Cartes KPI — grille responsive identique au bloc officiel */}
              <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                <KpiCard
                    label="Flux suivis"
                    value={feeds.length}
                    loading={feedsLoading}
                    footerLine="Sources actuellement suivies"
                />
                <KpiCard
                    label="Alertes actives"
                    value={alertes.length}
                    loading={alertesLoading}
                    footerLine="Mots-clés surveillés en continu"
                />
                <KpiCard
                    label="Enquêtes en cours"
                    value={dossiers.length}
                    loading={dossiersLoading}
                    footerLine="Dossiers d'investigation ouverts"
                />
                <KpiCard
                    label="Favoris + annotés"
                    value={(favorisTotal ?? 0) + (annotesTotal ?? 0)}
                    loading={favorisTotal === null || annotesTotal === null}
                    footerLine="Articles mis de côté ou commentés"
                />
              </div>

              {/* À traiter / Enquêtes actives */}
              <div className="grid gap-4 px-4 lg:px-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <CardTitle className="text-base">À traiter</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {loadingUnreadResults && (
                        <p className="py-4 text-center text-sm text-muted-foreground">Chargement...</p>
                    )}
                    {!loadingUnreadResults && unreadAlertResults.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          Aucun résultat d'alerte non lu
                        </p>
                    )}
                    {unreadAlertResults.map((r) => (
                        <a
                            key={r.id_resultat}
                            href={r.lien}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 rounded-md border p-2 hover:bg-accent"
                        >
                          <span className="min-w-0 flex-1 truncate text-sm">{r.titre}</span>
                          <Badge variant="outline" className="shrink-0 text-xs">{r.motCle}</Badge>
                        </a>
                    ))}
                    <div className="flex items-center justify-between pt-1 text-sm">
                      <span className="text-muted-foreground">Articles non lus (session)</span>
                      <Badge variant="secondary">{unreadTodayCount}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <FolderSearch className="h-4 w-4 text-orange-500" />
                      <CardTitle className="text-base">Enquêtes actives</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dossiersLoading && (
                        <p className="py-4 text-center text-sm text-muted-foreground">Chargement...</p>
                    )}
                    {!dossiersLoading && dossiers.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          Aucun dossier pour l'instant
                        </p>
                    )}
                    {dossiers.slice(0, 5).map((d) => (
                        <button
                            key={d.id_dossier}
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                        >
                          <span className="min-w-0 flex-1 truncate">{d.nom}</span>
                        </button>
                    ))}
                    <div className="flex items-center justify-between pt-1 text-sm">
                      <span className="text-muted-foreground">Signaux forts détectés</span>
                      <Badge variant={signalFortCount ? "destructive" : "secondary"}>
                        {signalFortCount ?? "—"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Fil d'information / Répartition des flux */}
              <div className="grid gap-4 px-4 lg:px-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Newspaper className="h-4 w-4" />
                      <CardTitle className="text-base">Fil d'information</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {articlesLoading && (
                        <p className="py-4 text-center text-sm text-muted-foreground">Chargement...</p>
                    )}
                    {!articlesLoading && todayArticles.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                          Aucun article publié aujourd'hui
                        </p>
                    )}
                    {todayArticles.slice(0, 5).map((item) => (
                        <a
                            key={item.id}
                            href={item.lien}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate">{item.titre}</p>
                            <p className="text-xs text-muted-foreground">{item.feedName}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatTime(item.publishedAt)}</span>
                        </a>
                    ))}
                    {todayArticles.length > 0 && (
                        <button
                            type="button"
                            onClick={() => navigate("/dashboard")}
                            className="block w-full pt-1 text-center text-xs text-muted-foreground underline underline-offset-4"
                        >
                          Voir tout le fil sur Aujourd'hui
                        </button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="h-4 w-4" />
                      <CardTitle className="text-base">Répartition des flux</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {feedsLoading ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>
                    ) : categoryDistribution.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">Aucun flux suivi</p>
                    ) : (
                        <div className="h-56 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                  data={categoryDistribution}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={80}
                                  paddingAngle={2}
                              >
                                {categoryDistribution.map((c) => (
                                    <Cell key={c.name} fill={c.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                  contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "8px",
                                    fontSize: "12px",
                                  }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                      {categoryDistribution.map((c) => (
                          <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name} ({c.value})
                          </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
  )
}
