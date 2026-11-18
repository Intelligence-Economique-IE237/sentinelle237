import { useMemo, useState } from "react"
import type React from "react"
import { Check, ChevronRight, Search } from "lucide-react"
import { toast } from "@/components/mira/toast-manager"
import { ApiError } from "@/lib/api/client"
import { addFlux, getFluxSuggestions, subscribeToFlux } from "@/lib/api/feeds"
import type { CategorieFlux, FluxSuggestion, FluxType } from "@/lib/api/types"
import { MButton, MDialog, MEmpty, MField, MInput, MSegmented, MSelect, MSkeleton } from "@/components/mira/mira"
import { cn } from "@/lib/utils"

const TYPE_OPTIONS: { value: FluxType; label: string }[] = [
  { value: "rss", label: "RSS / site web" },
  { value: "x", label: "X (Twitter)" },
  { value: "youtube", label: "YouTube" },
  { value: "telegram", label: "Telegram" },
]

const IDENTIFIANT: Record<FluxType, { label: string; placeholder: string }> = {
  rss: { label: "Domaine ou URL du flux", placeholder: "lemonde.fr" },
  x: { label: "Nom d’utilisateur (sans @)", placeholder: "elonmusk" },
  youtube: { label: "URL de la chaîne", placeholder: "https://youtube.com/@chaine" },
  telegram: { label: "Nom du canal (sans @)", placeholder: "nomducanal" },
}

const EMPTY_FORM = { identifiant: "", type: "rss" as FluxType, nom: "", categorie: "" }
const NO_CATEGORY = "__none__"

export function AddFluxDialog({
  open,
  onOpenChange,
  categories,
  categoriesById,
  onAdded,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: CategorieFlux[]
  categoriesById: Record<string, CategorieFlux>
  onAdded: () => Promise<unknown> | void
}) {
  const [tab, setTab] = useState<"add" | "catalog">("add")
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [catalog, setCatalog] = useState<FluxSuggestion[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogSearch, setCatalogSearch] = useState("")
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  function switchTab(next: "add" | "catalog") {
    setTab(next)
    if (next === "catalog" && catalog.length === 0 && !catalogLoading) {
      setCatalogLoading(true)
      getFluxSuggestions({ limit: 100 })
        .then(setCatalog)
        .catch(() => toast.add({ title: "Impossible de charger le catalogue", type: "error" }))
        .finally(() => setCatalogLoading(false))
    }
  }

  const catalogByCategory = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase()
    const list = q ? catalog.filter((s) => s.nom.toLowerCase().includes(q)) : catalog
    return list.reduce<Record<string, FluxSuggestion[]>>((acc, s) => {
      const label = (s.categorie_id && categoriesById[s.categorie_id]?.libelle) || "Non classé"
      ;(acc[label] ??= []).push(s)
      return acc
    }, {})
  }, [catalog, catalogSearch, categoriesById])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.identifiant.trim()) return
    setSaving(true)
    try {
      const res = await addFlux({
        identifiant: form.identifiant,
        type: form.type,
        nom: form.nom || undefined,
        categorie: form.categorie || undefined,
      })
      await onAdded()
      toast.add({
        title: res.alreadyExisted ? "Abonné au flux existant" : "Flux ajouté",
        description: res.flux.nom,
        type: "success",
      })
      setForm(EMPTY_FORM)
      onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.status === 400
            ? "Vérifie les informations saisies"
            : err.status === 409
              ? "Tu es déjà abonné à ce flux"
              : err.status === 422
                ? "Ce site est inaccessible, bloque les robots, ou aucun flux n’a été détecté"
                : err.message
          : "Impossible de contacter le serveur"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleSubscribe(s: FluxSuggestion) {
    if (s.isSubscribed) return
    try {
      await subscribeToFlux(s.id_flux)
      await onAdded()
      setCatalog((prev) => prev.map((x) => (x.id_flux === s.id_flux ? { ...x, isSubscribed: true } : x)))
      toast.add({ title: "Abonné", description: s.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de suivre ce flux", type: "error" })
    }
  }

  return (
    <MDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Ajouter un flux"
      description="Ajoute ta propre source, ou choisis dans le catalogue."
      className="max-w-lg"
    >
      <MSegmented
        value={tab}
        onChange={switchTab}
        className="w-full"
        itemClassName="flex-1"
        items={[
          { value: "add", label: "Ma source" },
          { value: "catalog", label: "Catalogue" },
        ]}
      />

      {tab === "add" ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <MField label="Type de source">
            <MSelect
              ariaLabel="Type de source"
              value={form.type}
              onChange={(type) => setForm((f) => ({ ...f, type }))}
              options={TYPE_OPTIONS}
              className="w-full rounded-2xl"
            />
          </MField>
          <MField label={IDENTIFIANT[form.type].label} htmlFor="flux-identifiant">
            <MInput
              id="flux-identifiant"
              autoComplete="off"
              value={form.identifiant}
              placeholder={IDENTIFIANT[form.type].placeholder}
              onChange={(e) => setForm((f) => ({ ...f, identifiant: e.target.value }))}
            />
          </MField>
          <MField label="Nom affiché" hint="(optionnel)" htmlFor="flux-nom">
            <MInput
              id="flux-nom"
              value={form.nom}
              placeholder="Laisse vide pour utiliser le nom détecté"
              onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            />
          </MField>
          <MField label="Catégorie" hint="(optionnel)">
            <MSelect
              ariaLabel="Catégorie"
              value={form.categorie || NO_CATEGORY}
              onChange={(v) => setForm((f) => ({ ...f, categorie: v === NO_CATEGORY ? "" : v }))}
              options={[
                { value: NO_CATEGORY, label: "Aucune" },
                ...categories.map((c) => ({ value: c.code, label: c.libelle })),
              ]}
              className="w-full rounded-2xl"
            />
          </MField>
          <MButton type="submit" disabled={saving || !form.identifiant.trim()} className="mt-1 w-full">
            {saving ? "Ajout en cours…" : "Ajouter le flux"}
          </MButton>
        </form>
      ) : (
        <div className="flex min-h-0 flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-m-muted" />
            <MInput
              aria-label="Rechercher dans le catalogue"
              placeholder="Rechercher dans le catalogue…"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="rounded-full pl-11"
            />
          </div>
          <div className="-mx-1 max-h-[46svh] overflow-y-auto px-1">
            {catalogLoading &&
              Array.from({ length: 4 }, (_, i) => <MSkeleton key={i} className="mb-2 h-11 rounded-2xl" />)}
            {!catalogLoading && Object.keys(catalogByCategory).length === 0 && <MEmpty>Aucun résultat</MEmpty>}
            {Object.entries(catalogByCategory).map(([label, items]) => {
              const isOpen = catalogSearch.trim() ? true : (openGroups[label] ?? false)
              return (
                <div key={label} className="mb-1">
                  <button
                    type="button"
                    onClick={() => setOpenGroups((g) => ({ ...g, [label]: !isOpen }))}
                    className="flex h-10 w-full cursor-pointer items-center gap-2 rounded-xl px-2 text-left text-sm font-medium hover:bg-m-surface-2"
                  >
                    <ChevronRight className={cn("size-4 text-m-muted transition-transform", isOpen && "rotate-90")} />
                    {label}
                    <span className="font-mono text-[11px] text-m-muted">{items.length}</span>
                  </button>
                  {isOpen && (
                    <div className="flex flex-col gap-1 py-1 pl-6">
                      {items.map((s) => (
                        <div key={s.id_flux} className="flex items-center gap-3 rounded-2xl bg-m-surface-2 py-1.5 pr-1.5 pl-3.5">
                          <span className="min-w-0 flex-1 truncate text-[13px]" title={s.nom}>
                            {s.nom}
                          </span>
                          <MButton
                            size="sm"
                            variant={s.isSubscribed ? "white" : "dark"}
                            disabled={s.isSubscribed}
                            className="h-8 px-3 text-[12px]"
                            onClick={() => handleSubscribe(s)}
                          >
                            {s.isSubscribed ? (
                              <>
                                <Check className="size-3.5!" /> Suivi
                              </>
                            ) : (
                              "Suivre"
                            )}
                          </MButton>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </MDialog>
  )
}
