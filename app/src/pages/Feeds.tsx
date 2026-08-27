import { useEffect, useState } from "react"
import { Plus, Trash2, Rss } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { getMyFluxes, addFlux, unsubscribeFlux } from "@/lib/api/feeds"
import type { Flux } from "@/lib/api/types"

const emptyForm = { identifiant: "", nom: "" }

export default function Feeds() {
  const [feeds, setFeeds] = useState<Flux[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadFeeds()
  }, [])

  async function loadFeeds() {
    setLoading(true)
    try {
      const items = await getMyFluxes()
      setFeeds(items)
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de charger les flux", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  function updateForm<K extends keyof typeof emptyForm>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!form.identifiant.trim()) return

    setSaving(true)
    try {
      const res = await addFlux({ identifiant: form.identifiant, nom: form.nom || undefined })
      setFeeds((prev) => [res.flux, ...prev])
      toast.add({
        title: "Flux ajouté",
        description: `${res.flux.nom} est maintenant surveillé`,
        type: "success",
      })
      setForm(emptyForm)
      setDialogOpen(false)
    } catch {
      toast.add({ title: "Erreur", description: "Impossible d'ajouter ce flux", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(feed: Flux) {
    try {
      await unsubscribeFlux(feed.id_flux)
      setFeeds((prev) => prev.filter((f) => f.id_flux !== feed.id_flux))
      toast.add({ title: "Flux retiré", description: feed.nom, type: "success" })
    } catch {
      toast.add({ title: "Erreur", description: "Impossible de retirer ce flux", type: "error" })
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "Jamais récupéré"
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Flux RSS</h1>
            <p className="text-sm text-muted-foreground">{feeds.length} flux suivis</p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger
                render={
                  <Button>
                    <Plus className="h-4 w-4" />
                    Ajouter un flux
                  </Button>
                }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau flux RSS</DialogTitle>
                <DialogDescription>Ajoute une source à surveiller pour la veille</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddFeed} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifiant">URL ou domaine du site</Label>
                  <Input
                      id="identifiant"
                      value={form.identifiant}
                      onChange={(e) => updateForm("identifiant", e.target.value)}
                      placeholder="exemple.com ou https://exemple.com/rss.xml"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom (optionnel)</Label>
                  <Input
                      id="nom"
                      value={form.nom}
                      onChange={(e) => updateForm("nom", e.target.value)}
                      placeholder="Reuters Africa"
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={saving} className="w-full">
                    {saving ? "Ajout en cours..." : "Ajouter le flux"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sources surveillées</CardTitle>
            <CardDescription>Retire un flux si tu ne veux plus le suivre</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dernière récupération</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Chargement...
                      </TableCell>
                    </TableRow>
                )}
                {!loading && feeds.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Aucun flux configuré
                      </TableCell>
                    </TableRow>
                )}
                {feeds.map((feed) => (
                    <TableRow key={feed.id_flux}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Rss className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{feed.nom}</p>
                            <p className="text-xs text-muted-foreground">{feed.url_site}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{feed.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(feed.last_crawled_at)}
                      </TableCell>
                      <TableCell>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(feed)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  )
}