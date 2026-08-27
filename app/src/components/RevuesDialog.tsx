import { useEffect, useState } from "react"
import type React from "react"
import { Download, Loader2, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { genererRevue, getTemplates, telechargerRevue, uploadTemplate } from "@/lib/api/revues"
import type { Dossier } from "@/lib/api/types"
import type { Flux, ModeleRevue, Revue } from "@/lib/api/types"

interface RevuesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dossiers: Dossier[]
  feeds: Flux[]
}

export function RevuesDialog({ open, onOpenChange, dossiers, feeds }: RevuesDialogProps) {
  const [templates, setTemplates] = useState<ModeleRevue[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [titre, setTitre] = useState("")
  const [modeleId, setModeleId] = useState("")
  const [sourceType, setSourceType] = useState<"dossier" | "flux">("dossier")
  const [dossierId, setDossierId] = useState("")
  const [selectedFluxIds, setSelectedFluxIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  // TODO: pas de route "liste des revues déjà générées" documentée —
  // on ne garde que celles créées pendant cette session
  const [sessionRevues, setSessionRevues] = useState<Revue[]>([])

  useEffect(() => {
    if (!open) return
    setTemplatesLoading(true)
    getTemplates()
      .then(setTemplates)
      .catch(() => toast.add({ title: "Impossible de charger les modèles", type: "error" }))
      .finally(() => setTemplatesLoading(false))
  }, [open])

const [uploading, setUploading] = useState(false)

async function handleUploadTemplate(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.type !== "application/pdf") {
    toast.add({ title: "Erreur", description: "Seuls les fichiers PDF sont acceptés", type: "error" })
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.add({ title: "Erreur", description: "Le fichier dépasse 10 Mo", type: "error" })
    return
  }
  setUploading(true)
  setUploadProgress(0)
  try {
    const modele = await uploadTemplate(
      file,
      file.name.replace(/\.pdf$/i, ""),
      setUploadProgress
    )
    setTemplates((prev) => [modele, ...prev])
    toast.add({ title: "Modèle importé", description: modele.nom, type: "success" })
  } catch {
    toast.add({ title: "Erreur", description: "Impossible d'importer ce modèle", type: "error" })
  } finally {
    setUploading(false)
    setUploadProgress(0)
    e.target.value = ""
  }
}

  function toggleFlux(id: string) {
    setSelectedFluxIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

async function handleGenerate(e: React.FormEvent) {
  e.preventDefault()
  if (!titre.trim()) {
    toast.add({ title: "Le titre est requis", type: "error" })
    return
  }
  if (!modeleId) {
    toast.add({ title: "Choisis un modèle (importe-en un dans l'onglet Modèles si besoin)", type: "error" })
    return
  }
  if (sourceType === "dossier" && !dossierId) {
    toast.add({ title: "Choisis un dossier source", type: "error" })
    return
  }
  if (sourceType === "flux" && selectedFluxIds.size === 0) {
    toast.add({ title: "Choisis au moins un flux", type: "error" })
    return
  }

  setGenerating(true)
  try {
    const revue = await genererRevue({
      modele_id: modeleId,
      titre,
      dossier_id: sourceType === "dossier" ? dossierId : undefined,
      flux_ids: sourceType === "flux" ? Array.from(selectedFluxIds) : undefined,
    })
    setSessionRevues((prev) => [revue, ...prev])
    toast.add({ title: "Revue générée", description: revue.titre, type: "success" })
    setTitre("")
  } catch {
    toast.add({ title: "Erreur", description: "Impossible de générer la revue", type: "error" })
  } finally {
    setGenerating(false)
  }
}

  async function handleDownload(revue: Revue) {
    try {
      await telechargerRevue(revue.id_revue, revue.titre)
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de télécharger le PDF", type: "error" })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Revue de presse</DialogTitle>
          <DialogDescription>
            Génère un PDF avec les articles récents de tes flux ou d'un dossier
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="generate" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="w-full">
            <TabsTrigger value="generate" className="flex-1">Générer</TabsTrigger>
            <TabsTrigger value="templates" className="flex-1">Modèles</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="min-h-0 flex-1 space-y-4 overflow-y-auto pt-3">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="titre">Titre de la revue</Label>
                <Input
                  id="titre"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  placeholder="Revue du 4 août 2026"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modele">Modèle</Label>
                <Select value={modeleId} onValueChange={(v) => setModeleId(v ?? "")}>
                  <SelectTrigger id="modele" className="w-full">
                    <SelectValue placeholder={templatesLoading ? "Chargement..." : "Choisis un modèle"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((t) => (
                        <SelectItem key={t.id_modele} value={t.id_modele}>
                          {t.nom}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && !templatesLoading && (
                    <p className="text-xs text-muted-foreground">
                      Aucun modèle — importe-en un dans l'onglet "Modèles"
                    </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Source des articles</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                      type="button"
                      variant={sourceType === "dossier" ? "default" : "outline"}
                      onClick={() => setSourceType("dossier")}
                  >
                    Un dossier
                  </Button>
                  <Button
                      type="button"
                      variant={sourceType === "flux" ? "default" : "outline"}
                      onClick={() => setSourceType("flux")}
                  >
                    Des flux
                  </Button>
                </div>

                {sourceType === "dossier" && (
                    <div className="pt-2">
                      <Select value={dossierId} onValueChange={(v) => setDossierId(v ?? "")}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Choisis un dossier" />
                        </SelectTrigger>
                        <SelectContent>
                          {dossiers.map((d) => (
                              <SelectItem key={d.id_dossier} value={d.id_dossier}>
                                {d.nom}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {dossiers.length === 0 && (
                          <p className="mt-1 text-xs text-muted-foreground">Aucun dossier pour l'instant</p>
                      )}
                    </div>
                )}

                {sourceType === "flux" && (
                    <div className="max-h-48 space-y-1 overflow-y-auto pt-2">
                    {feeds.length === 0 && (
                        <p className="text-xs text-muted-foreground">Aucun flux suivi</p>
                    )}
                    {feeds.map((f) => (
                        <label
                        key={f.id_flux}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                        >
                        <input
                            type="checkbox"
                            checked={selectedFluxIds.has(f.id_flux)}
                            onChange={() => toggleFlux(f.id_flux)}
                        />
                        <span className="min-w-0 flex-1 truncate">{f.nom}</span>
                        </label>
                    ))}
                    </div>
                )}
                </div>

              <Button type="submit" disabled={generating} className="w-full">
                {generating ? "Génération en cours..." : "Générer la revue"}
              </Button>
            </form>

            {sessionRevues.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-medium text-muted-foreground">Revues générées (cette session)</p>
                {sessionRevues.map((r) => (
                  <div key={r.id_revue} className="flex items-center justify-between rounded-md border p-2">
                    <span className="min-w-0 flex-1 truncate text-sm">{r.titre}</span>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleDownload(r)}>
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="min-h-0 flex-1 space-y-3 overflow-y-auto pt-3">
            <div>
              <Label
                htmlFor="template-upload"
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm text-muted-foreground hover:bg-accent"
              >
                {uploading ? (
                  <div className="flex w-full flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {uploadProgress < 100 ? `Import en cours... ${uploadProgress}%` : "Traitement du fichier..."}
                    </div>
                    <Progress value={uploadProgress} className="h-1.5 w-full max-w-52" />
                  </div>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importer un modèle PDF (10 Mo max)
                  </>
                )}
              </Label>
                            <input
                id="template-upload"
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleUploadTemplate}
                disabled={uploading}
              />
            </div>

            {templatesLoading && (
              <p className="text-center text-sm text-muted-foreground">Chargement...</p>
            )}
            {!templatesLoading && templates.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">Aucun modèle importé pour l'instant</p>
            )}
            {templates.map((t) => (
              <div key={t.id_modele} className="flex items-center justify-between rounded-md border p-2">
                <span className="min-w-0 flex-1 truncate text-sm">{t.nom}</span>
                <Badge variant="outline" className="text-xs">PDF</Badge>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}