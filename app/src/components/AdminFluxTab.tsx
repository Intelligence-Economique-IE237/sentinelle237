import { useState } from "react"
import { Upload } from "lucide-react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { getAllFluxAdmin, importOpml } from "@/lib/api/admin"
import { ApiError } from "@/lib/api/client"

const PAGE_SIZE = 20

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
}

export function AdminFluxTab() {
  const [page, setPage] = useState(1)
  const [importOpen, setImportOpen] = useState(false)

  const {
    data: result,
    loading,
    refresh,
  } = useCachedFetch(
    `admin-flux:${page}`,
    () => getAllFluxAdmin({ page, limit: PAGE_SIZE }),
    30 * 1000,
    [page]
  )
  const items = result?.flux ?? []
  const total = result?.pagination.total ?? 0
  const totalPages = result?.pagination.totalPages ?? 1

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline">{total} flux au total</Badge>
        <Button size="sm" className="gap-1.5" onClick={() => setImportOpen(true)}>
          <Upload className="h-3.5 w-3.5" />
          Importer un OPML
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Zone</TableHead>
              <TableHead>Dernière collecte</TableHead>
              <TableHead>Créé par</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            )}
            {!loading && items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Aucun flux
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => (
              <TableRow key={item.id_flux}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {item.logo && (
                      <img src={item.logo} alt="" className="h-4 w-4 shrink-0 rounded-sm object-contain" />
                    )}
                    <span className="truncate">{item.nom}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{item.type}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{item.zone}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.last_crawled_at)}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground" title={item.created_by ?? undefined}>
                  {item.created_by ? `${item.created_by.slice(0, 8)}...` : "—"}
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

      <ImportOpmlDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={refresh}
      />
    </div>
  )
}

function ImportOpmlDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImported: () => void
}) {
  const [mode, setMode] = useState<"url" | "content">("url")
  const [opmlUrl, setOpmlUrl] = useState("")
  const [opmlContent, setOpmlContent] = useState("")
  const [zone, setZone] = useState("")
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    if (mode === "url" && !opmlUrl.trim()) return
    if (mode === "content" && !opmlContent.trim()) return
    setImporting(true)
    try {
      const res = await importOpml({
        opmlUrl: mode === "url" ? opmlUrl : undefined,
        opmlContent: mode === "content" ? opmlContent : undefined,
        zone: zone || undefined,
      })
      toast.add({
        title: "Import terminé",
        description: `${res.importedCount} flux importés, ${res.skippedCount} ignorés`,
        type: "success",
      })
      onImported()
      onOpenChange(false)
      setOpmlUrl("")
      setOpmlContent("")
      setZone("")
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible d'importer le fichier OPML"
      toast.add({ title: "Erreur", description: message, type: "error" })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importer un OPML</DialogTitle>
          <DialogDescription>Import en masse de flux depuis une URL ou un contenu OPML</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "url" | "content")}>
          <TabsList className="w-full">
            <TabsTrigger value="url" className="flex-1">Depuis une URL</TabsTrigger>
            <TabsTrigger value="content" className="flex-1">Coller le contenu</TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="pt-3">
            <div className="space-y-2">
              <Label htmlFor="opmlUrl">URL du fichier OPML</Label>
              <Input
                id="opmlUrl"
                value={opmlUrl}
                onChange={(e) => setOpmlUrl(e.target.value)}
                placeholder="https://exemple.com/flux.opml"
              />
            </div>
          </TabsContent>
          <TabsContent value="content" className="pt-3">
            <div className="space-y-2">
              <Label htmlFor="opmlContent">Contenu OPML</Label>
              <textarea
                id="opmlContent"
                value={opmlContent}
                onChange={(e) => setOpmlContent(e.target.value)}
                rows={6}
                className="w-full rounded-md border bg-transparent p-2 text-sm"
                placeholder="<opml>...</opml>"
              />
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="zone">Zone (optionnel)</Label>
          <Input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="ex: afrique" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Annuler
          </Button>
          <Button onClick={handleImport} disabled={importing}>
            {importing ? "Import en cours..." : "Importer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
