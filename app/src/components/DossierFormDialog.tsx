import { useState } from "react"
import type React from "react"
import { MButton, MDialog, MField, MInput, MTextarea } from "@/components/mira/mira"
import type { Dossier } from "@/lib/api/types"

const emptyForm = { nom: "", description: "" }
type DossierFormValues = typeof emptyForm

interface DossierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingDossier: Dossier | null
  onSubmit: (values: DossierFormValues) => Promise<void> | void
}

export function DossierFormDialog({ open, onOpenChange, editingDossier, onSubmit }: DossierFormDialogProps) {
  return (
    <MDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingDossier ? "Modifier le dossier" : "Nouveau dossier"}
      description="Regroupe des flux et des alertes liés à une même enquête."
    >
      <DossierForm key={`${editingDossier?.id_dossier ?? "new"}-${open}`} editingDossier={editingDossier} onSubmit={onSubmit} />
    </MDialog>
  )
}

function DossierForm({
  editingDossier,
  onSubmit,
}: {
  editingDossier: Dossier | null
  onSubmit: (values: DossierFormValues) => Promise<void> | void
}) {
  const [form, setForm] = useState<DossierFormValues>(() =>
    editingDossier ? { nom: editingDossier.nom, description: editingDossier.description ?? "" } : emptyForm
  )
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
    } catch {
      // l'erreur est déjà affichée en toast par le parent
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <MField label="Nom du dossier" htmlFor="dossier-nom">
        <MInput
          id="dossier-nom"
          value={form.nom}
          onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
          placeholder="Sécurité frontalière Nord"
        />
      </MField>
      <MField label="Description" hint="(optionnel)" htmlFor="dossier-description">
        <MTextarea
          id="dossier-description"
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </MField>
      <MButton type="submit" disabled={saving || !form.nom.trim()} className="mt-1 w-full">
        {saving ? "Enregistrement…" : editingDossier ? "Enregistrer" : "Créer le dossier"}
      </MButton>
    </form>
  )
}
