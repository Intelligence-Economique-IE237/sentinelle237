import { useState } from "react"
import { ArrowUp, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { retrainMl, submitMlFeedback } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import {
  MButton,
  MCard,
  MCardHeader,
  MField,
  MHero,
  MInput,
  MPill,
  MRuler,
  MTextarea,
} from "@/components/admin/mira"
import { cn } from "@/lib/utils"

export function AdminMLTab() {
  const [texte, setTexte] = useState("")
  const [label, setLabel] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [retraining, setRetraining] = useState(false)
  const [sentCount, setSentCount] = useState(0)

  async function handleSubmitFeedback() {
    if (!texte.trim() || !label.trim()) {
      toast.add({ title: "Texte et label requis", type: "error" })
      return
    }
    setSubmitting(true)
    try {
      await submitMlFeedback({ texte, label })
      toast.add({ title: "Exemple ajouté au dataset", type: "success" })
      setTexte("")
      setLabel("")
      setSentCount((n) => n + 1)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de soumettre l'exemple"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRetrain() {
    setRetraining(true)
    try {
      await retrainMl()
      toast.add({ title: "Ré-entraînement lancé", type: "success" })
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de lancer le ré-entraînement"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setRetraining(false)
    }
  }

  return (
    <>
      <MHero
        title="Machine Learning."
        subtitle="Affinez le modèle de classification."
        stats={[{ value: sentCount, label: "Exemples envoyés", dot: "bg-m-green" }]}
      />

      <div className="grid gap-[18px] lg:grid-cols-12">
        <MCard className="lg:col-span-7">
          <MCardHeader
            title="Soumettre un exemple étiqueté"
            subtitle="Ajoute un exemple au dataset d’entraînement du classifieur."
            action={<MPill tone="lime">Dataset</MPill>}
          />
          <form
            className="mt-6 flex flex-1 flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmitFeedback()
            }}
          >
            <MField label="Texte" htmlFor="ml-texte">
              <MTextarea
                id="ml-texte"
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                rows={5}
                placeholder="Collez ici le titre ou l’extrait d’un article…"
              />
            </MField>
            <div className="mt-auto flex items-center gap-2 rounded-full bg-m-surface-2 py-1.5 pr-1.5 pl-1">
              <MInput
                id="ml-label"
                aria-label="Label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (ex : economie)"
                className="h-10 rounded-full bg-transparent"
              />
              <MButton
                type="submit"
                size="icon"
                aria-label="Soumettre l’exemple"
                disabled={submitting}
                className="[&_svg]:text-m-lime"
              >
                <ArrowUp className={cn(submitting && "animate-pulse")} />
              </MButton>
            </div>
          </form>
        </MCard>

        <MCard tone="dark" className="min-h-[360px] lg:col-span-5">
          <MCardHeader
            dark
            title="Ré-entraînement du modèle"
            subtitle="Force un ré-entraînement immédiat, sans attendre le seuil automatique."
            action={
              <MPill tone="glass" className="h-7 px-3 text-[12px] font-medium">
                {retraining ? "En cours" : "Prêt"}
              </MPill>
            }
          />
          <div className="mt-auto flex flex-col gap-6 pt-8">
            <p className="flex items-end gap-3">
              <span className="text-[72px] leading-[0.9] font-light tracking-[-0.06em] tabular-nums sm:text-[88px]">
                {sentCount}
              </span>
              <span className="pb-1.5 text-sm text-white/80">
                nouvel{sentCount > 1 ? "s" : ""} exemple{sentCount > 1 ? "s" : ""} cette session
              </span>
            </p>
            <MRuler value={Math.min(1, sentCount / 20)} labels={["0", "5", "10", "15", "20"]} />
            <MButton variant="lime" onClick={handleRetrain} disabled={retraining} className="w-full">
              <RefreshCw className={cn(retraining && "animate-spin")} />
              {retraining ? "Ré-entraînement en cours…" : "Lancer le ré-entraînement"}
            </MButton>
          </div>
        </MCard>
      </div>
    </>
  )
}
