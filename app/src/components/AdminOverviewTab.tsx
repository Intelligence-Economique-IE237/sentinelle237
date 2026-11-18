import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check } from "lucide-react"
import { getAllFluxAdmin, getUsers } from "@/lib/api/admin"
import type { AdminUser, AdminFluxItem } from "@/lib/api/types"
import { UsersGlobeCard } from "@/components/UsersGlobeCard"
import {
  MButton,
  MCard,
  MCardHeader,
  MEmpty,
  MHero,
  MPill,
  MSkeleton,
  MTile,
  type PillTone,
} from "@/components/mira/mira"
import { cn } from "@/lib/utils"
import type { AdminView } from "@/pages/Admin"

const DAY = 24 * 60 * 60 * 1000

interface AdminOverviewTabProps {
  pseudo?: string
  onNavigate?: (view: AdminView) => void
}

export function AdminOverviewTab({ pseudo, onNavigate }: AdminOverviewTabProps) {
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [fluxTotal, setFluxTotal] = useState(0)
  const [freshCount, setFreshCount] = useState(0)
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
        let fresh = 0
        const now = Date.now()
        const zones: Record<string, number> = {}
        const types: Record<string, number> = {}

        while (true) {
          const res = await getAllFluxAdmin({ page, limit })
          if (cancelled) return
          total = res.pagination.total
          res.flux.forEach((f: AdminFluxItem) => {
            zones[f.zone] = (zones[f.zone] ?? 0) + 1
            types[f.type] = (types[f.type] ?? 0) + 1
            if (f.last_crawled_at && now - new Date(f.last_crawled_at).getTime() < DAY) fresh++
          })
          if (page >= res.pagination.totalPages || res.flux.length === 0) break
          page++
        }

        if (cancelled) return
        setFluxTotal(total)
        setFreshCount(fresh)
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

  const total = users.length
  const adminCount = users.filter((u) => u.role === "admin").length
  const activatedCount = users.filter((u) => u.activated).length
  const unverifiedCount = users.filter((u) => !u.verified).length
  const ratio = (n: number) => (total > 0 ? n / total : 0)

  const zoneData = useMemo(
    () =>
      Object.entries(zoneCounts)
        .map(([zone, count]) => ({ zone, count }))
        .sort((a, b) => b.count - a.count),
    [zoneCounts]
  )
  const typeData = useMemo(
    () =>
      Object.entries(typeCounts)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count),
    [typeCounts]
  )

  const v = (n: number | string) => (loading ? "…" : n)

  return (
    <>
      <MHero
        title={`Bonjour${pseudo ? `, ${pseudo}` : ""}.`}
        subtitle="Voici l’état de la plateforme."
        stats={[
          { value: v(total), label: "Utilisateurs", dot: "bg-m-ink" },
          { value: v(fluxTotal), label: "Flux", dot: "bg-m-ring" },
          { value: v(unverifiedCount), label: "À vérifier", dot: "bg-m-orange" },
        ]}
      />

      {/* Ligne 1 : indicateurs + carte sombre */}
      <div className="grid gap-[18px] lg:grid-cols-12">
        <MCard className="lg:col-span-7">
          <MCardHeader
            title="Comptes à surveiller"
            subtitle="Calculé à partir des comptes enregistrés."
            action={
              onNavigate && (
                <MButton variant="light" size="sm" onClick={() => onNavigate("users")}>
                  Voir les {loading ? "" : total}
                </MButton>
              )
            }
          />
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:mt-auto lg:grid-cols-2 lg:pt-10 xl:grid-cols-4">
            <KpiTile
              label="Comptes"
              badge={{ tone: "neutral", text: "Total" }}
              value={total}
              unit="inscrits"
              caption="Utilisateurs"
              loading={loading}
            />
            <KpiTile
              label="Accès"
              badge={{ tone: "sand", text: "Sensible" }}
              value={adminCount}
              unit="admins"
              caption="Administrateurs"
              loading={loading}
            />
            <KpiTile
              label="Statut"
              badge={
                ratio(activatedCount) >= 0.8
                  ? { tone: "lime", text: "Optimal" }
                  : { tone: "sand", text: "À suivre" }
              }
              value={activatedCount}
              unit={`/ ${total}`}
              caption="Comptes actifs"
              loading={loading}
            />
            <KpiTile
              label="Emails"
              badge={unverifiedCount > 0 ? { tone: "peach", text: "À revoir" } : { tone: "lime", text: "OK" }}
              value={unverifiedCount}
              unit="comptes"
              caption="Non vérifiés"
              loading={loading}
            />
          </div>
        </MCard>

        <MCard tone="dark" className="min-h-[330px] lg:col-span-5">
          <MCardHeader
            dark
            title="Flux surveillés"
            subtitle={loading ? "Chargement des sources…" : "Toutes les sources collectées par la plateforme."}
            action={!loading && <MPill tone="glass" className="h-7 px-3 text-[12px] font-medium">{typeData.length} type{typeData.length > 1 ? "s" : ""}</MPill>}
          />
          <div className="mt-auto pt-8">
            <p className="flex items-end gap-3">
              <span className="text-[88px] leading-[0.9] font-light tracking-[-0.06em] tabular-nums sm:text-[112px]">
                {loading ? "…" : fluxTotal}
              </span>
              <span className="pb-2 text-sm text-white/80">flux</span>
            </p>
            {!loading && (
              <dl className="mt-6 grid grid-cols-3 gap-2">
                {[
                  { label: "Collectés < 24 h", value: freshCount },
                  { label: "Zones", value: zoneData.length },
                  { label: "Types", value: typeData.length },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl bg-white/[.08] px-3 py-2.5 backdrop-blur">
                    <dt className="truncate text-[11px] text-white/60">{s.label}</dt>
                    <dd className="mt-0.5 text-[20px] leading-tight font-light tracking-[-0.04em] tabular-nums">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </MCard>
      </div>

      {/* Ligne 2 : types / zones / globe */}
      <div className="grid gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        <TypesCard data={typeData} loading={loading} />
        <ZonesCard data={zoneData} total={fluxTotal} loading={loading} onNavigate={onNavigate} />
        <UsersGlobeCard users={users} loading={loading} className="md:col-span-2 lg:col-span-1" />
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */

function KpiTile({
  label,
  badge,
  value,
  unit,
  caption,
  loading,
}: {
  label: string
  badge: { tone: PillTone; text: string }
  value: number
  unit: string
  caption: string
  loading: boolean
}) {
  return (
    <MTile className="gap-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] text-m-soft">{label}</span>
        {!loading && <MPill tone={badge.tone}>{badge.text}</MPill>}
      </div>
      <p className="mt-4 flex items-baseline gap-1.5">
        {loading ? (
          <MSkeleton className="h-10 w-16" />
        ) : (
          <span className="text-[40px] leading-none font-light tracking-[-0.06em] tabular-nums">{value}</span>
        )}
        <span className="text-[11px] text-m-muted">{unit}</span>
      </p>
      <p className="mt-3 text-[13px] text-m-strong">{caption}</p>
    </MTile>
  )
}

function TypesCard({
  data,
  loading,
}: {
  data: { type: string; count: number }[]
  loading: boolean
}) {
  const top = data[0]
  const bars = data.slice(0, 7)
  const max = Math.max(1, ...bars.map((b) => b.count))

  return (
    <MCard>
      <MCardHeader
        title="Flux par type"
        subtitle={loading ? "Chargement…" : `${data.length} formats de sources collectés.`}
        action={top && !loading && <MPill tone="lime" className="max-w-[12ch] truncate">{top.type}</MPill>}
      />
      {loading ? (
        <MSkeleton className="mt-8 h-36 w-full" />
      ) : data.length === 0 ? (
        <MEmpty>Aucune donnée</MEmpty>
      ) : (
        <div className="mt-auto flex items-end gap-5 pt-8">
          <div className="flex flex-col gap-3 pb-1">
            <div>
              <p className="text-[12px] text-m-soft">Type principal</p>
              <p className="max-w-[9ch] truncate text-[26px] leading-tight font-light tracking-[-0.05em]">{top.type}</p>
            </div>
            <div>
              <p className="text-[12px] text-m-soft">Types</p>
              <p className="text-[26px] leading-tight font-light tracking-[-0.05em] tabular-nums">{data.length}</p>
            </div>
          </div>
          <div className="ml-auto flex h-[120px] min-w-0 flex-1 items-end justify-end gap-1.5">
            {bars.map((b, i) => (
              <div key={b.type} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5" title={`${b.type} : ${b.count}`}>
                <span
                  className={cn("w-full max-w-4 rounded-full", i === 0 ? "m-bar-active" : "bg-m-surface-4")}
                  style={{ height: `${Math.max(12, (b.count / max) * 100)}%` }}
                />
                <span className={cn("font-mono text-[9px] uppercase", i === 0 ? "text-m-ink" : "text-m-muted")}>
                  {b.type.slice(0, 1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </MCard>
  )
}

function ZonesCard({
  data,
  total,
  loading,
  onNavigate,
}: {
  data: { zone: string; count: number }[]
  total: number
  loading: boolean
  onNavigate?: (view: AdminView) => void
}) {
  const rows = data.slice(0, 4)
  return (
    <MCard>
      <MCardHeader
        title="Flux par zone"
        subtitle="Les zones géographiques les mieux couvertes."
        action={
          onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate("flux")}
              className="flex cursor-pointer items-center gap-1 pt-1 font-mono text-[12px] text-m-strong hover:text-m-ink"
            >
              {loading ? "…" : data.length} zones <ArrowRight className="size-3" />
            </button>
          )
        }
      />
      <div className="mt-6 flex flex-col gap-2 lg:mt-auto">
        {loading ? (
          Array.from({ length: 4 }, (_, i) => <MSkeleton key={i} className="h-11 rounded-2xl" />)
        ) : rows.length === 0 ? (
          <MEmpty>Aucune donnée</MEmpty>
        ) : (
          rows.map((r, i) => {
            const top = i < 2
            return (
              <div
                key={r.zone}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-2xl px-3.5",
                  top ? "bg-m-lime-soft" : "bg-m-surface-2"
                )}
              >
                {top ? (
                  <span className="flex size-[18px] items-center justify-center rounded-full bg-m-ink">
                    <Check className="size-3 text-m-lime" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="size-[18px] rounded-full border-[1.5px] border-m-ring" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium capitalize">{r.zone || "—"}</span>
                <span className="font-mono text-[11px] text-m-soft tabular-nums">
                  {r.count} · {total > 0 ? Math.round((r.count / total) * 100) : 0}%
                </span>
              </div>
            )
          })
        )}
      </div>
    </MCard>
  )
}
