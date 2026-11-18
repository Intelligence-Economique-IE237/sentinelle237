import { useState } from "react"
import { Pencil, Search, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/toast"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { deleteUser, getUsers, updateUser } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import type { AdminUser, AdminUserUpdatePayload, UserRole } from "@/lib/api/types"
import {
  MAvatar,
  MButton,
  MCard,
  MCardHeader,
  MDialog,
  MDot,
  MField,
  MHero,
  MInput,
  MPagination,
  MPill,
  MSelect,
  MSkeleton,
  MSwitch,
} from "@/components/admin/mira"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 20

const ROLE_OPTIONS: { value: UserRole | "all"; label: string }[] = [
  { value: "all", label: "Tous les rôles" },
  { value: "veilleur", label: "Veilleur" },
  { value: "admin", label: "Admin" },
]

const STATUS_OPTIONS: { value: "all" | "true" | "false"; label: string }[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "true", label: "Actif" },
  { value: "false", label: "Inactif" },
]

const TH = "px-3 pb-3 text-left font-mono text-[10px] font-normal tracking-wide text-m-muted uppercase"
const TD = "px-3 py-3 align-middle"

export function AdminUsersTab() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all")
  const [activatedFilter, setActivatedFilter] = useState<"all" | "true" | "false">("all")

  const {
    data: result,
    loading,
    refresh,
  } = useCachedFetch(
    `admin-users:${page}:${search}:${roleFilter}:${activatedFilter}`,
    () =>
      getUsers({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        activated: activatedFilter === "all" ? undefined : activatedFilter === "true",
      }),
    30 * 1000,
    [page, search, roleFilter, activatedFilter]
  )
  const users = result?.users ?? []
  const total = result?.pagination.total ?? 0
  const totalPages = result?.pagination.totalPages ?? 1

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState<AdminUserUpdatePayload>({})
  const [saving, setSaving] = useState(false)
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  function openEdit(user: AdminUser) {
    setEditingUser(user)
    setEditForm({ role: user.role, activated: user.activated, offre: user.offre })
  }

  async function handleSaveEdit() {
    if (!editingUser) return
    setSaving(true)
    try {
      await updateUser(editingUser.id_user, editForm)
      toast.add({ title: "Utilisateur mis à jour", description: editingUser.pseudo, type: "success" })
      setEditingUser(null)
      await refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de mettre à jour l'utilisateur"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deletingUser) return
    setDeleting(true)
    try {
      await deleteUser(deletingUser.id_user)
      toast.add({ title: "Utilisateur supprimé", description: deletingUser.pseudo, type: "success" })
      setDeletingUser(null)
      await refresh()
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de supprimer l'utilisateur"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <MHero
        title="Utilisateurs."
        subtitle="Rôles, statuts et offres."
        stats={[{ value: loading && !result ? "…" : total, label: "Résultats", dot: "bg-m-ink" }]}
      />

      <MCard>
        <MCardHeader
          title="Comptes"
          subtitle={`${total} utilisateur${total !== 1 ? "s" : ""} correspondant${total !== 1 ? "s" : ""} aux filtres.`}
        />

        <div className="mt-6 flex flex-col gap-2 md:flex-row md:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-m-muted" />
            <MInput
              aria-label="Rechercher un utilisateur"
              placeholder="Rechercher par pseudo ou email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="rounded-full pl-11"
            />
          </div>
          <div className="flex gap-2">
            <MSelect ariaLabel="Filtrer par rôle" value={roleFilter} onChange={(v) => { setRoleFilter(v); setPage(1) }} options={ROLE_OPTIONS} className="flex-1 md:w-44" />
            <MSelect
              ariaLabel="Filtrer par statut"
              value={activatedFilter}
              onChange={(v) => {
                setActivatedFilter(v)
                setPage(1)
              }}
              options={STATUS_OPTIONS}
              className="flex-1 md:w-44"
            />
          </div>
        </div>

        <div className="-mx-3 mt-6 overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className={TH}>Utilisateur</th>
                <th className={cn(TH, "hidden sm:table-cell")}>Rôle</th>
                <th className={cn(TH, "hidden md:table-cell")}>Localisation</th>
                <th className={cn(TH, "hidden lg:table-cell")}>Offre</th>
                <th className={TH}>Statut</th>
                <th className={cn(TH, "hidden sm:table-cell")}>Vérifié</th>
                <th className={cn(TH, "text-right")}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                users.length === 0 &&
                Array.from({ length: 5 }, (_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-3 py-1.5">
                      <MSkeleton className="h-12 rounded-2xl" />
                    </td>
                  </tr>
                ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-sm text-m-muted">
                    Aucun utilisateur ne correspond
                  </td>
                </tr>
              )}
              {users.map((user) => (
                <tr key={user.id_user} className="group [&>td]:border-t [&>td]:border-m-surface-3 hover:[&>td]:bg-m-surface-2 [&>td:first-child]:rounded-l-2xl [&>td:last-child]:rounded-r-2xl">
                  <td className={TD}>
                    <div className="flex min-w-0 items-center gap-3">
                      <MAvatar name={user.pseudo} className="size-9" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 font-medium">
                          <span className="max-w-[14ch] truncate sm:max-w-[24ch]">{user.pseudo}</span>
                          {user.role === "admin" && (
                            <MPill tone="dark" className="h-[18px] px-1.5 text-[10px] sm:hidden">
                              Admin
                            </MPill>
                          )}
                        </p>
                        <p className="max-w-[18ch] truncate text-[12px] text-m-soft sm:max-w-[28ch]">{user.mail}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(TD, "hidden sm:table-cell")}>
                    <MPill tone={user.role === "admin" ? "dark" : "neutral"} className="capitalize">
                      {user.role}
                    </MPill>
                  </td>
                  <td className={cn(TD, "hidden text-m-body md:table-cell")}>
                    {[user.ville, user.pays].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className={cn(TD, "hidden font-mono text-[12px] text-m-strong lg:table-cell")}>{user.offre}</td>
                  <td className={TD}>
                    <MPill tone={user.activated ? "lime" : "peach"}>{user.activated ? "Actif" : "Inactif"}</MPill>
                  </td>
                  <td className={cn(TD, "hidden sm:table-cell")}>
                    <span className="flex items-center gap-1.5 text-[12px] text-m-soft">
                      <MDot className={user.verified ? "bg-m-green" : "bg-m-orange"} />
                      {user.verified ? "Oui" : "Non"}
                    </span>
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <div className="flex justify-end gap-1">
                      <MButton variant="ghost" size="icon-sm" aria-label={`Modifier ${user.pseudo}`} onClick={() => openEdit(user)}>
                        <Pencil className="size-3.5!" />
                      </MButton>
                      <MButton
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Supprimer ${user.pseudo}`}
                        className="hover:bg-m-peach hover:text-m-orange-text"
                        onClick={() => setDeletingUser(user)}
                      >
                        <Trash2 className="size-3.5!" />
                      </MButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-5">
          <MPagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>
      </MCard>

      {/* Édition utilisateur */}
      <MDialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
        title={`Modifier ${editingUser?.pseudo ?? ""}`}
        description="Rôle, statut et offre de cet utilisateur."
        footer={
          <>
            <MButton variant="light" onClick={() => setEditingUser(null)} disabled={saving}>
              Annuler
            </MButton>
            <MButton onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </MButton>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <MField label="Rôle">
            <MSelect
              ariaLabel="Rôle"
              value={(editForm.role ?? "veilleur") as UserRole}
              onChange={(v) => setEditForm((prev) => ({ ...prev, role: v }))}
              options={ROLE_OPTIONS.filter((o) => o.value !== "all") as { value: UserRole; label: string }[]}
              className="w-full rounded-2xl"
            />
          </MField>
          <MField label="Offre" htmlFor="offre">
            <MInput
              id="offre"
              value={editForm.offre ?? ""}
              onChange={(e) => setEditForm((prev) => ({ ...prev, offre: e.target.value }))}
            />
          </MField>
          <label
            htmlFor="activated"
            className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-m-surface-2 px-4 py-3"
          >
            <span>
              <span className="block text-sm font-medium">Compte actif</span>
              <span className="block text-[12px] text-m-soft">Un compte inactif ne peut plus se connecter.</span>
            </span>
            <MSwitch
              id="activated"
              checked={editForm.activated ?? false}
              onChange={(checked) => setEditForm((prev) => ({ ...prev, activated: checked }))}
            />
          </label>
        </div>
      </MDialog>

      {/* Suppression utilisateur */}
      <MDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
        title={`Supprimer ${deletingUser?.pseudo ?? ""} ?`}
        description="Cette action est définitive et supprime toutes les données de cet utilisateur."
        footer={
          <>
            <MButton variant="light" onClick={() => setDeletingUser(null)} disabled={deleting}>
              Annuler
            </MButton>
            <MButton variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </MButton>
          </>
        }
      />
    </>
  )
}
