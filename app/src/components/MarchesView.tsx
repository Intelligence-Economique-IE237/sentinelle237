import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Minus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="space-y-6">
      <MarketTicker items={tickerItems} />

      <div className="space-y-6 p-4">
        <div>
          <h2 className="text-lg font-semibold">Marchés</h2>
          <p className="text-sm text-muted-foreground">
            Devises, matières premières et indices — mise à jour toutes les 15 min (métaux/devises),
            8h (pétrole), 10-30 min (indices US/Europe) ou 1x/jour (BRVM/BVMAC)
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
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.devises.map((d) => {
                  const { label, color, Icon } = formatVariation(d.variation_24h)
                  return (
                    <Card
                      key={d.paire}
                      className="cursor-pointer transition-colors hover:bg-accent"
                      onClick={() => setTarget({ kind: "devise", value: d.paire })}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">{d.paire}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-semibold">{d.taux.toLocaleString("fr-FR")}</p>
                        <div className={`flex items-center gap-1 text-xs ${color}`}>
                          <Icon className="h-3 w-3" />
                          {label}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(d.recorded_at)}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-xs font-semibold text-muted-foreground">Matières premières</h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.matieres.map((m) => {
                  const { label, color, Icon } = formatVariation(m.variation_24h)
                  return (
                    <Card
                      key={m.matiere}
                      className="cursor-pointer transition-colors hover:bg-accent"
                      onClick={() => setTarget({ kind: "matiere", value: m.matiere })}
                    >
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">
                          {MATIERE_LABELS[m.matiere]}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-semibold">
                          {m.prix.toLocaleString("fr-FR")}{" "}
                          <span className="text-xs font-normal text-muted-foreground">{m.devise}</span>
                        </p>
                        <div className={`flex items-center gap-1 text-xs ${color}`}>
                          <Icon className="h-3 w-3" />
                          {label}
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(m.recorded_at)}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </section>

            {indicesByZone.map(({ zone, items }) => (
              <section key={zone} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground">Indices — {zone}</h3>
                  {items.some((ix) => ix.source === "brvm" || ix.source === "bvmac") && (
                    <Badge variant="outline" className="text-[10px]">
                      1 point / jour ouvré
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((ix) => {
                    const { label, color, Icon } = formatVariation(ix.variation_24h)
                    return (
                      <Card
                        key={ix.code}
                        className="cursor-pointer transition-colors hover:bg-accent"
                        onClick={() => setTarget({ kind: "indice", value: ix.code, nom: ix.nom })}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">{ix.nom}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-xl font-semibold">
                            {ix.prix.toLocaleString("fr-FR")}{" "}
                            <span className="text-xs font-normal text-muted-foreground">{ix.devise}</span>
                          </p>
                          <div className={`flex items-center gap-1 text-xs ${color}`}>
                            <Icon className="h-3 w-3" />
                            {label}
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{formatDate(ix.recorded_at)}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            ))}
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

  const isDailyOnly =
    target?.kind === "indice" && (target.value.startsWith("BRVM") || target.value.startsWith("BVMAC"))

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
              ? "Un point par jour ouvré — marché fermé le week-end et les jours fériés."
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
