import { useState } from "react"
import type React from "react"
import { MButton, MDialog, MField, MInput, MSelect } from "@/components/mira/mira"
import { FREQUENCE_LABELS, LANGUE_LABELS } from "@/lib/labels"
import type { Alerte, Frequence, Langue, NombreResultats } from "@/lib/api/types"

const emptyForm = {
  mot_cle: "",
  frequence: "immediat" as Frequence,
  langue: "toutes" as Langue,
  pays: "",
  nombre_resultats: "meilleurs" as NombreResultats,
}
type AlertFormValues = typeof emptyForm

const FREQUENCE_OPTIONS = (Object.keys(FREQUENCE_LABELS) as Frequence[]).map((f) => ({ value: f, label: FREQUENCE_LABELS[f] }))
const LANGUE_OPTIONS = (Object.keys(LANGUE_LABELS) as Langue[]).map((l) => ({ value: l, label: LANGUE_LABELS[l] }))
const NOMBRE_OPTIONS: { value: NombreResultats; label: string }[] = [
  { value: "meilleurs", label: "Meilleurs (top 5)" },
  { value: "tous", label: "Tous les résultats" },
]

interface AlertFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingAlerte: Alerte | null
  onSubmit: (values: AlertFormValues) => Promise<void> | void
}

export function AlertFormDialog({ open, onOpenChange, editingAlerte, onSubmit }: AlertFormDialogProps) {
  return (
    <MDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editingAlerte ? "Modifier l’alerte" : "Nouvelle alerte"}
      description="Reçois une notification dès qu’un mot-clé apparaît dans tes flux."
    >
      {/* La clé réinitialise le formulaire à chaque ouverture ou changement d'alerte */}
      <AlertForm key={`${editingAlerte?.id_alerte ?? "new"}-${open}`} editingAlerte={editingAlerte} onSubmit={onSubmit} />
    </MDialog>
  )
}

function AlertForm({
  editingAlerte,
  onSubmit,
}: {
  editingAlerte: Alerte | null
  onSubmit: (values: AlertFormValues) => Promise<void> | void
}) {
  const [form, setForm] = useState<AlertFormValues>(() =>
    editingAlerte
      ? {
          mot_cle: editingAlerte.mot_cle,
          frequence: editingAlerte.frequence,
          langue: editingAlerte.langue,
          pays: editingAlerte.pays ?? "",
          nombre_resultats: editingAlerte.nombre_resultats,
        }
      : emptyForm
  )
  const [saving, setSaving] = useState(false)

  function update<K extends keyof AlertFormValues>(field: K, value: AlertFormValues[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.mot_cle.trim()) return
    setSaving(true)
    try {
      await onSubmit(form)
    } catch {
      // l'erreur est déjà affichée en toast par le parent : on garde le formulaire ouvert
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <MField label="Mot-clé" htmlFor="mot_cle">
        <MInput id="mot_cle" value={form.mot_cle} onChange={(e) => update("mot_cle", e.target.value)} placeholder="Cameroun" />
      </MField>
      <MField label="Fréquence">
        <MSelect ariaLabel="Fréquence" value={form.frequence} onChange={(v) => update("frequence", v)} options={FREQUENCE_OPTIONS} className="w-full rounded-2xl" />
      </MField>
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <MField label="Langue">
          <MSelect ariaLabel="Langue" value={form.langue} onChange={(v) => update("langue", v)} options={LANGUE_OPTIONS} className="w-full rounded-2xl" />
        </MField>
        <MField label="Pays" hint="(opt.)" htmlFor="pays">
          <MInput
            id="pays"
            value={form.pays}
            onChange={(e) => update("pays", e.target.value.toUpperCase())}
            placeholder="CM"
            maxLength={2}
            className="font-mono uppercase"
          />
        </MField>
      </div>
      <MField label="Résultats par email">
        <MSelect
          ariaLabel="Résultats par email"
          value={form.nombre_resultats}
          onChange={(v) => update("nombre_resultats", v)}
          options={NOMBRE_OPTIONS}
          className="w-full rounded-2xl"
        />
      </MField>
      <MButton type="submit" disabled={saving || !form.mot_cle.trim()} className="mt-1 w-full">
        {saving ? "Enregistrement…" : editingAlerte ? "Enregistrer" : "Créer l’alerte"}
      </MButton>
    </form>
  )
}
