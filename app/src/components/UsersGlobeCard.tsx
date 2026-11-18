import { useMemo } from "react"
import { UserGlobe, type GlobeMarker } from "@/components/UserGlobe"
import { getCountryCoordinates } from "@/lib/countryCoordinates"
import type { AdminUser } from "@/lib/api/types"
import { MCard, MCardHeader, MEmpty, MSkeleton } from "@/components/admin/mira"
import { cn } from "@/lib/utils"

// Constantes de module : des tableaux recréés à chaque rendu relanceraient le globe.
const MARKER_COLOR: [number, number, number] = [0.25, 0.48, 0.12] // #3F7A1E
const GLOW_COLOR: [number, number, number] = [0.94, 0.97, 0.78] // #F1F7C8

interface UsersGlobeCardProps {
  users: AdminUser[]
  loading?: boolean
  className?: string
}

export function UsersGlobeCard({ users, loading, className }: UsersGlobeCardProps) {
  // Regroupe les utilisateurs par pays (un marqueur par pays, pas par utilisateur).
  const countryStats = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; count: number }>()
    users.forEach((u) => {
      const coords = getCountryCoordinates(u.pays)
      if (!coords) return
      const key = `${coords[0]},${coords[1]}`
      const existing = map.get(key)
      if (existing) {
        existing.count += 1
      } else {
        map.set(key, { lat: coords[0], lng: coords[1], count: 1 })
      }
    })
    return Array.from(map.values())
  }, [users])

  const markers: GlobeMarker[] = useMemo(
    () =>
      countryStats.map((c, i) => ({
        id: `country-${i}`,
        location: [c.lat, c.lng],
        size: 0.05,
        label: String(c.count),
      })),
    [countryStats]
  )

  const unmatchedCountries = useMemo(
    () =>
      Array.from(
        new Set(
          users
            .filter((u) => u.pays && !getCountryCoordinates(u.pays))
            .map((u) => u.pays as string)
        )
      ),
    [users]
  )

  return (
    <MCard tone="panel" className={cn("min-h-[330px]", className)}>
      <MCardHeader
        title="Utilisateurs par pays"
        subtitle="Glisse le globe pour le faire tourner."
        action={
          <span className="flex size-10 items-center justify-center rounded-full bg-m-avatar font-mono text-[12px] text-m-strong ring-2 ring-m-surface tabular-nums">
            {loading ? "…" : countryStats.length}
          </span>
        }
      />

      {loading ? (
        <MSkeleton className="mx-auto mt-6 aspect-square w-full max-w-[260px] rounded-full" />
      ) : markers.length === 0 ? (
        <MEmpty>Aucun utilisateur avec un pays reconnu</MEmpty>
      ) : (
        <div className="relative mt-4 flex flex-1 items-center justify-center overflow-hidden">
          <div className="w-[260px] max-w-full cursor-grab">
            <UserGlobe markers={markers} markerColor={MARKER_COLOR} glowColor={GLOW_COLOR} />
          </div>
        </div>
      )}

      <div className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-full bg-m-surface py-1.5 pr-1.5 pl-4">
        <span className="truncate text-[13px] text-m-soft">
          {loading
            ? "Chargement…"
            : `${countryStats.length} pays représenté${countryStats.length !== 1 ? "s" : ""}`}
        </span>
        <span className="flex h-8 shrink-0 items-center rounded-full bg-m-ink px-3 font-mono text-[11px] text-m-lime tabular-nums">
          {loading ? "…" : users.length} comptes
        </span>
      </div>

      {unmatchedCountries.length > 0 && (
        <p className="mt-3 text-[11px] leading-snug text-m-soft">
          Pays non reconnus (à ajouter à countryCoordinates.ts) : {unmatchedCountries.join(", ")}
        </p>
      )}
    </MCard>
  )
}
