import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
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
import { MainLayout } from "@/components/app/MainLayout"
import { MCard, MCardHeader, MEmpty, MHero, MPill, MSkeleton, MTile } from "@/components/mira/mira"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { getAlertes, getAlerteResultats } from "@/lib/api/alerts"
import { getFavoris, getAnnotes } from "@/lib/api/articles"
import { getDossiers } from "@/lib/api/dossiers"
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
  lu: boolean
}

function isToday(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
}

/** Tuile KPI : libellé, gros chiffre et légende. */
function KpiTile({
  label,
  value,
  loading,
  caption,
}: {
  label: string
  value: number
  loading: boolean
  caption: string
}) {
  return (
    <MTile>
      <span className="text-[12px] text-m-soft">{label}</span>
      <span className="mt-4 text-[40px] leading-none font-light tracking-[-0.06em] tabular-nums">
        {loading ? <MSkeleton className="h-10 w-14" /> : value.toLocaleString("fr-FR")}
      </span>
      <span className="mt-3 text-[13px] text-m-strong">{caption}</span>
    </MTile>
  )
}

// Page autonome partageant la coque MainLayout. Les autres écrans
// (Aujourd'hui, Alertes, etc.) vivent dans Dashboard.tsx : la sidebar y
// redirige en transmettant la vue demandée.
export default function UserDashboardView() {
  const navigate = useNavigate()

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
                      lu: a.lu,
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
        .filter((a) => isToday(a.publishedAt) && a.lu === false)
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        ),
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

  // const [ setSignalFortCount] = useState<number | null>(null)

  // useEffect(() => {
  //   if (dossiers.length === 0) {
  //     setSignalFortCount(0)
  //     return
  //   }
  //   Promise.all(
  //       dossiers.slice(0, 5).map((d) =>
  //           getDossierTimeline(d.id_dossier, { page: 1, limit: 30 }).then(
  //               (res) => res.timeline.filter((e) => e.signalFort).length
  //           )
  //       )
  //   )
  //       .then((counts) => setSignalFortCount(counts.reduce((a, b) => a + b, 0)))
  //       .catch(() => setSignalFortCount(0))
  // }, [dossiers])

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, { value: number; color: string }> = {}
    for (const f of feeds) {
      const cat = f.categorie_id ? categoriesById[f.categorie_id] : undefined
      const label = cat?.libelle ?? "Non classé"
      const color = cat?.couleur ?? "#b5b5b0"
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
      <MainLayout active={{ type: "dashboard" }} counts={sidebarCounts}>
        <MHero title="Tableau de bord." subtitle="Ta veille en un coup d’œil." />

        {(() => {
          const kpis = [
            { label: "Flux suivis", value: feeds.length, loading: feedsLoading, caption: "Sources actuellement suivies" },
            { label: "Alertes actives", value: alertes.length, loading: alertesLoading, caption: "Mots-clés surveillés en continu" },
            { label: "Enquêtes en cours", value: dossiers.length, loading: dossiersLoading, caption: "Dossiers d’investigation ouverts" },
            {
              label: "Favoris + annotés",
              value: (favorisTotal ?? 0) + (annotesTotal ?? 0),
              loading: favorisTotal === null || annotesTotal === null,
              caption: "Articles mis de côté ou commentés",
            },
          ]
          return (
            <MCard>
              <MCardHeader title="En un coup d’œil" subtitle="Tes principaux indicateurs de veille." />
              <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
                {kpis.map((k) => (
                  <KpiTile key={k.label} {...k} />
                ))}
              </div>
            </MCard>
          )
        })()}

        <div className="grid gap-[18px] lg:grid-cols-2">
          <MCard>
            <MCardHeader
              title="Alertes à traiter"
              subtitle="Résultats d’alertes que tu n’as pas encore lus."
              action={<MPill tone="neutral" className="font-mono">{unreadTodayCount} non lus</MPill>}
            />
            <div className="mt-6 flex flex-col gap-2">
              {loadingUnreadResults && Array.from({ length: 3 }, (_, i) => <MSkeleton key={i} className="h-11 rounded-2xl" />)}
              {!loadingUnreadResults && unreadAlertResults.length === 0 && <MEmpty className="py-8">Aucun résultat d’alerte non lu.</MEmpty>}
              {unreadAlertResults.map((r) => (
                <a
                  key={r.id_resultat}
                  href={r.lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-11 items-center gap-3 rounded-2xl bg-m-surface-2 px-3.5 transition-colors hover:bg-m-surface-3"
                >
                  <Bell className="size-4 shrink-0 text-m-orange" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{r.titre}</span>
                  <MPill tone="sand" className="max-w-[12ch] truncate">{r.motCle}</MPill>
                </a>
              ))}
            </div>
          </MCard>

          <MCard tone="panel">
            <MCardHeader title="Enquêtes actives" subtitle="Tes derniers dossiers d’investigation." />
            <div className="mt-6 flex flex-col gap-2">
              {dossiersLoading && Array.from({ length: 3 }, (_, i) => <MSkeleton key={i} className="h-11 rounded-2xl bg-m-surface/70" />)}
              {!dossiersLoading && dossiers.length === 0 && <MEmpty className="py-8">Aucun dossier pour l’instant.</MEmpty>}
              {dossiers.slice(0, 5).map((d) => (
                <button
                  key={d.id_dossier}
                  type="button"
                  onClick={() => navigate("/", { state: { view: { type: "dossiers" } } })}
                  className="flex h-11 w-full cursor-pointer items-center gap-3 rounded-2xl bg-m-surface px-3.5 text-left transition-colors hover:bg-m-lime-soft"
                >
                  <FolderSearch className="size-4 shrink-0 text-m-soft" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{d.nom}</span>
                </button>
              ))}
            </div>
          </MCard>
        </div>

        <div className="grid gap-[18px] lg:grid-cols-2">
          <MCard>
            <MCardHeader
              title="Fil d’information"
              subtitle="Les derniers articles publiés aujourd’hui."
              action={
                todayArticles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => navigate("/", { state: { view: { type: "today" } } })}
                    className="flex cursor-pointer items-center gap-1 pt-1 font-mono text-[12px] text-m-strong hover:text-m-ink"
                  >
                    Tout voir <Newspaper className="size-3.5" />
                  </button>
                )
              }
            />
            <div className="mt-5 flex flex-col">
              {articlesLoading && Array.from({ length: 4 }, (_, i) => <MSkeleton key={i} className="mb-2 h-12 rounded-2xl" />)}
              {!articlesLoading && todayArticles.length === 0 && <MEmpty className="py-8">Aucun article publié aujourd’hui.</MEmpty>}
              {todayArticles.slice(0, 5).map((item) => (
                <a
                  key={item.id}
                  href={item.lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mx-3 flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-m-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">{item.titre}</p>
                    <p className="truncate font-mono text-[11px] text-m-soft">{item.feedName}</p>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-m-soft tabular-nums">{formatTime(item.publishedAt)}</span>
                </a>
              ))}
            </div>
          </MCard>

          <MCard>
            <MCardHeader title="Répartition des flux" subtitle="Tes sources suivies, par catégorie." action={<PieChartIcon className="size-5 text-m-muted" />} />
            {feedsLoading ? (
              <MSkeleton className="mx-auto mt-6 size-44 rounded-full" />
            ) : categoryDistribution.length === 0 ? (
              <MEmpty className="py-8">Aucun flux suivi.</MEmpty>
            ) : (
              <div className="mt-4 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={58} outerRadius={86} paddingAngle={3} cornerRadius={6} stroke="none">
                      {categoryDistribution.map((c) => (
                        <Cell key={c.name} fill={c.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0f110f", border: "none", borderRadius: "14px", fontSize: "12px", color: "#fff" }}
                      itemStyle={{ color: "#fff" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {categoryDistribution.map((c) => (
                <span key={c.name} className="flex h-7 items-center gap-1.5 rounded-full bg-m-surface-2 px-3 text-[12px] text-m-strong">
                  <span className="size-2 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                  <span className="font-mono text-m-muted">{c.value}</span>
                </span>
              ))}
            </div>
          </MCard>
        </div>
      </MainLayout>
  )
}
