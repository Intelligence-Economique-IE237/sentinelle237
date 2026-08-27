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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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

function KpiBlock({ value, label, loading }: { value: number; label: string; loading: boolean }) {
  return (
      <div className="flex flex-col items-center gap-1 rounded-lg border p-4 text-center">
      <span className="text-3xl font-semibold tabular-nums">
        {loading ? "—" : value.toLocaleString("fr-FR")}
      </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
  )
}

const PIE_COLORS = ["#8b5cf6", "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#f97316"]

export default function CommandCenterPage() {
  const navigate = useNavigate()

  // --- Sidebar : cette page n'a pas de vues internes distinctes — toute
  // sélection dans la sidebar renvoie vers /dashboard, comme le font déjà
  // les autres boutons de navigation de cette page. `selected` ne sert
  // qu'à l'état visuel (surbrillance) de la sidebar elle-même.
  const [selected, setSelected] = useState<SelectedView>({ type: "today" })

  // --- Flux suivis (mis en cache, partagé avec sidebar/Dashboard) ---
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

  // --- Alertes, mises en cache ---
  const { data: alertesData, loading: alertesLoading } = useCachedFetch<Alerte[]>(
      "alertes",
      getAlertes,
      60 * 1000
  )
  const alertes = alertesData ?? []

  // --- Dossiers, mis en cache ---
  const { data: dossiersData, loading: dossiersLoading } = useCachedFetch<Dossier[]>(
      "dossiers",
      getDossiers,
      2 * 60 * 1000
  )
  const dossiers = dossiersData ?? []

  // --- Fil d'aujourd'hui, agrégé multi-flux ---
  const feedIds = useMemo(() => feeds.map((f) => f.id_flux).sort().join(","), [feeds])
  const { data: allArticlesData, loading: articlesLoading } = useCachedFetch<DisplayArticle[]>(
      `all-articles:${feedIds}`,
      () =>
          Promise.all(
              feeds.map((f) =>
                  getFluxArticles(f.id_flux, { limit: 50 }).then((arts) =>
                      arts.map((a) => ({
                        id: a.id,
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

  // --- Favoris / Annotées : juste les totaux ---
  const [favorisTotal, setFavorisTotal] = useState<number | null>(null)
  const [annotesTotal, setAnnotesTotal] = useState<number | null>(null)

  useEffect(() => {
    getFavoris({ page: 1, limit: 1 }).then((res) => setFavorisTotal(res.pagination.total)).catch(() => {})
    getAnnotes({ page: 1, limit: 1 }).then((res) => setAnnotesTotal(res.pagination.total)).catch(() => {})
  }, [])

  // --- Résultats d'alertes non lus (les 3 premières alertes, échantillon) ---
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

  // --- Dossiers : compte des signaux forts sur les 3 premiers dossiers (échantillon) ---
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

  // --- Répartition des flux par catégorie, pour le graphique ---
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const f of feeds) {
      const label = f.categorie_id ? categoriesById[f.categorie_id]?.libelle ?? "Non classé" : "Non classé"
      counts[label] = (counts[label] ?? 0) + 1
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
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
            <Separator orientation="vertical" className="h-4! self-center!" />
            <p className="text-sm">Tableau de Bord</p>
          </div>

          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
            {/* 4 KPI — tous réels */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiBlock value={feeds.length} label="Flux suivis" loading={feedsLoading} />
              <KpiBlock value={alertes.length} label="Alertes actives" loading={alertesLoading} />
              <KpiBlock value={dossiers.length} label="Enquêtes en cours" loading={dossiersLoading} />
              <KpiBlock
                  value={(favorisTotal ?? 0) + (annotesTotal ?? 0)}
                  label="Favoris + annotés"
                  loading={favorisTotal === null || annotesTotal === null}
              />
            </div>

            {/* À traiter / Enquêtes actives */}
            <div className="grid gap-4 lg:grid-cols-2">
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
            <div className="grid gap-4 lg:grid-cols-2">
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
                      <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => navigate("/dashboard")}>
                        Voir tout le fil
                      </Button>
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
                              {categoryDistribution.map((_, i) => (
                                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
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
                    {categoryDistribution.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                          {c.name} ({c.value})
                        </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
  )
}
