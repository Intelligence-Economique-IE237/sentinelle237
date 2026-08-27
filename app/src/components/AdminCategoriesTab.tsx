import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { createCategorieFlux, deleteCategorieFlux, updateCategorieFlux } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import { getCategoriesFlux } from "@/lib/api/feeds"
import type { CategorieFlux, CategorieFluxPayload } from "@/lib/api/types"

const EMPTY_FORM: CategorieFluxPayload = { code: "", libelle: "", couleur: "#6366f1", description: "" }

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{categories.length} catégorie(s)</p>
        <Button size="sm" className="gap-1.5" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          Nouvelle catégorie
        </Button>
      </div>

      {loading && <p className="py-8 text-center text-sm text-muted-foreground">Chargement...</p>}
      {!loading && categories.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">Aucune catégorie pour l'instant</p>
      )}

      <div className="space-y-2">
        {categories.map((cat) => (
          <div key={cat.id_categorie} className="flex items-center gap-3 rounded-lg border p-3">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.couleur }} />
            <div className="flex-1">
              <p className="text-sm font-medium">{cat.libelle}</p>
              <p className="text-xs text-muted-foreground">{cat.code}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(cat)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setDeleting(cat)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier la catégorie" : "Nouvelle catégorie"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                disabled={!!editing}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="libelle">Libellé</Label>
              <Input
                id="libelle"
                value={form.libelle}
                onChange={(e) => setForm((prev) => ({ ...prev, libelle: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="couleur">Couleur</Label>
              <div className="flex items-center gap-2">
                <input
                  id="couleur"
                  type="color"
                  value={form.couleur}
                  onChange={(e) => setForm((prev) => ({ ...prev, couleur: e.target.value }))}
                  className="h-9 w-12 rounded border"
                />
                <Input
                  value={form.couleur}
                  onChange={(e) => setForm((prev) => ({ ...prev, couleur: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer "{deleting?.libelle}" ?</DialogTitle>
            <DialogDescription>
              Les flux déjà classés dans cette catégorie perdront leur classement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingBusy}>
              {deletingBusy ? "Suppression..." : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
