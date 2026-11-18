// Types et utilitaires de date partagés par l’affichage des articles.

/** Forme d'article unifiée pour l'affichage, quelle que soit la source. */
export interface DisplayArticle {
  id_article: string
  feedId: string
  feedName: string
  title: string
  excerpt: string
  imageUrl: string | null
  url: string
  publishedAt: string
  read: boolean
  savedForLater: boolean
  annotation: string | null
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function isSameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export function dateSectionLabel(iso: string) {
  if (!iso) return "Sans date"
  const d = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (isSameDay(d, now)) return "Aujourd’hui"
  if (isSameDay(d, yesterday)) return "Hier"
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
}

export function isToday(iso: string) {
  return !!iso && isSameDay(new Date(iso), new Date())
}

export function formatTime(iso: string, timeOnly: boolean) {
  if (!iso) return ""
  const d = new Date(iso)
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
  if (timeOnly || isSameDay(d, new Date())) return time
  return `${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} · ${time}`
}

export function groupByDateSection(list: DisplayArticle[]) {
  const groups: { label: string; items: DisplayArticle[] }[] = []
  for (const article of list) {
    const label = dateSectionLabel(article.publishedAt)
    const last = groups[groups.length - 1]
    if (last?.label === label) last.items.push(article)
    else groups.push({ label, items: [article] })
  }
  return groups
}

