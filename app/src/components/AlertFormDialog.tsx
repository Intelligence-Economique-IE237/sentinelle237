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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Alerte, Frequence, Langue, NombreResultats } from "@/lib/api/types"

export const FREQUENCE_LABELS: Record<Frequence, string> = {
  immediat: "Immédiat",
  quotidien: "Digest quotidien",
  hebdomadaire: "Digest hebdomadaire",
}

export const LANGUE_LABELS: Record<Langue, string> = {
  toutes: "Toutes langues",
  fr: "Français",
  en: "Anglais",
  es: "Espagnol",
  zh: "Chinois",
  hi: "Hindi",
  ar: "Arabe",
  pt: "Portugais",
  ru: "Russe",
  ja: "Japonais",
  de: "Allemand",
}

const emptyForm = {
  mot_cle: "",
  frequence: "immediat" as Frequence,
  langue: "toutes" as Langue,
  pays: "",
  nombre_resultats: "meilleurs" as NombreResultats,
}

interface AlertFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingAlerte: Alerte | null
  onSubmit: (values: typeof emptyForm) => Promise<void> | void
}

export function AlertFormDialog({
  open,
  onOpenChange,
  editingAlerte,
  onSubmit,
}: AlertFormDialogProps) {
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (editingAlerte) {
      setForm({
        mot_cle: editingAlerte.mot_cle,
        frequence: editingAlerte.frequence,
        langue: editingAlerte.langue,
        pays: editingAlerte.pays ?? "",
        nombre_resultats: editingAlerte.nombre_resultats,
      })
    } else {
      setForm(emptyForm)
    }
  }, [editingAlerte, open])

  function updateForm<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.mot_cle.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
    } catch {
      // l'erreur est déjà affichée en toast par le parent (Dashboard.tsx) —
      // on garde juste le formulaire ouvert en ne fermant pas le dialog ici
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editingAlerte ? "Modifier l'alerte" : "Nouvelle alerte"}</DialogTitle>
          <DialogDescription>
            Reçois une notification dès qu'un mot-clé apparaît dans tes flux
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mot_cle">Mot-clé</Label>
            <Input
              id="mot_cle"
              value={form.mot_cle}
              onChange={(e) => updateForm("mot_cle", e.target.value)}
              placeholder="Cameroun"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequence">Fréquence</Label>
            <Select
              value={form.frequence}
              onValueChange={(v) => updateForm("frequence", v as Frequence)}
            >
              <SelectTrigger id="frequence" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FREQUENCE_LABELS) as Frequence[]).map((f) => (
                  <SelectItem key={f} value={f}>
                    {FREQUENCE_LABELS[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="langue">Langue</Label>
              <Select value={form.langue} onValueChange={(v) => updateForm("langue", v as Langue)}>
                <SelectTrigger id="langue" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(LANGUE_LABELS) as Langue[]).map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANGUE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pays">Pays (optionnel)</Label>
              <Input
                id="pays"
                value={form.pays}
                onChange={(e) => updateForm("pays", e.target.value.toUpperCase())}
                placeholder="CM"
                maxLength={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombre_resultats">Résultats par email</Label>
            <Select
              value={form.nombre_resultats}
              onValueChange={(v) => updateForm("nombre_resultats", v as NombreResultats)}
            >
              <SelectTrigger id="nombre_resultats" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meilleurs">Meilleurs (top 5)</SelectItem>
                <SelectItem value="tous">Tous les résultats</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Enregistrement..." : editingAlerte ? "Enregistrer" : "Créer l'alerte"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}