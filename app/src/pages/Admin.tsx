import { useState } from "react"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminSidebar, type AdminView } from "@/components/AdminSidebar"
import { AdminOverviewTab } from "@/components/AdminOverviewTab"
import { AdminUsersTab } from "@/components/AdminUsersTab"
import { AdminFluxTab } from "@/components/AdminFluxTab"
import { AdminCategoriesTab } from "@/components/AdminCategoriesTab"
import { AdminMLTab } from "@/components/AdminMLTab"

const VIEW_TITLES: Record<AdminView, string> = {
  overview: "Vue d'ensemble",
  users: "Utilisateurs",
  flux: "Flux",
  categories: "Catégories",
  ml: "Machine Learning",
}

export default function Admin() {
  const [selected, setSelected] = useState<AdminView>("overview")

  return (
    <SidebarProvider className="h-svh">
      <AdminSidebar selected={selected} onSelect={setSelected} />

      <SidebarInset className="overflow-y-auto">
        <div className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background px-4 py-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-4!" />
          <p className="text-sm font-medium">{VIEW_TITLES[selected]}</p>
        </div>

        <div className="p-4">
          {selected === "overview" && <AdminOverviewTab />}
          {selected === "users" && <AdminUsersTab />}
          {selected === "flux" && <AdminFluxTab />}
          {selected === "categories" && <AdminCategoriesTab />}
          {selected === "ml" && <AdminMLTab />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
