import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { useNavigate } from "react-router-dom"
import {
  Bell,
  Bookmark,
  ChevronRight,
  Clock,
  EyeOff,
  FolderSearch,
  Gauge,
  Inbox,
  Languages,
  LineChart,
  LogOut,
  Menu,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  Download,
  Share,
  WifiOff,
  Search,
  ShieldCheck,
  User as UserIcon,
  X,
  Compass,
} from "lucide-react"
import { MMenu, MMenuContent, MMenuItem, MMenuSeparator, MMenuTrigger } from "@/components/mira/menu"
import { toast } from "@/components/mira/toast-manager"
import { useAuth } from "@/context/AuthContext"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { logoutUser } from "@/lib/api/auth"
import { disablePushOnLogout } from "@/lib/push"
import { useGuide } from "@/components/guide/guide-context"
import { getCategoriesFlux, getMyFluxes, toggleEpingle, unsubscribeFlux } from "@/lib/api/feeds"
import type { CategorieFlux, Flux } from "@/lib/api/types"
import { MAvatar, MBackground, MButton, MDialog } from "@/components/mira/mira"
import { cn } from "@/lib/utils"
import { AddFluxDialog } from "./AddFluxDialog"
import { BrandMark } from "./BrandMark"
import { promptInstall, useInstallAvailability, useOnline } from "@/lib/pwa"
import {
  VIEW_META,
  isSameView,
  useMainNavigation,
  type ActiveNav,
  type NavCounts,
  type SelectedView,
} from "./navigation"

interface MainLayoutProps {
  active: ActiveNav
  /** Fourni par Dashboard pour changer de vue sans changer de page. */
  onSelectView?: (view: SelectedView) => void
  counts?: NavCounts
  children: React.ReactNode
}

/** Coque commune de l'app : sidebar flottante + header en verre + contenu. */
export function MainLayout({ active, onSelectView, counts, children }: MainLayoutProps) {
  const go = useMainNavigation(onSelectView)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const { registerDrawer } = useGuide()

  // La visite guidée ouvre le tiroir mobile pour montrer la barre latérale
  useEffect(() => registerDrawer(setDrawerOpen), [registerDrawer])

  // Raccourci clavier : Ctrl/⌘ + K ouvre la recherche multilingue
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        navigate("/recherche")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [navigate])

  // Le tiroir mobile se ferme dès qu'on choisit une destination
  const goFromDrawer = (view: ActiveNav) => {
    setDrawerOpen(false)
    go(view)
  }

  const title = active.type === "feed" ? active.feedName : VIEW_META[active.type].title

  return (
    <div className="relative isolate min-h-svh bg-m-bg font-sans text-m-ink antialiased">
      <MBackground />

      <div className="mx-auto flex w-full max-w-[1560px] gap-[18px] p-3 sm:p-4 lg:p-5">
        {/* Sidebar fixe (desktop) */}
        <aside className="sticky top-5 hidden h-[calc(100svh-40px)] w-[272px] shrink-0 lg:block">
          <SidebarPanel active={active} counts={counts} onNavigate={go} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-[18px] pb-10">
          <MainHeader title={title} onOpenMenu={() => setDrawerOpen(true)} />
          <OfflineBanner />
          {children}
        </div>
      </div>

      {/* Tiroir (mobile / tablette) */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          drawerOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!drawerOpen}
      >
        <div
          className={cn("absolute inset-0 bg-m-ink/25 backdrop-blur-[2px] transition-opacity", drawerOpen ? "opacity-100" : "opacity-0")}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            "absolute top-3 bottom-3 left-3 w-[min(300px,calc(100vw-24px))] transition-transform duration-300 ease-out",
            drawerOpen ? "translate-x-0" : "-translate-x-[110%]"
          )}
        >
          <SidebarPanel
            active={active}
            counts={counts}
            onNavigate={goFromDrawer}
            onClose={() => setDrawerOpen(false)}
            className="bg-m-surface"
          />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function MainHeader({ title, onOpenMenu }: { title: string; onOpenMenu: () => void }) {
  const navigate = useNavigate()
  return (
    <header className="m-glass sticky top-3 z-30 flex h-[60px] items-center gap-2 rounded-full pr-2 pl-2 sm:top-4 lg:top-5 lg:pl-5">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Ouvrir le menu"
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-m-surface text-m-ink lg:hidden"
      >
        <Menu className="size-4" />
      </button>
      <p className="min-w-0 flex-1 truncate pl-1 text-[15px] font-medium tracking-[-0.02em]">
        <span className="text-m-muted max-sm:hidden">sentinelle / </span>
        {title}
      </p>

      <button
        type="button"
        onClick={() => navigate("/recherche")}
        data-tour="header-search"
        className="flex h-11 shrink-0 cursor-pointer items-center gap-2.5 rounded-full bg-m-surface pr-2 pl-4 text-sm text-m-muted transition-colors hover:text-m-ink max-sm:size-11 max-sm:justify-center max-sm:p-0"
        aria-label="Recherche multilingue"
      >
        <Search className="size-4 text-m-ink" />
        <span className="max-sm:hidden md:w-48 md:text-left">Recherche multilingue…</span>
        <kbd className="hidden rounded-full bg-m-surface-3 px-2 py-1 font-mono text-[10px] text-m-soft md:inline">Ctrl K</kbd>
      </button>
      <UserMenu />
    </header>
  )
}

function OfflineBanner() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="flex items-center gap-3 rounded-[22px] bg-m-ink px-5 py-3 text-sm text-white">
      <WifiOff className="size-4 shrink-0 text-m-lime" />
      Tu es hors ligne. Les articles déjà chargés restent consultables ; le reste se mettra à jour au retour de la connexion.
    </div>
  )
}

function UserMenu() {
  const { user } = useAuth()
  const { startTour } = useGuide()
  const navigate = useNavigate()
  const install = useInstallAvailability()
  const [iosHelpOpen, setIosHelpOpen] = useState(false)

  async function handleInstall() {
    if (install === "ios") return setIosHelpOpen(true)
    if (await promptInstall()) toast.add({ title: "Sentinelle est installée", type: "success" })
  }

  async function handleLogout() {
    try {
      await disablePushOnLogout()
      await logoutUser()
    } finally {
      navigate("/login")
    }
  }

  return (
    <>
    <MMenu>
      <MMenuTrigger
        render={
          <button
            type="button"
            aria-label="Menu du compte"
            data-tour="user-menu"
            className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full bg-m-ink pr-1.5 pl-1.5 text-white sm:pr-4"
          >
            <MAvatar name={user?.pseudo} className="ring-m-ink" />
            <span className="max-w-[12ch] truncate text-[13px] font-medium max-sm:hidden">{user?.pseudo ?? "Compte"}</span>
          </button>
        }
      />
      <MMenuContent align="end" sideOffset={8} className="w-56">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-medium">{user?.pseudo}</p>
          <p className="truncate text-[12px] text-m-soft">{user?.mail}</p>
        </div>
        <MMenuSeparator />
        <MMenuItem onClick={() => navigate("/account")}>
          <UserIcon /> Mon compte
        </MMenuItem>
        <MMenuItem onClick={startTour}>
          <Compass /> Visite guidée
        </MMenuItem>
        {user?.role === "admin" && (
          <MMenuItem onClick={() => navigate("/admin")}>
            <ShieldCheck /> Administration
          </MMenuItem>
        )}
        {install && (
          <MMenuItem onClick={handleInstall}>
            <Download /> Installer l’application
          </MMenuItem>
        )}
        <MMenuSeparator />
        <MMenuItem onClick={handleLogout}>
          <LogOut /> Se déconnecter
        </MMenuItem>
      </MMenuContent>
    </MMenu>
    <MDialog
      open={iosHelpOpen}
      onOpenChange={setIosHelpOpen}
      title="Installer sur iPhone ou iPad"
      description="Safari ne propose pas de bouton d’installation automatique."
      footer={<MButton onClick={() => setIosHelpOpen(false)}>Compris</MButton>}
    >
      <ol className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-3 rounded-2xl bg-m-surface-2 px-4 py-3">
          <span className="font-mono text-[11px] text-m-muted">1</span>
          Touche le bouton Partager <Share className="size-4 text-m-soft" /> en bas de Safari.
        </li>
        <li className="flex items-center gap-3 rounded-2xl bg-m-surface-2 px-4 py-3">
          <span className="font-mono text-[11px] text-m-muted">2</span>
          Choisis « Sur l’écran d’accueil », puis « Ajouter ».
        </li>
      </ol>
    </MDialog>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                             */
/* ------------------------------------------------------------------ */

const PRIMARY_NAV: { view: ActiveNav; label: string; icon: typeof Inbox; countKey?: keyof NavCounts }[] = [
  { view: { type: "today" }, label: "Aujourd’hui", icon: Inbox, countKey: "today" },
  { view: { type: "later" }, label: "À lire plus tard", icon: Clock, countKey: "later" },
  { view: { type: "annotated" }, label: "Annotées", icon: Bookmark, countKey: "annotated" },
  { view: { type: "alertes" }, label: "Alertes", icon: Bell, countKey: "alertes" },
  { view: { type: "dossiers" }, label: "Enquêtes", icon: FolderSearch, countKey: "dossiers" },
]

const SECONDARY_NAV: { view: ActiveNav; label: string; icon: typeof Inbox }[] = [
  { view: { type: "recherche" }, label: "Recherche multilingue", icon: Languages },
  { view: { type: "dashboard" }, label: "Tableau de bord", icon: Gauge },
  { view: { type: "marches" }, label: "Marchés", icon: LineChart },
]

function NavItem({
  active,
  icon: Icon,
  label,
  count,
  onClick,
  tourId,
}: {
  active: boolean
  icon: typeof Inbox
  label: string
  count?: number
  onClick: () => void
  tourId?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour={tourId}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-10 w-full cursor-pointer items-center gap-3 rounded-full px-3.5 text-left text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-m-lime",
        active ? "bg-m-ink text-white" : "text-m-strong hover:bg-m-surface-3 hover:text-m-ink"
      )}
    >
      <Icon className={cn("size-4 shrink-0", active ? "text-m-lime" : "text-m-soft")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span
          className={cn(
            "min-w-6 rounded-full px-1.5 py-0.5 text-center font-mono text-[10px] tabular-nums",
            active ? "bg-white/15 text-white" : "bg-m-surface-3 text-m-soft"
          )}
        >
          {count > 999 ? "999+" : count}
        </span>
      )}
    </button>
  )
}

function SidebarPanel({
  active,
  counts,
  onNavigate,
  onClose,
  className,
}: {
  active: ActiveNav
  counts?: NavCounts
  onNavigate: (view: ActiveNav) => void
  onClose?: () => void
  className?: string
}) {
  const [feedSearch, setFeedSearch] = useState("")
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [addOpen, setAddOpen] = useState(false)

  const { data: feedsData, refresh: refreshFeeds } = useCachedFetch<Flux[]>("feeds", getMyFluxes, 2 * 60 * 1000)
  const feeds = useMemo(() => feedsData ?? [], [feedsData])
  const { data: categoriesData } = useCachedFetch<CategorieFlux[]>("categories-flux", getCategoriesFlux, 30 * 60 * 1000)
  const categories = useMemo(() => categoriesData ?? [], [categoriesData])
  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id_categorie, c])),
    [categories]
  )

  const groups = useMemo(() => {
    const q = feedSearch.trim().toLowerCase()
    const list = q ? feeds.filter((f) => f.nom.toLowerCase().includes(q)) : feeds
    const pinned = list.filter((f) => f.isEpingle)
    const byCategory = list
      .filter((f) => !f.isEpingle)
      .reduce<Record<string, Flux[]>>((acc, f) => {
        const label = (f.categorie_id && categoriesById[f.categorie_id]?.libelle) || "Non classé"
        ;(acc[label] ??= []).push(f)
        return acc
      }, {})
    return [
      ...(pinned.length ? [{ label: "Épinglés", pinned: true, feeds: pinned }] : []),
      ...Object.entries(byCategory).map(([label, items]) => ({ label, pinned: false, feeds: items })),
    ]
  }, [feeds, feedSearch, categoriesById])

  async function handleUnfollow(feed: Flux) {
    try {
      await unsubscribeFlux(feed.id_flux)
      await refreshFeeds()
      toast.add({ title: "Flux non suivi", description: feed.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de te désabonner", type: "error" })
    }
  }

  async function handleTogglePin(feed: Flux) {
    try {
      await toggleEpingle(feed.id_flux, !feed.isEpingle)
      await refreshFeeds()
      toast.add({ title: feed.isEpingle ? "Flux désépinglé" : "Flux épinglé", description: feed.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de mettre à jour l’épinglage", type: "error" })
    }
  }

  return (
    <nav
      aria-label="Navigation principale"
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[28px] bg-m-surface/85 shadow-[inset_0_0_0_1px_rgba(255,255,255,.7),0_10px_30px_rgba(15,17,15,.08)] backdrop-blur-xl",
        className
      )}
    >
      {/* Marque */}
      <div className="flex h-[68px] shrink-0 items-center gap-2.5 px-5">
        <BrandMark className="flex-1" />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-m-surface-3 text-m-soft"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-0.5 px-3">
        {PRIMARY_NAV.map((item) => (
          <NavItem
            key={item.view.type}
            active={isSameView(active, item.view)}
            icon={item.icon}
            label={item.label}
            count={item.countKey ? counts?.[item.countKey] : undefined}
            onClick={() => onNavigate(item.view)}
            tourId={`nav-${item.view.type}`}
          />
        ))}
        <div className="mx-3.5 my-2 h-px bg-m-surface-4" />
        <div data-tour="nav-secondary" className="flex flex-col gap-0.5">
          {SECONDARY_NAV.map((item) => (
            <NavItem
              key={item.view.type}
              active={isSameView(active, item.view)}
              icon={item.icon}
              label={item.label}
              onClick={() => onNavigate(item.view)}
            />
          ))}
        </div>
      </div>

      {/* Flux suivis */}
      <div data-tour="flux-list" className="mx-1 mt-2 shrink-0 rounded-[22px] px-2 pt-2 pb-1">
      <div className="flex items-center justify-between px-2">
        <button
          type="button"
          onClick={() => onNavigate({ type: "gestion" })}
          title="Gérer mes flux"
          className={cn(
            "cursor-pointer font-mono text-[10px] tracking-wide uppercase hover:text-m-ink",
            active.type === "gestion" ? "text-m-ink underline underline-offset-4" : "text-m-muted"
          )}
        >
          Flux suivis · {feeds.length}
        </button>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          aria-label="Ajouter un flux"
          data-tour="flux-add"
          className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-m-lime text-m-ink transition hover:brightness-95"
        >
          <Plus className="size-4" />
        </button>
      </div>
      <div className="relative mt-2.5">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-m-muted" />
        <input
          aria-label="Filtrer les flux"
          value={feedSearch}
          onChange={(e) => setFeedSearch(e.target.value)}
          placeholder="Filtrer les flux…"
          className="h-9 w-full rounded-full bg-m-surface-2 pr-3 pl-9 text-[13px] outline-none placeholder:text-m-muted focus-visible:ring-2 focus-visible:ring-m-lime"
        />
      </div>
      </div>

      <div className="m-fade-top mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-3 pb-4">
        {feeds.length === 0 && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="w-full cursor-pointer rounded-2xl border border-dashed border-m-ring p-4 text-left text-[13px] text-m-soft hover:bg-m-surface-2"
          >
            Aucun flux suivi pour l’instant. <span className="font-medium text-m-ink">Ajoute ta première source →</span>
          </button>
        )}
        {groups.map((group) => {
          const isOpen = feedSearch.trim() ? true : (openGroups[group.label] ?? true)
          return (
            <div key={group.label} className="mb-1.5">
              <button
                type="button"
                onClick={() => setOpenGroups((g) => ({ ...g, [group.label]: !isOpen }))}
                className="flex h-8 w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 text-left text-[12px] font-medium text-m-soft hover:text-m-ink"
              >
                <ChevronRight className={cn("size-3.5 transition-transform", isOpen && "rotate-90")} />
                {group.pinned && <Pin className="size-3 rotate-45" />}
                <span className="truncate">{group.label}</span>
                <span className="ml-auto font-mono text-[10px] text-m-muted">{group.feeds.length}</span>
              </button>
              {isOpen &&
                group.feeds.map((feed) => {
                  const view: SelectedView = { type: "feed", feedId: feed.id_flux, feedName: feed.nom }
                  const isActive = isSameView(active, view)
                  const color = feed.categorie_id ? categoriesById[feed.categorie_id]?.couleur : undefined
                  return (
                    <div key={feed.id_flux} className="group/feed relative">
                      <button
                        type="button"
                        onClick={() => onNavigate(view)}
                        aria-current={isActive ? "page" : undefined}
                        title={feed.nom}
                        className={cn(
                          "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-xl pr-9 pl-3 text-left text-[13px] transition-colors",
                          isActive ? "bg-m-lime-soft font-medium text-m-ink" : "text-m-body hover:bg-m-surface-2"
                        )}
                      >
                        <span
                          className="size-2 shrink-0 rounded-full ring-2 ring-m-surface"
                          style={{ backgroundColor: color ?? "#b5b5b0" }}
                        />
                        <span className="min-w-0 flex-1 truncate">{feed.nom}</span>
                      </button>
                      <MMenu>
                        <MMenuTrigger
                          render={
                            <button
                              type="button"
                              aria-label={`Actions pour ${feed.nom}`}
                              className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-m-soft opacity-100 transition-opacity hover:bg-m-surface-3 hover:text-m-ink data-popup-open:opacity-100 lg:opacity-0 lg:group-hover/feed:opacity-100"
                            >
                              <MoreHorizontal className="size-4" />
                            </button>
                          }
                        />
                        <MMenuContent align="end" sideOffset={4} className="w-48">
                          <MMenuItem onClick={() => handleTogglePin(feed)}>
                            {feed.isEpingle ? (
                              <>
                                <PinOff /> Désépingler
                              </>
                            ) : (
                              <>
                                <Pin className="rotate-45" /> Épingler
                              </>
                            )}
                          </MMenuItem>
                          <MMenuItem tone="danger" onClick={() => handleUnfollow(feed)}>
                            <EyeOff /> Ne plus suivre
                          </MMenuItem>
                        </MMenuContent>
                      </MMenu>
                    </div>
                  )
                })}
            </div>
          )
        })}
      </div>

      <AddFluxDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        categories={categories}
        categoriesById={categoriesById}
        onAdded={refreshFeeds}
      />
    </nav>
  )
}
