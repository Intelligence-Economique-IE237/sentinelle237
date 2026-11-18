import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "@/components/mira/toast-manager"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { createCategorieFlux, deleteCategorieFlux, updateCategorieFlux } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import { getCategoriesFlux } from "@/lib/api/feeds"
import type { CategorieFlux, CategorieFluxPayload } from "@/lib/api/types"
import {
  MButton,
  MCard,
  MCardHeader,
  MDialog,
  MEmpty,
  MField,
  MHero,
  MInput,
  MPill,
  MSkeleton,
  MTile,
} from "@/components/mira/mira"

const EMPTY_FORM: CategorieFluxPayload = { code: "", libelle: "", couleur: "#8fd94e", description: "" }

export function AdminCategoriesTab() {
  const { data, loading, refresh } = useCachedFetch<CategorieFlux[]>(
    "categories-flux",
    getCategoriesFlux,
    30 * 60 * 1000
  )
  const categories = data ?? []

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<CategorieFlux | null>(null)
  const [form, setForm] = useState<CategorieFluxPayload>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<CategorieFlux | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  function openEdit(cat: CategorieFlux) {
    setEditing(cat)
    setForm({ code: cat.code, libelle: cat.libelle, couleur: cat.couleur, description: cat.description ?? "" })
    setFormOpen(true)
  }

  async function handleSubmit() {
    if (!form.code.trim() || !form.libelle.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await updateCategorieFlux(editing.id_categorie, form)
        toast.add({ title: "Catégorie mise à jour", type: "success" })
      } else {
        await createCategorieFlux(form)
        toast.add({ title: "Catégorie créée", description: form.libelle, type: "success" })
      }
      await refresh()
      setFormOpen(false)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible d'enregistrer la catégorie"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteCategorieFlux(deleting.id_categorie)
      toast.add({ title: "Catégorie supprimée", description: deleting.libelle, type: "success" })
      await refresh()
      setDeleting(null)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de supprimer la catégorie"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setDeletingBusy(false)
    }
  }

  return (
    <>
      <MHero
        title="Catégories."
        subtitle="Le classement des flux de veille."
        stats={[{ value: loading && !data ? "…" : categories.length, label: "Catégories", dot: "bg-m-green" }]}
      />

      <MCard>
        <MCardHeader
          title="Toutes les catégories"
          subtitle="La couleur sert de repère dans le fil d’actualité."
          action={
            <MButton size="sm" onClick={openCreate}>
              <Plus className="size-3.5!" />
              <span className="max-sm:hidden">Nouvelle catégorie</span>
              <span className="sm:hidden">Ajouter</span>
            </MButton>
          }
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {loading &&
            categories.length === 0 &&
            Array.from({ length: 4 }, (_, i) => <MSkeleton key={i} className="h-[148px] rounded-[22px]" />)}

          {categories.map((cat) => (
            <MTile key={cat.id_categorie} className="group min-h-[148px]">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full ring-2 ring-m-surface"
                    style={{ backgroundColor: cat.couleur }}
                  />
                  <span className="truncate font-mono text-[11px] text-m-soft">{cat.code}</span>
                </span>
                <MPill tone="white" className="font-mono font-normal uppercase">
                  {cat.couleur}
                </MPill>
              </div>
              <p className="mt-4 text-[20px] leading-tight font-normal tracking-[-0.03em]">{cat.libelle}</p>
              {cat.description && <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-m-soft">{cat.description}</p>}
              <div className="mt-auto flex justify-end gap-1 pt-4">
                <MButton
                  variant="white"
                  size="icon-sm"
                  aria-label={`Modifier ${cat.libelle}`}
                  onClick={() => openEdit(cat)}
                >
                  <Pencil className="size-3.5!" />
                </MButton>
                <MButton
                  variant="white"
                  size="icon-sm"
                  aria-label={`Supprimer ${cat.libelle}`}
                  className="hover:bg-m-peach hover:text-m-orange-text"
                  onClick={() => setDeleting(cat)}
                >
                  <Trash2 className="size-3.5!" />
                </MButton>
              </div>
            </MTile>
          ))}
        </div>

        {!loading && categories.length === 0 && <MEmpty>Aucune catégorie pour l’instant</MEmpty>}
      </MCard>

      <MDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editing ? "Modifier la catégorie" : "Nouvelle catégorie"}
        description={editing ? "Le code ne peut pas être modifié." : "Le code identifie la catégorie côté API."}
        footer={
          <>
            <MButton variant="light" onClick={() => setFormOpen(false)} disabled={saving}>
              Annuler
            </MButton>
            <MButton onClick={handleSubmit} disabled={saving || !form.code.trim() || !form.libelle.trim()}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </MButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <MField label="Code" htmlFor="code">
            <MInput
              id="code"
              className="font-mono"
              value={form.code}
              onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
              disabled={!!editing}
            />
          </MField>
          <MField label="Libellé" htmlFor="libelle">
            <MInput
              id="libelle"
              value={form.libelle}
              onChange={(e) => setForm((prev) => ({ ...prev, libelle: e.target.value }))}
            />
          </MField>
          <MField label="Couleur" htmlFor="couleur">
            <div className="flex items-center gap-2">
              <label
                className="relative size-11 shrink-0 cursor-pointer overflow-hidden rounded-full ring-4 ring-m-surface-2"
                style={{ backgroundColor: form.couleur }}
              >
                <input
                  id="couleur"
                  type="color"
                  value={form.couleur}
                  onChange={(e) => setForm((prev) => ({ ...prev, couleur: e.target.value }))}
                  className="absolute inset-0 cursor-pointer opacity-0"
                  aria-label="Choisir une couleur"
                />
              </label>
              <MInput
                aria-label="Code couleur hexadécimal"
                className="font-mono uppercase"
                value={form.couleur}
                onChange={(e) => setForm((prev) => ({ ...prev, couleur: e.target.value }))}
              />
            </div>
          </MField>
          <MField label="Description" hint="(optionnel)" htmlFor="description">
            <MInput
              id="description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            />
          </MField>
        </div>
      </MDialog>

      <MDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Supprimer « ${deleting?.libelle ?? ""} » ?`}
        description="Les flux déjà classés dans cette catégorie perdront leur classement."
        footer={
          <>
            <MButton variant="light" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              Annuler
            </MButton>
            <MButton variant="danger" onClick={handleDelete} disabled={deletingBusy}>
              {deletingBusy ? "Suppression…" : "Supprimer"}
            </MButton>
          </>
        }
      />
    </>
  )
}
