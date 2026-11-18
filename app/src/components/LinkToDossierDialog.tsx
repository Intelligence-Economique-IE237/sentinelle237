import { useState } from "react"
import { Bell, Rss } from "lucide-react"
import { MButton, MDialog, MEmpty, MSegmented } from "@/components/mira/mira"
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
  linkedAlerteIds,
  linkedFluxIds,
  onLinkAlerte,
  onUnlinkAlerte,
  onLinkFlux,
  onUnlinkFlux,
}: LinkToDossierDialogProps) {
  const [tab, setTab] = useState<"alertes" | "flux">("alertes")
  const [pendingId, setPendingId] = useState<string | null>(null)

  async function toggle(id: string, linked: boolean, link: (id: string) => Promise<void> | void, unlink: (id: string) => Promise<void> | void) {
    setPendingId(id)
    try {
      await (linked ? unlink(id) : link(id))
    } finally {
      setPendingId(null)
    }
  }

  const rows =
    tab === "alertes"
      ? availableAlertes.map((a) => ({
          id: a.id_alerte,
          label: a.mot_cle,
          linked: linkedAlerteIds.has(a.id_alerte),
          onClick: () => toggle(a.id_alerte, linkedAlerteIds.has(a.id_alerte), onLinkAlerte, onUnlinkAlerte),
        }))
      : availableFeeds.map((f) => ({
          id: f.id_flux,
          label: f.nom,
          linked: linkedFluxIds.has(f.id_flux),
          onClick: () => toggle(f.id_flux, linkedFluxIds.has(f.id_flux), onLinkFlux, onUnlinkFlux),
        }))
  const Icon = tab === "alertes" ? Bell : Rss

  return (
    <MDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Lier au dossier"
      description="Choisis une alerte ou un flux déjà suivi à rattacher à ce dossier."
    >
      <MSegmented
        value={tab}
        onChange={setTab}
        className="w-full"
        itemClassName="flex-1"
        items={[
          { value: "alertes", label: "Alertes" },
          { value: "flux", label: "Flux" },
        ]}
      />
      <div className="-mx-2 flex max-h-72 flex-col gap-2 overflow-y-auto px-2">
        {rows.length === 0 && <MEmpty className="py-8">{tab === "alertes" ? "Aucune alerte disponible" : "Aucun flux disponible"}</MEmpty>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-m-surface-2 py-1.5 pr-1.5 pl-4">
            <Icon className="size-4 shrink-0 text-m-muted" />
            <span className="min-w-0 flex-1 truncate text-[14px]">{r.label}</span>
            <MButton
              size="sm"
              variant={r.linked ? "danger" : "dark"}
              disabled={pendingId === r.id}
              className="h-8 px-3.5 text-[12px]"
              onClick={r.onClick}
            >
              {r.linked ? "Délier" : "Lier"}
            </MButton>
          </div>
        ))}
      </div>
    </MDialog>
  )
}
