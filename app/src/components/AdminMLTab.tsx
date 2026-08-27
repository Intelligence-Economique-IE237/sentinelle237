import { useState } from "react"
import { Brain, RefreshCw, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"
import { retrainMl, submitMlFeedback } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"

export function AdminMLTab() {
  const [texte, setTexte] = useState("")
  const [label, setLabel] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [retraining, setRetraining] = useState(false)

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
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-4 w-4" />
            Soumettre un exemple étiqueté
          </CardTitle>
          <CardDescription>Ajoute un exemple au dataset d'entraînement</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ml-texte">Texte</Label>
            <textarea
              id="ml-texte"
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              rows={4}
              className="w-full rounded-md border bg-transparent p-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ml-label">Label</Label>
            <Input id="ml-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <Button onClick={handleSubmitFeedback} disabled={submitting} className="w-full">
            {submitting ? "Envoi..." : "Soumettre"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4" />
            Ré-entraînement du modèle
          </CardTitle>
          <CardDescription>
            Force un ré-entraînement immédiat, sans attendre le seuil automatique
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleRetrain}
            disabled={retraining}
            variant="outline"
            className="w-full gap-2"
          >
            <RefreshCw className={retraining ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {retraining ? "Ré-entraînement en cours..." : "Lancer le ré-entraînement"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
