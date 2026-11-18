import { useEffect, useMemo, useState } from "react"
import { ArrowDown, ArrowUp, Minus } from "lucide-react"
import { MCard, MDialog, MEmpty, MPagination, MPill, MSkeleton } from "@/components/mira/mira"
import { toast } from "@/components/mira/toast-manager"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { getDashboardKpis, getHistoriqueDevise, getHistoriqueIndice, getHistoriqueMatiere } from "@/lib/api/marches"
import { ApiError } from "@/lib/api/client"
import { getIndiceZone, ZONE_ORDER } from "@/lib/marketZones"
import { MarketTicker, type TickerItem } from "@/components/MarketTicker"
import { cn } from "@/lib/utils"
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
// indices sont à clôture unique quotidienne (BRVM, BVMAC, et les indices
// étrangers via serpapi, limités par quota API).
const FREQUENT_INDICE_CODES = new Set(["SPX", "DJI", "IXIC"])

function Variation({ value, className }: { value: number | null; className?: string }) {
  if (value === null || value === 0)
    return (
      <span className={cn("flex items-center gap-1 text-m-muted", className)}>
        <Minus className="size-3.5" />
        {value === 0 ? "0,00 %" : "—"}
      </span>
    )
  const up = value > 0
  return (
    <span className={cn("flex items-center gap-1", up ? "text-m-green-text" : "text-m-orange-text", className)}>
      {up ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
      {up ? "+" : "−"}
      {Math.abs(value).toFixed(2)} %
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

// Cible unique de l'historique — matière première, devise ou indice.
type HistoriqueTarget =
  | { kind: "matiere"; value: MatierePremiere }
  | { kind: "devise"; value: string }
  | { kind: "indice"; value: string; nom: string }

/** Tuile de cours : libellé, gros chiffre, variation, horodatage. Cliquable pour l'historique. */
function MarketTile({
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 cursor-pointer flex-col rounded-[22px] bg-m-surface-2 p-4 text-left transition-colors outline-none hover:bg-m-surface-3 focus-visible:ring-2 focus-visible:ring-m-lime"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-[12px] text-m-soft">{label}</span>
        <Variation value={variation} className="shrink-0 font-mono text-[11px]" />
      </span>
      <span className="mt-4 flex items-baseline gap-1.5">
        <span className="truncate text-[30px] leading-none font-light tracking-[-0.05em] tabular-nums">{value}</span>
        {unit && <span className="text-[11px] text-m-muted">{unit}</span>}
      </span>
      <span className="mt-3 font-mono text-[10px] text-m-muted">{formatDate(timestamp)}</span>
      {note && <span className="mt-1 text-[11px] leading-snug text-m-soft italic">{note}</span>}
    </button>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <MCard>
      <header className="flex items-center gap-3">
        <h2 className="text-[22px] leading-tight font-medium tracking-[-0.03em]">{title}</h2>
        {badge && <MPill tone="sand">{badge}</MPill>}
      </header>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </MCard>
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
    return [
      ...data.devises.map((d) => ({ key: `devise-${d.paire}`, label: d.paire, value: d.taux.toLocaleString("fr-FR"), variation: d.variation_24h })),
      ...data.matieres.map((m) => ({
        key: `matiere-${m.matiere}`,
        label: MATIERE_LABELS[m.matiere],
        value: `${m.prix.toLocaleString("fr-FR")} ${m.devise}`,
        variation: m.variation_24h,
      })),
      ...(data.indices ?? []).map((ix) => ({ key: `indice-${ix.code}`, label: ix.nom, value: ix.prix.toLocaleString("fr-FR"), variation: ix.variation_24h })),
    ]
  }, [data])

  // Indices groupés par zone géographique
  const indicesByZone = useMemo(() => {
    if (!data?.indices) return [] as { zone: string; items: CoursIndice[] }[]
    const groups: Record<string, CoursIndice[]> = {}
    for (const ix of data.indices) (groups[getIndiceZone(ix.code)] ??= []).push(ix)
    return ZONE_ORDER.filter((z) => groups[z]).map((zone) => ({ zone, items: groups[zone] }))
  }, [data])

  return (
    <div className="flex flex-col gap-[18px]">
      <MarketTicker items={tickerItems} />
      <p className="px-1 font-mono text-[11px] leading-relaxed text-m-soft">
        Devises et matières premières : mise à jour toutes les 15 min (8 h pour le pétrole). Indices US (SPX, DJI, IXIC) :
        toutes les 10 min. Autres indices : clôture unique quotidienne.
      </p>

      {loading && !data && (
        <MCard>
          <MSkeleton className="h-6 w-40" />
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <MSkeleton key={i} className="h-32 rounded-[22px]" />
            ))}
          </div>
        </MCard>
      )}
      {kpisError && !loading && (
        <div role="alert" className="rounded-[22px] bg-m-peach px-5 py-4 text-sm text-m-orange-text">
          Impossible de charger les cours.
        </div>
      )}

      {data && (
        <>
          <Section title="Devises">
            {data.devises.map((d) => (
              <MarketTile
                key={d.paire}
                label={d.paire}
                value={d.taux.toLocaleString("fr-FR")}
                variation={d.variation_24h}
                timestamp={d.recorded_at}
                onClick={() => setTarget({ kind: "devise", value: d.paire })}
              />
            ))}
          </Section>
          <Section title="Matières premières">
            {data.matieres.map((m) => (
              <MarketTile
                key={m.matiere}
                label={MATIERE_LABELS[m.matiere]}
                value={m.prix.toLocaleString("fr-FR")}
                unit={m.devise}
                variation={m.variation_24h}
                timestamp={m.recorded_at}
                onClick={() => setTarget({ kind: "matiere", value: m.matiere })}
              />
            ))}
          </Section>
          {indicesByZone.map(({ zone, items }) => (
            <Section
              key={zone}
              title={`Indices · ${zone}`}
              badge={items.some((ix) => !FREQUENT_INDICE_CODES.has(ix.code)) ? "Clôture quotidienne" : undefined}
            >
              {items.map((ix) => (
                <MarketTile
                  key={ix.code}
                  label={ix.nom}
                  value={ix.prix.toLocaleString("fr-FR")}
                  unit={ix.devise}
                  variation={ix.variation_24h}
                  timestamp={ix.recorded_at}
                  note={ix.source === "finnhub" ? "Prix d’un ETF répliquant l’indice, pas la valeur officielle" : undefined}
                  onClick={() => setTarget({ kind: "indice", value: ix.code, nom: ix.nom })}
                />
              ))}
            </Section>
          ))}
        </>
      )}

      <MDialog
        open={target !== null}
        onOpenChange={(open) => !open && setTarget(null)}
        className="max-w-lg"
        title={
          target?.kind === "matiere"
            ? `${MATIERE_LABELS[target.value]} · historique`
            : target
              ? `${target.kind === "indice" ? target.nom : target.value} · historique`
              : ""
        }
        description={
          target?.kind === "indice" && !FREQUENT_INDICE_CODES.has(target.value)
            ? "Clôture unique quotidienne : pas de nouvelle valeur avant le prochain cycle programmé."
            : "Cours enregistrés au fil du temps."
        }
      >
        {target && <Historique key={`${target.kind}-${target.value}`} target={target} />}
      </MDialog>
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
  if ("prix" in item) {
    return { id: item.id_cours, primary: `${item.prix.toLocaleString("fr-FR")} ${item.devise}`, variation_24h: item.variation_24h, recorded_at: item.recorded_at }
  }
  return { id: item.id_cours, primary: item.taux.toLocaleString("fr-FR"), variation_24h: item.variation_24h, recorded_at: item.recorded_at }
}

/** Historique paginé d'un cours ; monté à chaque ouverture (clé), il charge sa page 1. */
function Historique({ target }: { target: HistoriqueTarget }) {
  const [page, setPage] = useState(1)
  const [result, setResult] = useState<{ page: number; items: UnifiedRow[]; totalPages: number } | null>(null)
  const loading = result?.page !== page

  useEffect(() => {
    let cancelled = false
    const req =
      target.kind === "matiere"
        ? getHistoriqueMatiere(target.value, page, 50)
        : target.kind === "devise"
          ? getHistoriqueDevise(target.value, page, 50)
          : getHistoriqueIndice(target.value, page, 50)
    req
      .then((res) => {
        if (!cancelled) setResult({ page, items: res.historique.map(toUnifiedRow), totalPages: res.pagination.totalPages })
      })
      .catch((err) => {
        if (cancelled) return
        setResult({ page, items: [], totalPages: 1 })
        toast.add({ title: "Erreur", description: err instanceof ApiError ? err.message : "Impossible de charger l’historique", type: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [target, page])

  const items = result?.items ?? []
  return (
    <>
      <div className="-mx-2 flex max-h-[50svh] flex-col gap-1.5 overflow-y-auto px-2">
        {loading && Array.from({ length: 6 }, (_, i) => <MSkeleton key={i} className="h-14 rounded-2xl" />)}
        {!loading && items.length === 0 && <MEmpty className="py-8">Aucune donnée.</MEmpty>}
        {!loading &&
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-m-surface-2 px-4 py-2.5">
              <div>
                <p className="text-[15px] font-medium tabular-nums">{item.primary}</p>
                <p className="font-mono text-[11px] text-m-soft">{formatDate(item.recorded_at)}</p>
              </div>
              <Variation value={item.variation_24h} className="font-mono text-[12px]" />
            </div>
          ))}
      </div>
      {result && <MPagination page={page} totalPages={result.totalPages} onChange={setPage} />}
    </>
  )
}
