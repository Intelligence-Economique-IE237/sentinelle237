import { useMemo } from "react"
import { UserGlobe, type GlobeMarker } from "@/components/UserGlobe"
import { getCountryCoordinates } from "@/lib/countryCoordinates"
import type { AdminUser } from "@/lib/api/types"

interface UsersGlobeCardProps {
  users: AdminUser[]
  loading?: boolean
}

export function UsersGlobeCard({ users, loading }: UsersGlobeCardProps) {
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
    <div className="flex flex-col items-center gap-3">
      <h3 className="w-full text-base font-semibold">Utilisateurs par pays</h3>

      {loading ? (
        <p className="py-16 text-center text-sm text-muted-foreground">Chargement...</p>
      ) : markers.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Aucun utilisateur avec un pays reconnu
        </p>
      ) : (
        <>
          <UserGlobe markers={markers} className="w-full" />
          <p className="text-xs text-muted-foreground">
            {countryStats.length} pays représenté{countryStats.length !== 1 ? "s" : ""} —
            glisse pour faire tourner le globe
          </p>
          {unmatchedCountries.length > 0 && (
            <p className="text-center text-xs text-muted-foreground">
              Pays non reconnus (à ajouter à countryCoordinates.ts) :{" "}
              {unmatchedCountries.join(", ")}
            </p>
          )}
        </>
      )}
    </div>
  )
}
