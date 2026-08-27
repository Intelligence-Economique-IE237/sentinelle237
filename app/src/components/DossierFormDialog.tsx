import { useEffect, useState } from "react"
import type React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Dossier } from "@/lib/api/types"

const emptyForm = { nom: "", description: "" }

interface DossierFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingDossier: Dossier | null
  onSubmit: (values: typeof emptyForm) => Promise<void> | void
}

export function DossierFormDialog({
  open,
  onOpenChange,
  editingDossier,
  onSubmit,
}: DossierFormDialogProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingDossier) {
      setForm({ nom: editingDossier.nom, description: editingDossier.description ?? "" })
    } else {
      setForm(emptyForm)
    }
  }, [editingDossier, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nom.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingDossier ? "Modifier le dossier" : "Nouveau dossier"}</DialogTitle>
          <DialogDescription>
            Regroupe des flux et des alertes liés à une même enquête
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du dossier</Label>
            <Input
              id="nom"
              value={form.nom}
              onChange={(e) => setForm((prev) => ({ ...prev, nom: e.target.value }))}
              placeholder="Sécurité frontalière Nord"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Enregistrement..." : editingDossier ? "Enregistrer" : "Créer le dossier"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}