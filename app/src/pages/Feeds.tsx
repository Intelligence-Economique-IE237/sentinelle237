import { useMemo, useState } from "react"
import { Plus, Rss, Trash2 } from "lucide-react"
import { MainLayout } from "@/components/app/MainLayout"
import { AddFluxDialog } from "@/components/app/AddFluxDialog"
import { MButton, MCard, MCardHeader, MDialog, MDot, MEmpty, MHero, MPill, MSkeleton } from "@/components/mira/mira"
import { toast } from "@/components/mira/toast-manager"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { getCategoriesFlux, getMyFluxes, unsubscribeFlux } from "@/lib/api/feeds"
import { cn } from "@/lib/utils"
import type { CategorieFlux, Flux } from "@/lib/api/types"

const DAY = 24 * 60 * 60 * 1000
const TH = "px-3 pb-3 text-left font-mono text-[10px] font-normal tracking-wide text-m-muted uppercase"
const TD = "px-3 py-3 align-middle"

function formatDate(iso: string | null) {
  if (!iso) return "Jamais récupéré"
  return new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

function freshness(iso: string | null) {
  if (!iso) return "bg-m-ring"
  const age = Date.now() - new Date(iso).getTime()
  return age < DAY ? "bg-m-green" : age < 7 * DAY ? "bg-m-sand" : "bg-m-orange"
}

/** Gestion des flux suivis (/dashboard/feeds). */
export default function Feeds() {
  const { data, loading, refresh } = useCachedFetch<Flux[]>("feeds", getMyFluxes, 2 * 60 * 1000)
  const feeds = useMemo(() => data ?? [], [data])
  const { data: categoriesData } = useCachedFetch<CategorieFlux[]>("categories-flux", getCategoriesFlux, 30 * 60 * 1000)
  const categories = useMemo(() => categoriesData ?? [], [categoriesData])
  const categoriesById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id_categorie, c])), [categories])

  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<Flux | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!removing) return
    setBusy(true)
    try {
      await unsubscribeFlux(removing.id_flux)
      await refresh()
      toast.add({ title: "Flux retiré", description: removing.nom, type: "success" })
      setRemoving(null)
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de retirer ce flux", type: "error" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <MainLayout active={{ type: "gestion" }}>
      <MHero
        title="Mes flux."
        subtitle="Les sources que tu suis."
        stats={[{ value: loading && !data ? "…" : feeds.length, label: "Flux suivis", dot: "bg-m-ink" }]}
      />

      <MCard>
        <MCardHeader
          title="Sources surveillées"
          subtitle="Pastille verte : collecte de moins de 24 h. Retire un flux si tu ne veux plus le suivre."
          action={
            <MButton size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-3.5!" /> Ajouter un flux
            </MButton>
          }
        />
        <div className="-mx-3 mt-6 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={TH}>Source</th>
                <th className={cn(TH, "hidden sm:table-cell")}>Type</th>
                <th className={cn(TH, "hidden md:table-cell")}>Catégorie</th>
                <th className={TH}>Dernière collecte</th>
                <th className={TH}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                feeds.length === 0 &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-3 py-1.5">
                      <MSkeleton className="h-12 rounded-2xl" />
                    </td>
                  </tr>
                ))}
              {!loading && feeds.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <MEmpty>Aucun flux suivi pour l’instant.</MEmpty>
                  </td>
                </tr>
              )}
              {feeds.map((feed) => {
                const cat = feed.categorie_id ? categoriesById[feed.categorie_id] : undefined
                return (
                  <tr
                    key={feed.id_flux}
                    className="[&>td]:border-t [&>td]:border-m-surface-3 hover:[&>td]:bg-m-surface-2 [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl"
                  >
                    <td className={TD}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-m-surface-3">
                          {feed.logo ? <img src={feed.logo} alt="" className="size-5 object-contain" /> : <Rss className="size-4 text-m-muted" />}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[32ch] truncate font-medium">{feed.nom}</p>
                          <p className="max-w-[32ch] truncate font-mono text-[11px] text-m-soft">{feed.url_site || feed.lien_rss}</p>
                        </div>
                      </div>
                    </td>
                    <td className={cn(TD, "hidden sm:table-cell")}>
                      <MPill tone="neutral" className="uppercase">{feed.type}</MPill>
                    </td>
                    <td className={cn(TD, "hidden md:table-cell")}>
                      {cat ? (
                        <span className="flex items-center gap-2 text-[13px] text-m-body">
                          <span className="size-2 rounded-full" style={{ backgroundColor: cat.couleur }} />
                          {cat.libelle}
                        </span>
                      ) : (
                        <span className="text-m-muted">—</span>
                      )}
                    </td>
                    <td className={TD}>
                      <span className="flex items-center gap-2 font-mono text-[12px] whitespace-nowrap text-m-strong">
                        <MDot className={freshness(feed.last_crawled_at)} />
                        {formatDate(feed.last_crawled_at)}
                      </span>
                    </td>
                    <td className={cn(TD, "text-right")}>
                      <MButton
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Ne plus suivre ${feed.nom}`}
                        className="hover:bg-m-peach hover:text-m-orange-text"
                        onClick={() => setRemoving(feed)}
                      >
                        <Trash2 className="size-3.5!" />
                      </MButton>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </MCard>

      <AddFluxDialog open={addOpen} onOpenChange={setAddOpen} categories={categories} categoriesById={categoriesById} onAdded={refresh} />
      <MDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Ne plus suivre « ${removing?.nom ?? ""} » ?`}
        description="Ses articles n’apparaîtront plus dans ton fil."
        footer={
          <>
            <MButton variant="light" onClick={() => setRemoving(null)} disabled={busy}>
              Annuler
            </MButton>
            <MButton variant="danger" onClick={handleDelete} disabled={busy}>
              {busy ? "Retrait…" : "Ne plus suivre"}
            </MButton>
          </>
        }
      />
    </MainLayout>
  )
}
