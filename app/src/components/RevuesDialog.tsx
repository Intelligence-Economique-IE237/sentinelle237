import { useEffect, useState } from "react"
import type React from "react"
import { Check, Download, FileText, Loader2, Upload } from "lucide-react"
import { MButton, MDialog, MEmpty, MField, MInput, MPill, MSegmented, MSelect, MSkeleton } from "@/components/mira/mira"
import { toast } from "@/components/mira/toast-manager"
import { genererRevue, getTemplates, telechargerRevue, uploadTemplate } from "@/lib/api/revues"
import { cn } from "@/lib/utils"
import type { Dossier, Flux, ModeleRevue, Revue } from "@/lib/api/types"

interface RevuesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dossiers: Dossier[]
  feeds: Flux[]
}

const NONE = "__none__"

export function RevuesDialog({ open, onOpenChange, dossiers, feeds }: RevuesDialogProps) {
  const [tab, setTab] = useState<"generate" | "templates">("generate")
  // null = pas encore chargé
  const [templates, setTemplates] = useState<ModeleRevue[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [titre, setTitre] = useState("")
  const [modeleId, setModeleId] = useState(NONE)
  const [sourceType, setSourceType] = useState<"dossier" | "flux">("dossier")
  const [dossierId, setDossierId] = useState(NONE)
  const [selectedFluxIds, setSelectedFluxIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)

  // TODO : pas de route « liste des revues déjà générées » documentée —
  // on ne garde que celles créées pendant cette session
  const [sessionRevues, setSessionRevues] = useState<Revue[]>([])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    getTemplates()
      .then((list) => !cancelled && setTemplates(list))
      .catch(() => {
        if (cancelled) return
        setTemplates([])
        toast.add({ title: "Impossible de charger les modèles", type: "error" })
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const templatesLoading = open && templates === null
  const templateList = templates ?? []

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
      const modele = await uploadTemplate(file, file.name.replace(/\.pdf$/i, ""), setUploadProgress)
      setTemplates((prev) => [modele, ...(prev ?? [])])
      toast.add({ title: "Modèle importé", description: modele.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible d’importer ce modèle", type: "error" })
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
    if (!titre.trim()) return toast.add({ title: "Le titre est requis", type: "error" })
    if (modeleId === NONE)
      return toast.add({ title: "Choisis un modèle (importe-en un dans l’onglet Modèles si besoin)", type: "error" })
    if (sourceType === "dossier" && dossierId === NONE) return toast.add({ title: "Choisis un dossier source", type: "error" })
    if (sourceType === "flux" && selectedFluxIds.size === 0) return toast.add({ title: "Choisis au moins un flux", type: "error" })

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
    <MDialog
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-lg"
      title="Revue de presse"
      description="Génère un PDF avec les articles récents de tes flux ou d’un dossier."
    >
      <MSegmented
        value={tab}
        onChange={setTab}
        className="w-full"
        itemClassName="flex-1"
        items={[
          { value: "generate", label: "Générer" },
          { value: "templates", label: "Modèles" },
        ]}
      />

      {tab === "generate" ? (
        <div className="flex flex-col gap-5">
          <form onSubmit={handleGenerate} className="flex flex-col gap-4">
            <MField label="Titre de la revue" htmlFor="revue-titre">
              <MInput id="revue-titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Revue du 18 novembre 2026" />
            </MField>
            <MField label="Modèle">
              <MSelect
                ariaLabel="Modèle"
                value={modeleId}
                onChange={setModeleId}
                options={[
                  { value: NONE, label: templatesLoading ? "Chargement…" : "Choisis un modèle" },
                  ...templateList.map((t) => ({ value: t.id_modele, label: t.nom })),
                ]}
                className="w-full rounded-2xl"
              />
              {!templatesLoading && templateList.length === 0 && (
                <p className="text-[12px] text-m-soft">Aucun modèle : importe-en un dans l’onglet « Modèles ».</p>
              )}
            </MField>
            <MField label="Source des articles">
              <MSegmented
                value={sourceType}
                onChange={setSourceType}
                className="w-full"
                itemClassName="flex-1"
                items={[
                  { value: "dossier", label: "Un dossier" },
                  { value: "flux", label: "Des flux" },
                ]}
              />
            </MField>
            {sourceType === "dossier" ? (
              <MSelect
                ariaLabel="Dossier source"
                value={dossierId}
                onChange={setDossierId}
                options={[
                  { value: NONE, label: dossiers.length ? "Choisis un dossier" : "Aucun dossier pour l’instant" },
                  ...dossiers.map((d) => ({ value: d.id_dossier, label: d.nom })),
                ]}
                className="w-full rounded-2xl"
              />
            ) : (
              <div className="-mx-1 flex max-h-48 flex-col gap-1 overflow-y-auto px-1">
                {feeds.length === 0 && <p className="text-[12px] text-m-soft">Aucun flux suivi</p>}
                {feeds.map((f) => {
                  const checked = selectedFluxIds.has(f.id_flux)
                  return (
                    <button
                      key={f.id_flux}
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleFlux(f.id_flux)}
                      className={cn(
                        "flex h-10 cursor-pointer items-center gap-3 rounded-xl px-3 text-left text-[13px] transition-colors",
                        checked ? "bg-m-lime-soft" : "bg-m-surface-2 hover:bg-m-surface-3"
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-[18px] shrink-0 items-center justify-center rounded-full",
                          checked ? "bg-m-ink" : "border-[1.5px] border-m-ring"
                        )}
                      >
                        {checked && <Check className="size-3 text-m-lime" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{f.nom}</span>
                    </button>
                  )
                })}
              </div>
            )}
            <MButton type="submit" disabled={generating} className="mt-1 w-full">
              {generating ? "Génération en cours…" : "Générer la revue"}
            </MButton>
          </form>

          {sessionRevues.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-m-surface-4 pt-4">
              <p className="font-mono text-[11px] text-m-muted uppercase">Générées pendant cette session</p>
              {sessionRevues.map((r) => (
                <div key={r.id_revue} className="flex items-center gap-3 rounded-2xl bg-m-surface-2 py-1.5 pr-1.5 pl-4">
                  <FileText className="size-4 shrink-0 text-m-muted" />
                  <span className="min-w-0 flex-1 truncate text-[13px]">{r.titre}</span>
                  <MButton size="sm" variant="white" className="h-8 px-3 text-[12px]" onClick={() => handleDownload(r)}>
                    <Download className="size-3.5!" /> PDF
                  </MButton>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <label
            htmlFor="template-upload"
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-m-ring p-6 text-sm text-m-soft transition-colors hover:bg-m-surface-2",
              uploading && "pointer-events-none"
            )}
          >
            {uploading ? (
              <>
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {uploadProgress < 100 ? `Import en cours… ${uploadProgress} %` : "Traitement du fichier…"}
                </span>
                <span className="h-1.5 w-full max-w-52 overflow-hidden rounded-full bg-m-track">
                  <span className="block h-full rounded-full bg-m-ink transition-[width]" style={{ width: `${uploadProgress}%` }} />
                </span>
              </>
            ) : (
              <>
                <Upload className="size-4" />
                Importer un modèle PDF (10 Mo max)
              </>
            )}
          </label>
          <input
            id="template-upload"
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleUploadTemplate}
            disabled={uploading}
          />
          {templatesLoading && Array.from({ length: 3 }, (_, i) => <MSkeleton key={i} className="h-12 rounded-2xl" />)}
          {!templatesLoading && templateList.length === 0 && <MEmpty className="py-6">Aucun modèle importé pour l’instant.</MEmpty>}
          {templateList.map((t) => (
            <div key={t.id_modele} className="flex items-center gap-3 rounded-2xl bg-m-surface-2 px-4 py-3">
              <FileText className="size-4 shrink-0 text-m-muted" />
              <span className="min-w-0 flex-1 truncate text-[13px]">{t.nom}</span>
              <MPill tone="white" className="font-mono">PDF</MPill>
            </div>
          ))}
        </div>
      )}
    </MDialog>
  )
}
