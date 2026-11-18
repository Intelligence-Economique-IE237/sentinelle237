import { useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, Brain, LayoutDashboard, Radar, Rss, Tag, Users } from "lucide-react"
import { AdminOverviewTab } from "@/components/AdminOverviewTab"
import { AdminUsersTab } from "@/components/AdminUsersTab"
import { AdminFluxTab } from "@/components/AdminFluxTab"
import { AdminCategoriesTab } from "@/components/AdminCategoriesTab"
import { AdminMLTab } from "@/components/AdminMLTab"
import { MAvatar, MSegmented } from "@/components/admin/mira"
import { mButtonClasses } from "@/components/admin/mira-styles"
import { useAuth } from "@/context/AuthContext"
import { cn } from "@/lib/utils"

export type AdminView = "overview" | "users" | "flux" | "categories" | "ml"

const NAV_ITEMS: { view: AdminView; label: string; short: string; icon: typeof LayoutDashboard }[] = [
  { view: "overview", label: "Vue d'ensemble", short: "Aperçu", icon: LayoutDashboard },
  { view: "users", label: "Utilisateurs", short: "Comptes", icon: Users },
  { view: "flux", label: "Flux", short: "Flux", icon: Rss },
  { view: "categories", label: "Catégories", short: "Catégories", icon: Tag },
  { view: "ml", label: "Machine Learning", short: "ML", icon: Brain },
]

export default function Admin() {
  const [selected, setSelected] = useState<AdminView>("overview")
  const { user } = useAuth()

  return (
    <div className="relative isolate min-h-svh overflow-x-clip bg-m-bg font-sans text-m-ink antialiased">
      {/* Halos d'arrière-plan */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[18%] -right-[8%] h-[62%] w-[52%] rounded-full bg-m-lime-mist opacity-90 blur-[120px]" />
        <div className="absolute top-[38%] -left-[12%] h-[52%] w-[42%] rounded-full bg-m-panel opacity-80 blur-[110px]" />
      </div>

      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[18px] px-3 pt-3 pb-28 sm:px-5 sm:pt-4 md:px-7 md:pt-5 md:pb-7">
        {/* Barre supérieure */}
        <header className="m-glass sticky top-3 z-30 flex h-[60px] items-center justify-between gap-3 rounded-full pr-2 pl-4 md:top-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-m-ink">
              <Radar className="size-4 text-m-lime" strokeWidth={2.4} />
            </span>
            <span className="truncate text-[19px] leading-none font-semibold tracking-[-0.04em]">
              sentinelle<span className="text-m-muted">237</span>
            </span>
          </div>

          <MSegmented
            className="hidden lg:flex"
            value={selected}
            onChange={setSelected}
            items={NAV_ITEMS.map((i) => ({ value: i.view, label: i.label }))}
          />
          <MSegmented
            className="hidden md:flex lg:hidden"
            itemClassName="px-3"
            value={selected}
            onChange={setSelected}
            items={NAV_ITEMS.map((i) => ({ value: i.view, label: i.short }))}
          />

          <div className="flex shrink-0 items-center gap-2">
            <div className="hidden h-11 items-center gap-2 rounded-full bg-m-surface pr-4 pl-1.5 xl:flex">
              <MAvatar name={user?.pseudo} />
              <span className="max-w-[12ch] truncate text-[13px] font-medium">{user?.pseudo ?? "Admin"}</span>
            </div>
            <Link
              to="/"
              aria-label="Retour à l'application"
              className={mButtonClasses("dark", "md", "max-sm:size-11 max-sm:px-0")}
            >
              <span className="max-sm:hidden">Retour à l'app</span>
              <ArrowUpRight />
            </Link>
          </div>
        </header>

        <main className="flex flex-col gap-[18px]">
          {selected === "overview" && <AdminOverviewTab pseudo={user?.pseudo} onNavigate={setSelected} />}
          {selected === "users" && <AdminUsersTab />}
          {selected === "flux" && <AdminFluxTab />}
          {selected === "categories" && <AdminCategoriesTab />}
          {selected === "ml" && <AdminMLTab />}
        </main>
      </div>

      {/* Barre d'onglets flottante (mobile) */}
      <nav className="m-glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-0.5 rounded-full p-1 md:hidden">
        {NAV_ITEMS.map(({ view, short, icon: Icon }) => {
          const active = view === selected
          return (
            <button
              key={view}
              type="button"
              onClick={() => setSelected(view)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-12 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition-colors",
                active ? "bg-m-ink text-white" : "text-m-strong"
              )}
            >
              <Icon className={cn("size-4", active && "text-m-lime")} />
              {short}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
