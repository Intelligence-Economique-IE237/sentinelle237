import { useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/toast"


interface RssFeed {
  id: string
  name: string
  url: string
  category: string
  active: boolean
  lastFetched: string | null
  articleCount: number
}

const emptyForm = { name: "", url: "", category: "" }

export default function Feeds() {
  const [feeds, setFeeds] = useState<RssFeed[]>(MOCK_FEEDS)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  function updateForm<K extends keyof typeof emptyForm>(field: K, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleAddFeed(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.url.trim()) return

    setSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 500))
      const newFeed: RssFeed = {
        id: crypto.randomUUID(),
        name: form.name,
        url: form.url,
        category: form.category || "Non classé",
        active: true,
        lastFetched: null,
        articleCount: 0,
      }
      setFeeds((prev) => [newFeed, ...prev])
      toast.add({
        title: "Flux ajouté",
        description: `${newFeed.name} est maintenant surveillé`,
        type: "success",
      })
      setForm(emptyForm)
      setDialogOpen(false)
    } catch {
      toast.add({
        title: "Erreur",
        description: "Impossible d'ajouter ce flux",
        type: "error",
      })
    } finally {
      setSaving(false)
    }
  }

  function handleToggleActive(feed: RssFeed) {

    setFeeds((prev) =>
      prev.map((f) => (f.id === feed.id ? { ...f, active: !f.active } : f))
    )
  }

  function handleDelete(feed: RssFeed) {
    setFeeds((prev) => prev.filter((f) => f.id !== feed.id))
    toast.add({
      title: "Flux supprimé",
      description: feed.name,
      type: "error",
    })
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
          <p className="text-sm text-muted-foreground">
            {feeds.filter((f) => f.active).length} flux actifs sur {feeds.length}
          </p>
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
              <DialogDescription>
                Ajoute une source à surveiller pour la veille
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddFeed} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la source</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="Reuters Africa"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url">URL du flux</Label>
                <Textarea
                  id="url"
                  value={form.url}
                  onChange={(e) => updateForm("url", e.target.value)}
                  placeholder="https://exemple.com/rss.xml"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => updateForm("category", e.target.value)}
                  placeholder="Économie, Sécurité, National..."
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
          <CardDescription>
            Active ou désactive un flux, ou supprime-le définitivement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Articles</TableHead>
                <TableHead>Dernière récupération</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeds.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Aucun flux configuré
                  </TableCell>
                </TableRow>
              )}
              {feeds.map((feed) => (
                <TableRow key={feed.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Rss className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{feed.name}</p>
                        <p className="text-xs text-muted-foreground">{feed.url}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{feed.category}</Badge>
                  </TableCell>
                  <TableCell>{feed.articleCount}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(feed.lastFetched)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={feed.active}
                      onCheckedChange={() => handleToggleActive(feed)}
                    />
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