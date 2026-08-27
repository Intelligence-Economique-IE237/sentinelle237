import { LayoutDashboard, Users, Rss, Tag, Brain, LogOut } from "lucide-react"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Link } from "react-router-dom"

export type AdminView = "overview" | "users" | "flux" | "categories" | "ml"

interface AdminSidebarProps {
  selected: AdminView
  onSelect: (view: AdminView) => void
}

const NAV_ITEMS: { view: AdminView; label: string; icon: typeof LayoutDashboard }[] = [
  { view: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { view: "users", label: "Utilisateurs", icon: Users },
  { view: "flux", label: "Flux", icon: Rss },
  { view: "categories", label: "Catégories", icon: Tag },
  { view: "ml", label: "Machine Learning", icon: Brain },
]

export function AdminSidebar({ selected, onSelect }: AdminSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="md:h-10">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <LayoutDashboard className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">Administration</span>
                <span className="truncate text-xs">Sentinelle 237</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Gestion</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map(({ view, label, icon: Icon }) => (
                <SidebarMenuItem key={view}>
                  <SidebarMenuButton isActive={selected === view} onClick={() => onSelect(view)}>
                    <Icon />
                    <span>{label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/" />}>
              <LogOut />
              <span>Retour à l'app</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
