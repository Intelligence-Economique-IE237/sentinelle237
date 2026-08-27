import { useEffect, useState } from "react"
import { Rss, ShieldCheck, UserCheck, Users } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAllFluxAdmin, getUsers } from "@/lib/api/admin"
import type { AdminUser, AdminFluxItem } from "@/lib/api/types"
import { UsersGlobeCard } from "@/components/UsersGlobeCard"

const PIE_COLORS = ["#6366f1", "#f97316", "#22c55e", "#ec4899", "#06b6d4", "#eab308"]

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: number | string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export function AdminOverviewTab() {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [fluxTotal, setFluxTotal] = useState(0)
  const [zoneCounts, setZoneCounts] = useState<Record<string, number>>({})
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      try {
        // Utilisateurs : volume faible, une seule page large suffit
        const usersRes = await getUsers({ page: 1, limit: 100 })
        if (cancelled) return
        setUsers(usersRes.users)

        // Flux : potentiellement plusieurs centaines — on pagine par lots de 100
        // et on n'agrège que des compteurs (pas de stockage de la liste complète)
        // pour rester léger côté mémoire client.
        let page = 1
        const limit = 100
        let total = 0
        const zones: Record<string, number> = {}
        const types: Record<string, number> = {}

        while (true) {
          const res = await getAllFluxAdmin({ page, limit })
          if (cancelled) return
          total = res.pagination.total
          res.flux.forEach((f: AdminFluxItem) => {
            zones[f.zone] = (zones[f.zone] ?? 0) + 1
            types[f.type] = (types[f.type] ?? 0) + 1
          })
          if (page >= res.pagination.totalPages || res.flux.length === 0) break
          page++
        }

        if (cancelled) return
        setFluxTotal(total)
        setZoneCounts(zones)
        setTypeCounts(types)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll().catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const adminCount = users.filter((u) => u.role === "admin").length
  const activatedCount = users.filter((u) => u.activated).length

  const roleData = [
    { name: "Veilleur", value: users.filter((u) => u.role === "veilleur").length },
    { name: "Admin", value: adminCount },
  ].filter((d) => d.value > 0)

  const zoneData = Object.entries(zoneCounts)
    .map(([zone, count]) => ({ zone, count }))
    .sort((a, b) => b.count - a.count)

  const typeData = Object.entries(typeCounts)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Vue d'ensemble</h2>
        <p className="text-sm text-muted-foreground">
          {loading ? "Chargement des statistiques..." : "Calculé à partir des données actuelles"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={Users} label="Utilisateurs" value={loading ? "…" : users.length} />
        <KpiCard icon={ShieldCheck} label="Administrateurs" value={loading ? "…" : adminCount} />
        <KpiCard icon={UserCheck} label="Comptes actifs" value={loading ? "…" : activatedCount} />
        <KpiCard icon={Rss} label="Flux au total" value={loading ? "…" : fluxTotal} />
      </div>

      <UsersGlobeCard users={users} loading={loading} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilisateurs par rôle</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Chargement...</p>
            ) : roleData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={roleData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {roleData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Flux par zone</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Chargement...</p>
            ) : zoneData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={zoneData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="zone" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Flux par type</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Chargement...</p>
            ) : typeData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">Aucune donnée</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={typeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="type" type="category" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
