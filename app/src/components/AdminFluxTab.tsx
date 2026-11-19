import { useState } from "react"
import { Rss, Upload } from "lucide-react"
import { toast } from "@/components/mira/toast-manager"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { getAllFluxAdmin, importOpml, updateFluxAdmin } from "@/lib/api/admin"
import { getCategoriesFlux } from "@/lib/api/feeds"
import { FLUX_ZONES, type AdminFluxItem, type CategorieFlux, type FluxZone } from "@/lib/api/types"
import { ApiError } from "@/lib/api/client"
import {
  MButton,
  MCard,
  MCardHeader,
  MDialog,
  MDot,
  MField,
  MHero,
  MInput,
  MPagination,
  MPill,
  MSegmented,
  MSelect,
  MSkeleton,
  MTextarea,
} from "@/components/mira/mira"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20
const DAY = 24 * 60 * 60 * 1000

const TH = "px-3 pb-3 text-left font-mono text-[10px] font-normal tracking-wide text-m-muted uppercase"
const TD = "px-3 py-3 align-middle"

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

/** Fraîcheur de la dernière collecte : < 24 h, < 7 j, au-delà / jamais. */
function freshnessDot(iso: string | null) {
  if (!iso) return "bg-m-ring"
  const age = Date.now() - new Date(iso).getTime()
  if (age < DAY) return "bg-m-green"
  if (age < 7 * DAY) return "bg-m-sand"
  return "bg-m-orange"
}

export function AdminFluxTab() {
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)

  const {
    data: result,
    loading,
    refresh,
  } = useCachedFetch(
    `admin-flux:${page}`,
    () => getAllFluxAdmin({ page, limit: PAGE_SIZE }),
    30 * 1000,
    [page]
  )
  const { data: categoriesData } = useCachedFetch<CategorieFlux[]>("categories-flux", getCategoriesFlux, 30 * 60 * 1000)
  const categories = categoriesData ?? []
  const items = result?.flux ?? []
  const total = result?.pagination.total ?? 0
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <>
      <MHero
        title="Flux."
        subtitle="Les sources surveillées par Sentinelle."
        stats={[{ value: loading && !result ? "…" : total, label: "Flux au total", dot: "bg-m-ink" }]}
      />

      <MCard>
        <MCardHeader
          title="Sources"
          subtitle="Pastille verte : collecte de moins de 24 h. Jaune : moins de 7 jours."
          action={
            <MButton size="sm" onClick={() => setImportOpen(true)}>
              <Upload className="size-3.5!" />
              <span className="max-sm:hidden">Importer un OPML</span>
              <span className="sm:hidden">OPML</span>
            </MButton>
          }
        />

        <div className="-mx-3 mt-6 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={TH}>Nom</th>
                <th className={TH}>Type</th>
                <th className={cn(TH, "hidden sm:table-cell")}>Zone</th>
                <th className={cn(TH, "hidden sm:table-cell")}>Catégorie</th>
                <th className={cn(TH, "hidden md:table-cell")}>Dernière collecte</th>
                <th className={cn(TH, "hidden lg:table-cell")}>Créé par</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                items.length === 0 &&
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-3 py-1.5">
                      <MSkeleton className="h-12 rounded-2xl" />
                    </td>
                  </tr>
                ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-sm text-m-muted">
                    Aucun flux
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr
                  key={item.id_flux}
                  className="[&>td]:border-t [&>td]:border-m-surface-3 hover:[&>td]:bg-m-surface-2 [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl"
                >
                  <td className={TD}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-m-surface-3">
                        {item.logo ? (
                          <img src={item.logo} alt="" className="size-5 object-contain" />
                        ) : (
                          <Rss className="size-4 text-m-muted" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="max-w-[32ch] truncate font-medium">{item.nom}</p>
                        <p className="flex items-center gap-1.5 text-[12px] text-m-soft md:hidden">
                          <MDot className={freshnessDot(item.last_crawled_at)} />
                          {formatDate(item.last_crawled_at)}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className={TD}>
                    <MPill tone="neutral" className="uppercase">
                      {item.type}
                    </MPill>
                  </td>
                  <td className={cn(TD, "hidden sm:table-cell")}>
                    <ZoneSelect item={item} onUpdated={refresh} />
                  </td>
                  <td className={cn(TD, "hidden sm:table-cell")}>
                    <CategorieSelect item={item} categories={categories} onUpdated={refresh} />
                  </td>
                  <td className={cn(TD, "hidden md:table-cell")}>
                    <span className="flex items-center gap-2 font-mono text-[12px] text-m-strong">
                      <MDot className={freshnessDot(item.last_crawled_at)} />
                      {formatDate(item.last_crawled_at)}
                    </span>
                  </td>
                  <td
                    className={cn(TD, "hidden font-mono text-[11px] text-m-muted lg:table-cell")}
                    title={item.created_by ?? undefined}
                  >
                    {item.created_by ? `${item.created_by.slice(0, 8)}…` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <MPagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </MCard>

      <ImportOpmlDialog open={importOpen} onOpenChange={setImportOpen} onImported={refresh} />
    </>
  )
}

const ZONE_OPTIONS = FLUX_ZONES.map((z) => ({ value: z, label: z.charAt(0).toUpperCase() + z.slice(1) }))

/** Sélecteur de zone en ligne : l'enregistrement part dès le choix. */
function ZoneSelect({ item, onUpdated }: { item: AdminFluxItem; onUpdated: () => void }) {
  const [zone, setZone] = useState<FluxZone>(item.zone as FluxZone)
  const [saving, setSaving] = useState(false)

  async function handleChange(next: FluxZone) {
    if (next === zone) return
    const previous = zone
    setZone(next)
    setSaving(true)
    try {
      await updateFluxAdmin(item.id_flux, { zone: next })
      toast.add({ title: "Zone mise à jour", description: `${item.nom} → ${next}`, type: "success" })
      onUpdated()
    } catch (err) {
      setZone(previous)
      const message = err instanceof ApiError ? err.message : "Impossible de modifier la zone"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <MSelect
      ariaLabel={`Zone de ${item.nom}`}
      value={zone}
      onChange={handleChange}
      options={ZONE_OPTIONS}
      className={cn("h-8 w-36 pr-2 pl-3 text-[13px]", saving && "opacity-60")}
    />
  )
}

const AUCUNE = "__aucune__"

/** Sélecteur de catégorie en ligne : l'enregistrement part dès le choix. */
function CategorieSelect({
  item,
  categories,
  onUpdated,
}: {
  item: AdminFluxItem
  categories: CategorieFlux[]
  onUpdated: () => void
}) {
  const [categorieId, setCategorieId] = useState<string>(item.categorie_id ?? AUCUNE)
  const [saving, setSaving] = useState(false)

  const options = [
    { value: AUCUNE, label: "Aucune" },
    ...categories.map((c) => ({
      value: c.id_categorie,
      label: c.libelle,
      icon: <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.couleur }} />,
    })),
  ]

  async function handleChange(next: string) {
    if (next === categorieId) return
    const previous = categorieId
    setCategorieId(next)
    setSaving(true)
    try {
      await updateFluxAdmin(item.id_flux, { categorie_id: next === AUCUNE ? null : next })
      const libelle = categories.find((c) => c.id_categorie === next)?.libelle ?? "aucune"
      toast.add({ title: "Catégorie mise à jour", description: `${item.nom} → ${libelle}`, type: "success" })
      onUpdated()
    } catch (err) {
      setCategorieId(previous)
      const message = err instanceof ApiError ? err.message : "Impossible de modifier la catégorie"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <MSelect
      ariaLabel={`Catégorie de ${item.nom}`}
      value={categorieId}
      onChange={handleChange}
      options={options}
      className={cn("h-8 w-44 pr-2 pl-3 text-[13px]", saving && "opacity-60")}
    />
  )
}

function ImportOpmlDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}) {
  const [mode, setMode] = useState<"url" | "content">("url")
  const [opmlUrl, setOpmlUrl] = useState("")
  const [opmlContent, setOpmlContent] = useState("")
  const [zone, setZone] = useState("")
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    if (mode === "url" && !opmlUrl.trim()) return
    if (mode === "content" && !opmlContent.trim()) return
    setImporting(true)
    try {
      const res = await importOpml({
        opmlUrl: mode === "url" ? opmlUrl : undefined,
        opmlContent: mode === "content" ? opmlContent : undefined,
        zone: zone || undefined,
      })
      toast.add({
        title: "Import terminé",
        description: `${res.importedCount} flux importés, ${res.skippedCount} ignorés`,
        type: "success",
      })
      onImported()
      onOpenChange(false)
      setOpmlUrl("")
      setOpmlContent("")
      setZone("")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible d'importer le fichier OPML"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setImporting(false)
    }
  }

  return (
    <MDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Importer un OPML"
      description="Import en masse de flux depuis une URL ou un contenu OPML."
      footer={
        <>
          <MButton variant="light" onClick={() => onOpenChange(false)} disabled={importing}>
            Annuler
          </MButton>
          <MButton onClick={handleImport} disabled={importing}>
            {importing ? "Import en cours…" : "Importer"}
          </MButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <MSegmented
          value={mode}
          onChange={setMode}
          className="w-full"
          itemClassName="flex-1"
          items={[
            { value: "url", label: "Depuis une URL" },
            { value: "content", label: "Coller le contenu" },
          ]}
        />
        {mode === "url" ? (
          <MField label="URL du fichier OPML" htmlFor="opmlUrl">
            <MInput
              id="opmlUrl"
              type="url"
              value={opmlUrl}
              onChange={(e) => setOpmlUrl(e.target.value)}
              placeholder="https://exemple.com/flux.opml"
            />
          </MField>
        ) : (
          <MField label="Contenu OPML" htmlFor="opmlContent">
            <MTextarea
              id="opmlContent"
              value={opmlContent}
              onChange={(e) => setOpmlContent(e.target.value)}
              rows={6}
              className="font-mono text-[12px]"
              placeholder="<opml>…</opml>"
            />
          </MField>
        )}
        <MField label="Zone" hint="(optionnel)" htmlFor="zone">
          <MInput id="zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="ex : afrique" />
        </MField>
      </div>
    </MDialog>
  )
}
