import { useEffect, useMemo, useState } from "react"
import type React from "react"
import { cn } from "@/lib/utils"
import {
  Pin,
  PinOff,
  Plus,
  Command,
  Moon,
  Sun,
  Search,
  Inbox,
  Clock,
  Bookmark,
  FolderSearch,
  MoreVertical,
  ChevronRight,
  EyeOff,
  TrendingUp,
  History,
  X,
  Loader2,
  ExternalLink,
  ArrowRight,
  Bell,
  HelpCircle,
  LineChart,
  Gauge,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/toast"
import { LANGUE_LABELS } from "@/components/AlertFormDialog"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import {
  addFlux,
  getCategoriesFlux,
  getFluxSuggestions,
  getMyFluxes,
  subscribeToFlux,
  unsubscribeFlux,
} from "@/lib/api/feeds"
import { ApiError } from "@/lib/api/client"
import { rechercheAvancee } from "@/lib/api/search"
import { toggleEpingle } from "@/lib/api/feeds" 

import type {
  CategorieFlux,
  Flux,
  FluxSuggestion,
  FluxType,
  Langue,
  RechercheAvanceeResponse,
} from "@/lib/api/types"

function resolveFeedColor(
  categorieId: string | null,
  categoriesById: Record<string, CategorieFlux>
): { className?: string; style?: React.CSSProperties } {
  const cat = categorieId ? categoriesById[categorieId] : undefined
  if (cat?.couleur) {
    return { style: { backgroundColor: cat.couleur } }
  }
  return { className: "bg-gray-400" }
}

const RECENT_SEARCHES_KEY = "sentinelle237.recent-searches"
const MAX_RECENT_SEARCHES = 6

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
  } catch {
    // stockage indisponible — on ignore silencieusement
  }
}

const SEARCH_LANGUES: Langue[] = ["fr", "en", "es", "zh", "hi", "ar", "pt", "ru", "ja", "de"]

export type SelectedView =
  | { type: "today" }
  | { type: "later" }
  | { type: "annotated" }
  | { type: "alertes" }
  | { type: "dossiers" }
  | { type: "marches" }
  | { type: "dashboard" }
  | { type: "feed"; feedId: string; feedName: string }

interface AppSidebarProps {
  selected: SelectedView
  onSelect: (view: SelectedView) => void
  counts: { today: number; later: number; annotated: number; alertes: number; dossiers: number }
}

export function AppSidebar({ selected, onSelect, counts }: AppSidebarProps) {
  const [search, setSearch] = useState("")
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  )
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})

  // --- Flux suivis, mis en cache (2 min) — évite le spinner à chaque retour sur la sidebar ---
  const { data: feedsData, refresh: refreshFeeds } = useCachedFetch<Flux[]>(
    "feeds",
    getMyFluxes,
    2 * 60 * 1000
  )
  const feeds = feedsData ?? []

  // --- Catégories, mises en cache (30 min) — quasi statique ---
  const { data: categoriesData } = useCachedFetch<CategorieFlux[]>(
    "categories-flux",
    getCategoriesFlux,
    30 * 60 * 1000
  )
  const categories = categoriesData ?? []

  const categoriesById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id_categorie, c])),
    [categories]
  )

  // --- Dialog "Ajouter un flux" ---
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<{
    identifiant: string
    type: FluxType
    nom: string
    categorie: string
  }>({ identifiant: "", type: "rss", nom: "", categorie: "" })
  const [saving, setSaving] = useState(false)

  function updateForm<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmitFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!form.identifiant.trim()) return
    setSaving(true)
    try {
      const res = await addFlux({
        identifiant: form.identifiant,
        type: form.type,
        nom: form.nom || undefined,
        categorie: form.categorie || undefined,
      })
      await refreshFeeds()
      toast.add({
        title: res.alreadyExisted ? "Abonné au flux existant" : "Flux ajouté",
        description: res.flux.nom,
        type: "success",
      })
      setForm({ identifiant: "", type: "rss", nom: "", categorie: "" })
      setDialogOpen(false)
    } catch (err) {
      if (err instanceof ApiError) {
        const message =
          err.status === 400
            ? "Vérifie les informations saisies"
            : err.status === 409
              ? "Tu es déjà abonné à ce flux"
              : err.status === 422
                ? "Ce site est inaccessible, bloque les robots, ou aucun flux n'a été détecté"
                : err.message
        toast.add({ title: "Erreur", description: message, type: "error" })
      } else {
        toast.add({ title: "Erreur", description: "Impossible de contacter le serveur", type: "error" })
      }
    } finally {
      setSaving(false)
    }
  }

  // --- Onglet "Suggestions" — catalogue complet, groupé par catégorie, repliable ---
  const [suggestionsCatalog, setSuggestionsCatalog] = useState<FluxSuggestion[]>([])
  const [suggestionsCatalogLoading, setSuggestionsCatalogLoading] = useState(false)
  const [suggestionSearch, setSuggestionSearch] = useState("")
  const [openSuggestionCategories, setOpenSuggestionCategories] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!dialogOpen) return
    setSuggestionsCatalogLoading(true)
    getFluxSuggestions({ limit: 100 })
      .then(setSuggestionsCatalog)
      .catch(() => toast.add({ title: "Impossible de charger le catalogue", type: "error" }))
      .finally(() => setSuggestionsCatalogLoading(false))
  }, [dialogOpen])

  const filteredCatalog = suggestionSearch.trim()
    ? suggestionsCatalog.filter((s) => s.nom.toLowerCase().includes(suggestionSearch.toLowerCase()))
    : suggestionsCatalog

  const catalogByCategory = useMemo(() => {
    return filteredCatalog.reduce<Record<string, FluxSuggestion[]>>((acc, s) => {
      const label = s.categorie_id ? categoriesById[s.categorie_id]?.libelle ?? "Non classé" : "Non classé"
      acc[label] = acc[label] ? [...acc[label], s] : [s]
      return acc
    }, {})
  }, [filteredCatalog, categoriesById])

  async function handleSubscribeSuggestion(s: FluxSuggestion) {
    if (s.isSubscribed) {
      toast.add({ title: "Tu suis déjà ce flux", description: s.nom, type: "success" })
      return
    }
    try {
      await subscribeToFlux(s.id_flux)
      await refreshFeeds()
      setSuggestionsCatalog((prev) => prev.filter((x) => x.id_flux !== s.id_flux))
      setDialogOpen(false)
      toast.add({ title: "Abonné", description: s.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de suivre ce flux", type: "error" })
    }
  }

  // --- Flux suivis, groupés par catégorie ---
  const filteredFeeds = feeds.filter((f) => f.nom.toLowerCase().includes(search.toLowerCase()))
  const pinnedFeeds = filteredFeeds.filter((f) => f.isEpingle)
  const unpinnedFeeds = filteredFeeds.filter((f) => !f.isEpingle)

  const byCategory = useMemo(() => {
    return unpinnedFeeds.reduce<Record<string, Flux[]>>((acc, f) => {
      const label = f.categorie_id ? categoriesById[f.categorie_id]?.libelle ?? "Non classé" : "Non classé"
      acc[label] = acc[label] ? [...acc[label], f] : [f]
      return acc
    }, {})
  }, [unpinnedFeeds, categoriesById])

  function toggleCategory(category: string) {
    setOpenCategories((prev) => ({ ...prev, [category]: !prev[category] }))
  }

  function toggleDark() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  async function handleUnfollow(feed: Flux) {
    try {
      await unsubscribeFlux(feed.id_flux)
      await refreshFeeds()
      toast.add({ title: "Flux non suivi", description: feed.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de te désabonner", type: "error" })
    }
  }

    async function handleToggleEpingle(feed: Flux) {
  try {
    await toggleEpingle(feed.id_flux, !feed.isEpingle)
    await refreshFeeds()
    toast.add({
      title: feed.isEpingle ? "Flux désépinglé" : "Flux épinglé",
      description: feed.nom,
      type: "success",
    })
  } catch {
    toast.add({ title: "Erreur", description: "Impossible de mettre à jour l'épinglage", type: "error" })
  }
}

  // --- Modale de recherche avancée cross-langue ---
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [langueSource, setLangueSource] = useState<Langue>("fr")
  const [langueCible, setLangueCible] = useState<Langue>("en")
  const [searchPays, setSearchPays] = useState("")
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResult, setSearchResult] = useState<RechercheAvanceeResponse | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [openPinned, setOpenPinned] = useState(true)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => {
    setRecentSearches(loadRecentSearches())
  }, [])

  async function runSearch(query: string) {
    const trimmed = query.trim()
    if (!trimmed) return
    setSearchQuery(trimmed)
    setSearchLoading(true)
    setSearchError(null)
    try {
      const res = await rechercheAvancee({
        requete: trimmed,
        langue_source: langueSource,
        langue_cible: langueCible,
        pays: searchPays || undefined,
      })
      setSearchResult(res)
      const updated = [
        trimmed,
        ...recentSearches.filter((s) => s.toLowerCase() !== trimmed.toLowerCase()),
      ].slice(0, MAX_RECENT_SEARCHES)
      setRecentSearches(updated)
      saveRecentSearches(updated)
    } catch (err) {
      setSearchResult(null)
      if (err instanceof ApiError) {
        const message =
          err.status === 400
            ? "Requête invalide (trop courte, ou code langue/pays incorrect)"
            : err.status === 429
              ? "Limite de recherches atteinte pour aujourd'hui"
              : err.status === 502
                ? "Service de recherche externe indisponible, réessaie plus tard"
                : err.message
        setSearchError(message)
      } else {
        setSearchError("Impossible de contacter le serveur")
      }
    } finally {
      setSearchLoading(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch(searchQuery)
  }

  function removeRecentSearch(query: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = recentSearches.filter((s) => s !== query)
    setRecentSearches(updated)
    saveRecentSearches(updated)
  }

  function resetSearchModal(open: boolean) {
    setSearchModalOpen(open)
    if (!open) {
      setSearchResult(null)
      setSearchError(null)
    }
  }

  const isSelected = (view: SelectedView) =>
    view.type === selected.type &&
    (view.type !== "feed" || (selected.type === "feed" && view.feedId === selected.feedId))

  return (
    <Sidebar collapsible="icon" className="overflow-hidden *:data-[sidebar=sidebar]:flex-row">
      {/* Rail étroit — icônes d'actions globales */}
      <Sidebar collapsible="none" className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="md:h-8 md:p-0"
                render={
                  <a href="#">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <Command className="size-4" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">Sentinelle237</span>
                    </div>
                  </a>
                }
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={isSelected({ type: "dashboard" })} 
                    onClick={() => onSelect({ type: "dashboard" })}
                    tooltip={{ children: "Dashboard", hidden: false }}
                    >
                    <Gauge />
                    <span>Dashboard</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{ children: "Ajouter un flux", hidden: false }}
                    onClick={() => setDialogOpen(true)}
                    className="px-2.5 md:px-2"
                  >
                    <Plus />
                    <span>Ajouter un flux</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{ children: "Rechercher", hidden: false }}
                    onClick={() => setSearchModalOpen(true)}
                    className="px-2.5 md:px-2"
                  >
                    <Search />
                    <span>Rechercher</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton 
                    isActive={isSelected({ type: "marches" })} 
                    onClick={() => onSelect({ type: "marches" })}
                    tooltip={{ children: "Marchés", hidden: false }}
                    >
                    <LineChart />
                    <span>Marchés</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={{ children: isDark ? "Mode clair" : "Mode sombre", hidden: false }}
                    onClick={toggleDark}
                    className="px-2.5 md:px-2"
                  >
                    {isDark ? <Sun /> : <Moon />}
                    <span>{isDark ? "Mode clair" : "Mode sombre"}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton tooltip={{ children: "Aide", hidden: false }} onClick={() => setHelpOpen(true)} className="px-2.5 md:px-2">
                    <HelpCircle />
                    <span>Aide</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
      </Sidebar>

      {/* Second panneau */}
      <Sidebar collapsible="none" className="flex flex-1 min-w-0">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="text-base font-medium text-foreground">Sentinelle 237</div>
          <SidebarInput
            placeholder="Rechercher un flux..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={isSelected({ type: "alertes" })} onClick={() => onSelect({ type: "alertes" })}>
                    <Bell />
                    <span>Alertes</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge><ArrowRight className="h-4 w-4" /></SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={isSelected({ type: "dossiers" })} onClick={() => onSelect({ type: "dossiers" })}>
                    <FolderSearch />
                    <span>Enquêtes</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{counts.dossiers}</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={isSelected({ type: "today" })} onClick={() => onSelect({ type: "today" })}>
                    <Inbox />
                    <span>Aujourd'hui</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{counts.today}</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={isSelected({ type: "later" })} onClick={() => onSelect({ type: "later" })}>
                    <Clock />
                    <span>À lire plus tard</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{counts.later}</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton isActive={isSelected({ type: "annotated" })} onClick={() => onSelect({ type: "annotated" })}>
                    <Bookmark />
                    <span>Annotées</span>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{counts.annotated}</SidebarMenuBadge>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <div className="flex items-center gap-1.5 px-2 pt-2">
            <span className="text-xs font-medium text-sidebar-foreground/70">Flux</span>
          </div>
          
          <div className="min-h-0 h-screen flex-1 overflow-y-auto overscroll-contain pb-20">

          {pinnedFeeds.length > 0 && (
            <Collapsible
              open={openPinned}
              onOpenChange={setOpenPinned}
            >
              <SidebarGroup>
                <CollapsibleTrigger
                  nativeButton={false}
                  render={
                    <SidebarGroupLabel className="group/pinned w-full cursor-pointer">
                      <Pin className="h-3 w-3 shrink-0 text-muted-foreground rotate-45" />

                      <span className="ml-2">Épinglés</span>

                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[panel-open]/pinned:rotate-90" />
                    </SidebarGroupLabel>
                  }
                />

                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {pinnedFeeds.map((feed) => (
                        <SidebarMenuItem
                          key={feed.id_flux}
                          className="group/feed-item relative min-w-0"
                        >
                          <SidebarMenuButton
                            isActive={isSelected({
                              type: "feed",
                              feedId: feed.id_flux,
                              feedName: feed.nom,
                            })}
                            onClick={() =>
                              onSelect({
                                type: "feed",
                                feedId: feed.id_flux,
                                feedName: feed.nom,
                              })
                            }
                          >
                            {(() => {
                              const color = resolveFeedColor(
                                feed.categorie_id,
                                categoriesById
                              )

                              return (
                                <span
                                  className={cn(
                                    "h-2 w-2 shrink-0 rounded-full",
                                    color.className
                                  )}
                                  style={color.style}
                                />
                              )
                            })()}

                            <span
                              className="min-w-0 flex-1 overflow-hidden whitespace-nowrap pr-8"
                                style={{
                                  maskImage:
                                    "linear-gradient(to right, black calc(100% - 28px), transparent)",
                                  WebkitMaskImage:
                                    "linear-gradient(to right, black calc(100% - 28px), transparent)",
                                }}
                              title={feed.nom}
                            >
                              {feed.nom}
                            </span>
                          </SidebarMenuButton>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="
                                          absolute right-1 top-1/2 z-10 h-7 w-7 -translate-y-1/2
                                          bg-sidebar
                                          opacity-100
                                          transition-opacity
                                          md:opacity-0
                                          md:group-hover/feed-item:opacity-100
                                          data-popup-open:opacity-100"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />

                            <DropdownMenuContent
                              align="end"
                              side="bottom"
                              sideOffset={4}
                              className="w-44 min-w-0"
                            >
                              <DropdownMenuItem
                                onClick={() => handleToggleEpingle(feed)}
                              >
                                <PinOff className="h-4 w-4" />
                                Désépingler
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                variant="destructive"
                                onClick={() => handleUnfollow(feed)}
                              >
                                <EyeOff className="h-4 w-4" />
                                Ne plus suivre
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}

          {Object.entries(byCategory).map(([category, categoryFeeds]) => (
            <Collapsible
              key={category}
              open={openCategories[category] ?? true}
              onOpenChange={() => toggleCategory(category)}
            >
              <SidebarGroup>
                <CollapsibleTrigger
                  nativeButton={false}
                  render={
                    <SidebarGroupLabel className="group/collapsible w-full cursor-pointer">
                      <span>{category}</span>
                      <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[panel-open]/collapsible:rotate-90" />
                    </SidebarGroupLabel>
                  }
                />
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {categoryFeeds
                        .filter(
                          (feed) =>
                            !pinnedFeeds.some(
                              (pinnedFeed) => pinnedFeed.id_flux === feed.id_flux
                            )
                        )
                        .map((feed) => (
                        <SidebarMenuItem key={feed.id_flux} className="group/feed-item min-w-0">
                          <SidebarMenuButton
                            isActive={isSelected({ type: "feed", feedId: feed.id_flux, feedName: feed.nom })}
                            onClick={() => onSelect({ type: "feed", feedId: feed.id_flux, feedName: feed.nom })}
                          >
                            {(() => {
                              const color = resolveFeedColor(feed.categorie_id, categoriesById)
                              return (
                                <span
                                  className={cn("h-2 w-2 shrink-0 rounded-full", color.className)}
                                  style={color.style}
                                />
                              )
                            })()}
                            <span
                              className="min-w-0 flex-1 overflow-hidden whitespace-nowrap pr-8"
                                style={{
                                  maskImage:
                                    "linear-gradient(to right, black calc(100% - 28px), transparent)",
                                  WebkitMaskImage:
                                    "linear-gradient(to right, black calc(100% - 28px), transparent)",
                                }}
                              title={feed.nom}
                            >
                              {feed.nom}
                            </span>
                          </SidebarMenuButton>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="        
                                    absolute right-1 top-1/2 z-10 h-7 w-7 -translate-y-1/2
                                    bg-sidebar
                                    opacity-100
                                    transition-opacity
                                    md:opacity-0
                                    md:group-hover/feed-item:opacity-100
                                    data-popup-open:opacity-100"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" side="bottom" sideOffset={4} className="w-44 min-w-0">
                              <DropdownMenuItem onClick={() => handleToggleEpingle(feed)}>
                                {feed.isEpingle ? (
                                  <>
                                    <PinOff className="h-4 w-4" />
                                    Désépingler
                                  </>
                                ) : (
                                  <>
                                    <Pin className="h-4 w-4 rotate-45" />
                                    Épingler
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => handleUnfollow(feed)}>
                                <EyeOff className="h-4 w-4" />
                                Ne plus suivre
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ))}
          </div>
        </SidebarContent>
      </Sidebar>

      {/* Dialog "Ajouter un flux" — onglets Ajouter / Suggestions */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un flux</DialogTitle>
            <DialogDescription>Ajoute ta propre source, ou choisis dans le catalogue</DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="add" className="flex min-h-0 flex-1 flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="add" className="flex-1">Ajouter</TabsTrigger>
              <TabsTrigger value="suggestions" className="flex-1">Suggestions</TabsTrigger>
            </TabsList>

            <TabsContent value="add" className="pt-3">
              <form onSubmit={handleSubmitFeed} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type de source</Label>
                  <Select value={form.type} onValueChange={(v) => updateForm("type", v as FluxType)}>
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rss">RSS</SelectItem>
                      <SelectItem value="x">X (Twitter)</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="telegram">Telegram</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="identifiant">
                    {form.type === "rss" && "Domaine ou URL du flux"}
                    {form.type === "x" && "Nom d'utilisateur (sans @)"}
                    {form.type === "youtube" && "URL de la chaîne"}
                    {form.type === "telegram" && "Nom du canal (sans @)"}
                  </Label>
                  <Input
                    id="identifiant"
                    value={form.identifiant}
                    onChange={(e) => updateForm("identifiant", e.target.value)}
                    placeholder={
                      form.type === "rss"
                        ? "lemonde.fr"
                        : form.type === "x"
                          ? "elonmusk"
                          : form.type === "youtube"
                            ? "https://youtube.com/@chaine"
                            : "nomducanal"
                    }
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nom">Nom affiché (optionnel)</Label>
                  <Input
                    id="nom"
                    value={form.nom}
                    onChange={(e) => updateForm("nom", e.target.value)}
                    placeholder="Laisse vide pour utiliser le nom détecté"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie (optionnel)</Label>
                  <Select value={form.categorie} onValueChange={(v) => updateForm("categorie", v ?? "")}>
                    <SelectTrigger id="category" className="w-full">
                      <SelectValue placeholder="Sélectionne une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.code} value={cat.code}>
                          <span className="mr-2 inline-flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: cat.couleur }}
                            />
                            {cat.libelle}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={saving} className="w-full">
                  {saving ? "Ajout en cours..." : "Ajouter le flux"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="suggestions" className="flex min-h-0 flex-1 flex-col gap-2 pt-3">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans le catalogue..."
                  value={suggestionSearch}
                  onChange={(e) => setSuggestionSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
                {suggestionsCatalogLoading && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Chargement du catalogue...</p>
                )}
                {!suggestionsCatalogLoading && Object.keys(catalogByCategory).length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Aucun résultat</p>
                )}
                {Object.entries(catalogByCategory).map(([label, items]) => (
                  <Collapsible
                    key={label}
                    open={suggestionSearch.trim() ? true : (openSuggestionCategories[label] ?? false)}
                    onOpenChange={() =>
                      setOpenSuggestionCategories((prev) => ({ ...prev, [label]: !prev[label] }))
                    }
                  >
                    <CollapsibleTrigger
                      nativeButton={false}
                      render={
                        <button
                          type="button"
                          className="group/sugg-cat flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
                        >
                          <span>{label}</span>
                          <span className="text-xs text-muted-foreground">({items.length})</span>
                          <ChevronRight className="ml-auto h-4 w-4 transition-transform group-data-[panel-open]/sugg-cat:rotate-90" />
                        </button>
                      }
                    />
                    <CollapsibleContent>
                      <div className="space-y-0.5 py-1 pl-3">
                        {items.map((s) => (
                          <div
                            key={s.id_flux}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                          >
                            <span className="min-w-0 flex-1 truncate" title={s.nom}>
                              {s.nom}
                            </span>
                            <Button
                              size="sm"
                              variant={s.isSubscribed ? "outline" : "default"}
                              disabled={s.isSubscribed}
                              onClick={() => handleSubscribeSuggestion(s)}
                            >
                              {s.isSubscribed ? "Suivi" : "Suivre"}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Modale de recherche avancée cross-langue */}
      <Dialog open={searchModalOpen} onOpenChange={resetSearchModal}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
          <form onSubmit={handleSearchSubmit} className="shrink-0 space-y-3 border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un mot-clé (traduit et recherché dans 2 langues)..."
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Select value={langueSource} onValueChange={(v) => setLangueSource(v as Langue)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_LANGUES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANGUE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={langueCible} onValueChange={(v) => setLangueCible(v as Langue)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEARCH_LANGUES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LANGUE_LABELS[l]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={searchPays}
                onChange={(e) => setSearchPays(e.target.value.toUpperCase())}
                placeholder="Pays (opt.)"
                maxLength={2}
              />
            </div>

            <Button type="submit" disabled={searchLoading || !searchQuery.trim()} className="w-full gap-2">
              {searchLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {searchLoading ? "Recherche en cours..." : "Rechercher"}
            </Button>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {searchError && (
              <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {searchError}
              </div>
            )}

            {!searchResult && !searchError && !searchLoading && (
              <>
                {recentSearches.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
                      <History className="h-3.5 w-3.5" />
                      Recherches récentes
                    </div>
                    <div className="space-y-0.5">
                      {recentSearches.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => runSearch(item)}
                          className="group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <span className="truncate">{item}</span>
                          <span
                            role="button"
                            onClick={(e) => removeRecentSearch(item, e)}
                            className="rounded p-0.5 opacity-0 hover:bg-background group-hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Résultats éphémères — rien n'est enregistré en base
                </div>
              </>
            )}

            {searchResult && (
              <div className="space-y-5">
                <p className="text-xs text-muted-foreground">
                  « {searchResult.requete_originale} » → « {searchResult.requete_traduite} »
                </p>

                {searchResult.webIndisponible && (
                  <div className="rounded-md border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm text-orange-700 dark:text-orange-400">
                    Recherche web externe indisponible pour l'instant — seul ton corpus interne est affiché.
                  </div>
                )}

                <div>
                  <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                    Dans tes flux suivis ({searchResult.corpus_interne.length})
                  </h4>
                  {searchResult.corpus_interne.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Rien trouvé dans tes flux suivis</p>
                  ) : (
                    <div className="space-y-1">
                      {searchResult.corpus_interne.map((item) => (
                        
                        <a  key={item.id_article}
                          href={item.lien}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                        >
                          <span className="min-w-0 flex-1 truncate">{item.titre}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {Object.entries(searchResult.web).map(([langue, results]) => (
                  <div key={langue}>
                    <h4 className="mb-2 text-xs font-semibold text-muted-foreground">
                      Web — {LANGUE_LABELS[langue as Langue] ?? langue} ({results.length})
                    </h4>
                    {results.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun résultat</p>
                    ) : (
                      <div className="space-y-2">
                        {results.map((r) => (
                          
                          <a  key={r.lien}
                            href={r.lien}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-md border p-2 text-sm hover:bg-accent"
                          >
                            <p className="font-medium">{r.titre}</p>
                            {r.description && (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{r.description}</p>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Guide rapide</DialogTitle>
            <DialogDescription>Les actions essentielles de la sidebar</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Plus className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Ajouter un flux</p>
                <p className="text-sm text-muted-foreground">
                  Ajoute ta propre source RSS/X/YouTube/Telegram, ou choisis parmi les flux suggérés dans le catalogue.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Search className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Rechercher</p>
                <p className="text-sm text-muted-foreground">
                  Recherche cross-langue dans tes flux suivis et sur le web — ton mot-clé est traduit et recherché dans deux langues à la fois.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                <LineChart className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Marché</p>
                <p className="text-sm text-muted-foreground">
                    Cours des devises (XAF, USD, EUR...) et matières premières (Or, Argent, Platine...)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-medium">Changer de thème</p>
                <p className="text-sm text-muted-foreground">
                  Bascule entre le mode clair et le mode sombre — ton choix est mémorisé pour tes prochaines visites.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}