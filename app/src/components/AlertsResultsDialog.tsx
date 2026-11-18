import { useState } from "react"
import { ArrowUpRight, Check } from "lucide-react"
import { MButton, MDialog, MEmpty, MPill, MSkeleton } from "@/components/mira/mira"
import { cn } from "@/lib/utils"
import type { Alerte, AlerteResultat } from "@/lib/api/types"

interface AlertResultsDialogProps {
  alerte: Alerte | null
  results: AlerteResultat[] | undefined
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onMarkRead: (resultatId: string) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
}

export function AlertResultsDialog({ alerte, results, loading = false, onOpenChange, onMarkRead }: AlertResultsDialogProps) {
  // Garde la dernière alerte affichée pendant l'animation de fermeture
  const [shown, setShown] = useState<{ alerte: Alerte; results: AlerteResultat[] } | null>(null)
  if (alerte && (shown?.alerte !== alerte || shown.results !== (results ?? shown.results))) {
    setShown({ alerte, results: results ?? [] })
  }
  const list = shown?.results ?? []

  return (
    <MDialog
      open={!!alerte}
      onOpenChange={onOpenChange}
      className="max-w-lg"
      title={shown?.alerte.mot_cle ?? ""}
      description={loading ? "Chargement des résultats…" : `${list.length} résultat${list.length !== 1 ? "s" : ""}`}
    >
      <div className="-mx-2 flex max-h-[55svh] flex-col gap-2 overflow-y-auto px-2">
        {loading && Array.from({ length: 4 }, (_, i) => <MSkeleton key={i} className="h-16 rounded-2xl" />)}
        {!loading && list.length === 0 && <MEmpty className="py-8">Aucun résultat pour cette alerte.</MEmpty>}
        {!loading &&
          list.map((r) => (
            <div
              key={r.id_resultat}
              className={cn("flex items-start gap-2 rounded-2xl bg-m-surface-2 py-3 pr-2 pl-4", r.lu && "opacity-55")}
            >
              <a href={r.lien} target="_blank" rel="noopener noreferrer" className="group min-w-0 flex-1">
                <span className="flex items-start gap-1.5 text-[14px] leading-snug font-medium group-hover:underline group-hover:underline-offset-4">
                  <span className="flex-1">{r.titre}</span>
                  <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-m-muted" />
                </span>
                <span className="mt-1.5 flex items-center gap-2">
                  <MPill tone={r.source === "flux" ? "lime" : "white"}>{r.source === "flux" ? "Flux suivi" : "Recherche web"}</MPill>
                  <span className="font-mono text-[11px] text-m-soft">{formatDate(r.date_publication)}</span>
                </span>
              </a>
              {!r.lu && (
                <MButton
                  variant="white"
                  size="icon-sm"
                  aria-label="Marquer comme lu"
                  title="Marquer comme lu"
                  onClick={() => onMarkRead(r.id_resultat)}
                >
                  <Check />
                </MButton>
              )}
            </div>
          ))}
      </div>
    </MDialog>
  )
}
