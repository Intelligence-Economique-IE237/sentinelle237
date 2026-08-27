import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Alerte, AlerteResultat } from "@/lib/api/types"
import { useEffect, useState } from "react"
interface AlertResultsDialogProps {
  alerte: Alerte | null
  results: AlerteResultat[] | undefined
  loading?: boolean
  onOpenChange: (open: boolean) => void
  onMarkRead: (resultatId: string) => void
}

export function AlertResultsDialog({
  alerte,
  results,
  loading = false,
  onOpenChange,
  onMarkRead,
}: AlertResultsDialogProps) {
  // Garde la dernière alerte/résultats connus, pour que le contenu reste
  // affiché pendant l'animation de fermeture au lieu de disparaître d'un coup
  const [displayAlerte, setDisplayAlerte] = useState<Alerte | null>(alerte)
  const [displayResults, setDisplayResults] = useState<AlerteResultat[]>(results ?? [])

  useEffect(() => {
    if (alerte) {
      setDisplayAlerte(alerte)
      setDisplayResults(results ?? [])
    }
  }, [alerte, results])

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <Dialog open={!!alerte} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] flex-col overflow-hidden sm:max-w-lg">
        {displayAlerte && (
          <>
            <DialogHeader className="shrink-0">
              <DialogTitle>{displayAlerte.mot_cle}</DialogTitle>
              <DialogDescription>
                {displayResults.length} résultat{displayResults.length !== 1 ? "s" : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {loading && (
                <p className="py-6 text-center text-sm text-muted-foreground">Chargement...</p>
              )}
              {!loading && displayResults.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Aucun résultat pour cette alerte
                </p>
              )}
              {!loading &&
                displayResults.map((r) => (
                  <div
                    key={r.id_resultat}
                    className={
                      r.lu
                        ? "flex items-start gap-2 rounded-lg border p-3 opacity-60"
                        : "flex items-start gap-2 rounded-lg border p-3"
                    }
                  >
                    <div className="flex-1">
                      
                      <a  href={r.lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {r.titre}
                      </a>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="h-5 px-1.5 text-xs">
                          {r.source === "flux" ? "Flux suivi" : "Recherche web"}
                        </Badge>
                        <span>{formatDate(r.date_publication)}</span>
                      </div>
                    </div>
                    {!r.lu && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onMarkRead(r.id_resultat)}
                        title="Marquer comme lu"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}