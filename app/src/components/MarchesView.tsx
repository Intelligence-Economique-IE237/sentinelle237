import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "@/components/ui/toast"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import {
  getDashboardKpis,
  getHistoriqueDevise,
  getHistoriqueIndice,
  getHistoriqueMatiere,
} from "@/lib/api/marches"
import { ApiError } from "@/lib/api/client"
import { getIndiceZone, ZONE_ORDER } from "@/lib/marketZones"
import { MarketTicker, type TickerItem } from "@/components/MarketTicker"
import type {
  CoursIndice,
  DashboardKpis,
  HistoriqueCoursItem,
  HistoriqueDeviseItem,
  HistoriqueIndiceItem,
  MatierePremiere,
} from "@/lib/api/types"

const MATIERE_LABELS: Record<MatierePremiere, string> = {
  or: "Or",
  argent: "Argent",
  platine: "Platine",
  palladium: "Palladium",
  cuivre: "Cuivre",
  petrole_wti: "Pétrole WTI",
  petrole_brent: "Pétrole Brent",
}

// Codes rafraîchis fréquemment (10 min, marché US) — tous les autres
// indices sont désormais à clôture unique quotidienne (BRVM, BVMAC, et
// les indices étrangers via serpapi, limités par quota API).
const FREQUENT_INDICE_CODES = new Set(["SPX", "DJI", "IXIC"])

function formatVariation(v: number | null) {
  if (v === null) return { label: "—", color: "text-muted-foreground", Icon: Minus }
  if (v > 0) return { label: `+${v.toFixed(2)}%`, color: "text-green-600", Icon: ArrowUp }
  if (v < 0) return { label: `${v.toFixed(2)}%`, color: "text-red-600", Icon: ArrowDown }
  return { label: "0.00%", color: "text-muted-foreground", Icon: Minus }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

// Cible unique de l'historique — matière première, devise ou indice.
type HistoriqueTarget =
  | { kind: "matiere"; value: MatierePremiere }
  | { kind: "devise"; value: string }
  | { kind: "indice"; value: string; nom: string }

// Carte dans le style du bloc officiel shadcn "section-cards" (dashboard-01) :
// CardDescription (libellé) + gros chiffre (CardTitle) + CardFooter (variation
// + horodatage). Cliquable pour ouvrir l'historique.
function MarketCard({
  label,
  value,
  unit,
  variation,
  timestamp,
  note,
  onClick,
}: {
  label: string
  value: string
  unit?: string
  variation: number | null
  timestamp: string
  note?: string
  onClick: () => void
}) {
  const { label: varLabel, color, Icon } = formatVariation(variation)
  return (
    <Card className="@container/card cursor-pointer transition-colors hover:bg-accent" onClick={onClick}>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
          {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
        </CardTitle>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className={`flex items-center gap-1 ${color}`}>
          <Icon className="h-3.5 w-3.5" />
          {varLabel}
        </div>
        <div className="text-xs text-muted-foreground">{formatDate(timestamp)}</div>
        {note && <div className="text-[11px] italic text-muted-foreground">{note}</div>}
      </CardFooter>
    </Card>
  )
}

export function MarchesView() {
  const [kpisError, setKpisError] = useState(false)

  const { data, loading } = useCachedFetch<DashboardKpis>(
    "dashboard-kpis",
    () =>
      getDashboardKpis()
        .then((res) => {
          setKpisError(false)
          return res
        })
        .catch((err) => {
          setKpisError(true)
          throw err
        }),
    60 * 1000
  )

  const [target, setTarget] = useState<HistoriqueTarget | null>(null)

  // Bandeau défilant — combine devises, matières et indices
  const tickerItems: TickerItem[] = useMemo(() => {
    if (!data) return []
    const devises: TickerItem[] = data.devises.map((d) => ({
      key: `devise-${d.paire}`,
      label: d.paire,
      value: d.taux.toLocaleString("fr-FR"),
      variation: d.variation_24h,
    }))
    const matieres: TickerItem[] = data.matieres.map((m) => ({
      key: `matiere-${m.matiere}`,
      label: MATIERE_LABELS[m.matiere],
      value: `${m.prix.toLocaleString("fr-FR")} ${m.devise}`,
      variation: m.variation_24h,
    }))
    const indices: TickerItem[] = (data.indices ?? []).map((ix) => ({
      key: `indice-${ix.code}`,
      label: ix.nom,
      value: ix.prix.toLocaleString("fr-FR"),
      variation: ix.variation_24h,
    }))
    return [...devises, ...matieres, ...indices]
  }, [data])

  // Indices groupés par zone géographique (pas par "source" technique)
  const indicesByZone = useMemo(() => {
    if (!data?.indices) return [] as { zone: string; items: CoursIndice[] }[]
    const groups: Record<string, CoursIndice[]> = {}
    for (const ix of data.indices) {
      const zone = getIndiceZone(ix.code)
      groups[zone] = groups[zone] ? [...groups[zone], ix] : [ix]
    }
    return ZONE_ORDER.filter((z) => groups[z]).map((zone) => ({ zone, items: groups[zone] }))
  }, [data])

  return (
    <div className="@container/main space-y-6">
      <MarketTicker items={tickerItems} />

      <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6">
        <div>
          <h2 className="text-lg font-semibold">Marchés</h2>
          <p className="text-sm text-muted-foreground">
            Devises et matières premières mises à jour toutes les 15 min (8h pour le pétrole) — indices
            US (SPX/DJI/IXIC) toutes les 10 min, tous les autres indices à clôture unique quotidienne
          </p>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Chargement des cours...</p>}
        {kpisError && !loading && (
          <p className="text-sm text-destructive">Impossible de charger les cours</p>
        )}

        {data && (
          <>
            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">Devises</h3>
              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {data.devises.map((d) => (
                  <MarketCard
                    key={d.paire}
                    label={d.paire}
                    value={d.taux.toLocaleString("fr-FR")}
                    variation={d.variation_24h}
                    timestamp={d.recorded_at}
                    onClick={() => setTarget({ kind: "devise", value: d.paire })}
                  />
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">Matières premières</h3>
              <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                {data.matieres.map((m) => (
                  <MarketCard
                    key={m.matiere}
                    label={MATIERE_LABELS[m.matiere]}
                    value={m.prix.toLocaleString("fr-FR")}
                    unit={m.devise}
                    variation={m.variation_24h}
                    timestamp={m.recorded_at}
                    onClick={() => setTarget({ kind: "matiere", value: m.matiere })}
                  />
                ))}
              </div>
            </section>

            {indicesByZone.map(({ zone, items }) => {
              const hasDaily = items.some((ix) => !FREQUENT_INDICE_CODES.has(ix.code))
              return (
                <section key={zone} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold text-muted-foreground">Indices — {zone}</h3>
                    {hasDaily && (
                      <Badge variant="outline" className="text-[10px]">
                        Clôture unique quotidienne
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                    {items.map((ix) => (
                      <MarketCard
                        key={ix.code}
                        label={ix.nom}
                        value={ix.prix.toLocaleString("fr-FR")}
                        unit={ix.devise}
                        variation={ix.variation_24h}
                        timestamp={ix.recorded_at}
                        note={
                          ix.source === "finnhub"
                            ? "Prix d'un ETF répliquant l'indice, pas la valeur officielle"
                            : undefined
                        }
                        onClick={() => setTarget({ kind: "indice", value: ix.code, nom: ix.nom })}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </>
        )}

        <HistoriqueDialog target={target} onOpenChange={(open) => !open && setTarget(null)} />
      </div>
    </div>
  )
}

// Ligne d'historique unifiée entre matières (prix+devise), devises (taux) et indices
interface UnifiedRow {
  id: string
  primary: string
  variation_24h: number | null
  recorded_at: string
}

function toUnifiedRow(item: HistoriqueCoursItem | HistoriqueDeviseItem | HistoriqueIndiceItem): UnifiedRow {
  if ("prix" in item && "devise" in item && "matiere" in item) {
    return {
      id: item.id_cours,
      primary: `${item.prix.toLocaleString("fr-FR")} ${item.devise}`,
      variation_24h: item.variation_24h,
      recorded_at: item.recorded_at,
    }
  }
  if ("code" in item) {
    return {
      id: item.id_cours,
      primary: `${item.prix.toLocaleString("fr-FR")} ${item.devise}`,
      variation_24h: item.variation_24h,
      recorded_at: item.recorded_at,
    }
  }
  return {
    id: item.id_cours,
    primary: item.taux.toLocaleString("fr-FR"),
    variation_24h: item.variation_24h,
    recorded_at: item.recorded_at,
  }
}

function HistoriqueDialog({
  target,
  onOpenChange,
}: {
  target: HistoriqueTarget | null
  onOpenChange: (open: boolean) => void
}) {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<UnifiedRow[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  async function loadPage(t: HistoriqueTarget, p: number) {
    setLoading(true)
    try {
      const res =
        t.kind === "matiere"
          ? await getHistoriqueMatiere(t.value, p, 50)
          : t.kind === "devise"
            ? await getHistoriqueDevise(t.value, p, 50)
            : await getHistoriqueIndice(t.value, p, 50)
      setItems(res.historique.map(toUnifiedRow))
      setTotalPages(res.pagination.totalPages)
      setPage(res.pagination.page)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de charger l'historique"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const title =
    target?.kind === "matiere"
      ? MATIERE_LABELS[target.value]
      : target?.kind === "devise"
        ? target.value
        : target?.kind === "indice"
          ? target.nom
          : ""

  // Tout est à clôture unique quotidienne sauf les 3 indices US (finnhub)
  const isDailyOnly = target?.kind === "indice" && !FREQUENT_INDICE_CODES.has(target.value)

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (open && target) loadPage(target, 1)
        if (!open) {
          setItems([])
          setPage(1)
          setTotalPages(1)
        }
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title} — Historique</DialogTitle>
          <DialogDescription>
            {isDailyOnly
              ? "Clôture unique quotidienne — pas de nouvelle valeur avant le prochain cycle programmé."
              : "Cours enregistrés au fil du temps"}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && <p className="py-6 text-center text-sm text-muted-foreground">Chargement...</p>}
          {!loading && items.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune donnée</p>
          )}
          <div className="space-y-1">
            {items.map((item) => {
              const { label, color, Icon } = formatVariation(item.variation_24h)
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.primary}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(item.recorded_at)}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${color}`}>
                    <Icon className="h-3 w-3" />
                    {label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => target && loadPage(target, page - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Précédent
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => target && loadPage(target, page + 1)}
              className="gap-1"
            >
              Suivant
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
