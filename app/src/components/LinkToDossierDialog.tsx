import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { Alerte, Flux } from "@/lib/api/types"

interface LinkToDossierDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableAlertes: Alerte[]
  availableFeeds: Flux[]
  linkedAlerteIds: Set<string>
  linkedFluxIds: Set<string>
  onLinkAlerte: (alerteId: string) => Promise<void> | void
  onUnlinkAlerte: (alerteId: string) => Promise<void> | void
  onLinkFlux: (fluxId: string) => Promise<void> | void
  onUnlinkFlux: (fluxId: string) => Promise<void> | void
}

export function LinkToDossierDialog({
  open,
  onOpenChange,
  availableAlertes,
  availableFeeds,
  linkedAlerteIds = new Set(),
  linkedFluxIds = new Set(),
  onLinkAlerte,
  onUnlinkAlerte,
  onLinkFlux,
  onUnlinkFlux,
}: LinkToDossierDialogProps) {
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function handleAlerteClick(id: string) {
    setPendingId(id)
    try {
      if (linkedAlerteIds.has(id)) {
        await onUnlinkAlerte(id)
      } else {
        await onLinkAlerte(id)
      }
    } finally {
      setPendingId(null)
    }
  }

  async function handleFluxClick(id: string) {
    setPendingId(id)
    try {
      if (linkedFluxIds.has(id)) {
        await onUnlinkFlux(id)
      } else {
        await onLinkFlux(id)
      }
    } finally {
      setPendingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Lier au dossier</DialogTitle>
          <DialogDescription>
            Choisis une alerte ou un flux déjà suivi à rattacher à ce dossier
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="alertes">
          <TabsList className="w-full">
            <TabsTrigger value="alertes" className="flex-1">
              Alertes
            </TabsTrigger>
            <TabsTrigger value="flux" className="flex-1">
              Flux
            </TabsTrigger>
          </TabsList>

          <TabsContent value="alertes" className="max-h-72 space-y-2 overflow-y-auto pt-2">
            {availableAlertes.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucune alerte disponible
              </p>
            )}
            {availableAlertes.map((a) => {
              const isLinked = linkedAlerteIds.has(a.id_alerte)
              return (
                <div key={a.id_alerte} className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-sm">{a.mot_cle}</span>
                  <Button
                    size="sm"
                    variant={isLinked ? "destructive" : "outline"}
                    disabled={pendingId === a.id_alerte}
                    onClick={() => handleAlerteClick(a.id_alerte)}
                  >
                    {isLinked ? "Délier" : "Lier"}
                  </Button>
                </div>
              )
            })}
          </TabsContent>

          <TabsContent value="flux" className="max-h-72 space-y-2 overflow-y-auto pt-2">
            {availableFeeds.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Aucun flux disponible
              </p>
            )}
            {availableFeeds.map((f) => {
              const isLinked = linkedFluxIds.has(f.id_flux)
              return (
                  <div key={f.id_flux} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-sm">{f.nom}</span>
                    <Button
                        size="sm"
                        variant={isLinked ? "destructive" : "outline"}
                        disabled={pendingId === f.id_flux}
                        onClick={() => handleFluxClick(f.id_flux)}
                    >
                      {isLinked ? "Délier" : "Lier"}
                    </Button>
                  </div>
              )
            })}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}