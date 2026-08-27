import { useState } from "react"
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Minus } from "lucide-react"
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
import { getDashboardKpis, getHistoriqueMatiere } from "@/lib/api/marches"
import { ApiError } from "@/lib/api/client"
import type { DashboardKpis, HistoriqueCoursItem, MatierePremiere } from "@/lib/api/types"

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

export function MarchesView() {
  // useCachedFetch n'expose pas de champ "error" — on le capture nous-mêmes
  // en enveloppant le fetcher, sans changer le comportement du hook.
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

  const [historiqueMatiere, setHistoriqueMatiere] = useState<MatierePremiere | null>(null)

  return (
    <div className="space-y-6 p-4">
      {/* <div>
        <h2 className="text-lg font-semibold">Marchés</h2>
        <p className="text-sm text-muted-foreground">
          Devises et matières premières — cours mis à jour toutes les 15 min (métaux/devises) ou 8h (pétrole)
        </p>
      </div> */}

      {loading && <p className="text-center text-sm text-muted-foreground">Chargement des cours...</p>}
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
                  <Card key={d.paire}>
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
                    onClick={() => setHistoriqueMatiere(m.matiere)}
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
        </>
      )}

      <HistoriqueDialog
        matiere={historiqueMatiere}
        onOpenChange={(open) => !open && setHistoriqueMatiere(null)}
      />
    </div>
  )
}

function HistoriqueDialog({
  matiere,
  onOpenChange,
}: {
  matiere: MatierePremiere | null
  onOpenChange: (open: boolean) => void
}) {
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<HistoriqueCoursItem[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)

  async function loadPage(m: MatierePremiere, p: number) {
    setLoading(true)
    try {
      const res = await getHistoriqueMatiere(m, p, 50)
      setItems(res.historique)
      setTotalPages(res.pagination.totalPages)
      setPage(res.pagination.page)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de charger l'historique"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={matiere !== null}
      onOpenChange={(open) => {
        onOpenChange(open)
        if (open && matiere) loadPage(matiere, 1)
        if (!open) {
          setItems([])
          setPage(1)
          setTotalPages(1)
        }
      }}
    >
      <DialogContent className="flex max-h-[80vh] flex-col sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{matiere ? MATIERE_LABELS[matiere] : ""} — Historique</DialogTitle>
          <DialogDescription>Cours enregistrés au fil du temps</DialogDescription>
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
                  key={item.id_cours}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {item.prix.toLocaleString("fr-FR")} {item.devise}
                    </p>
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
              onClick={() => matiere && loadPage(matiere, page - 1)}
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
              onClick={() => matiere && loadPage(matiere, page + 1)}
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
