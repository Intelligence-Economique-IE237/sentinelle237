import { useEffect, useState } from "react"
import { Pencil, Search, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { deleteUser, getUsers, updateUser } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"
import type { AdminUser, AdminUserUpdatePayload, UserRole } from "@/lib/api/types"

const PAGE_SIZE = 20

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

  useEffect(() => setPage(1), [search, roleFilter, activatedFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par pseudo ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as UserRole | "all")}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="veilleur">Veilleur</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={activatedFilter} onValueChange={(v) => setActivatedFilter(v as typeof activatedFilter)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="true">Actif</SelectItem>
            <SelectItem value="false">Inactif</SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="ml-auto">
          {total} utilisateur{total !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pseudo</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Pays</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Offre</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Vérifié</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            )}
            {!loading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Aucun utilisateur ne correspond
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id_user}>
                <TableCell className="font-medium">{user.pseudo}</TableCell>
                <TableCell className="text-muted-foreground">{user.mail}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role}</Badge>
                </TableCell>
                <TableCell>{user.pays}</TableCell>
                <TableCell>{user.ville}</TableCell>
                <TableCell>{user.offre}</TableCell>
                <TableCell>
                  <Badge variant={user.activated ? "default" : "secondary"}>
                    {user.activated ? "Actif" : "Inactif"}
                  </Badge>
                </TableCell>
                <TableCell>{user.verified ? "Oui" : "Non"}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeletingUser(user)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Édition utilisateur */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifier {editingUser?.pseudo}</DialogTitle>
            <DialogDescription>Rôle, statut et offre de cet utilisateur</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select
                value={editForm.role}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, role: v as UserRole }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="veilleur">Veilleur</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offre">Offre</Label>
              <Input
                id="offre"
                value={editForm.offre ?? ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, offre: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label htmlFor="activated" className="text-sm font-normal">
                Compte actif
              </Label>
              <input
                id="activated"
                type="checkbox"
                checked={editForm.activated ?? false}
                onChange={(e) => setEditForm((prev) => ({ ...prev, activated: e.target.checked }))}
                className="h-4 w-4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suppression utilisateur */}
      <Dialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer {deletingUser?.pseudo} ?</DialogTitle>
            <DialogDescription>
              Cette action est définitive et supprime toutes les données de cet utilisateur.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeletingUser(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression..." : "Supprimer définitivement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
