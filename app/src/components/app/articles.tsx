import { useEffect, useRef } from "react"
import type React from "react"
import { Bookmark, BookmarkCheck, Eye, EyeOff, PenLine, Rss } from "lucide-react"
import { MPopover, MPopoverContent, MPopoverTrigger } from "@/components/mira/menu"
import { MButton, MSkeleton, MTextarea } from "@/components/mira/mira"
import { cn } from "@/lib/utils"
import { formatTime, groupByDateSection, type DisplayArticle } from "./articleUtils"

export interface ArticleHandlers {
  onOpen: (article: DisplayArticle) => void
  onToggleRead: (id: string, currentRead: boolean, e: React.MouseEvent) => void
  onToggleSaved: (id: string, e: React.MouseEvent) => void
  openNoteId: string | null
  onOpenNoteChange: (id: string | null) => void
  noteDraft: string
  onNoteDraftChange: (value: string) => void
  onSaveAnnotation: (id: string) => void
}

/* ------------------------------------------------------------------ */
/* Tuile article : image (radius 16), texte dessous, heure             */
/* ------------------------------------------------------------------ */

const ACTION_BTN =
  "flex size-8 cursor-pointer items-center justify-center rounded-full bg-white/80 text-m-ink backdrop-blur-md transition-colors hover:bg-white"

export function ArticleTile({
  article,
  handlers,
  timeOnly = false,
  revealDelay = 0,
}: {
  article: DisplayArticle
  handlers: ArticleHandlers
  timeOnly?: boolean
  revealDelay?: number
}) {
  const { onOpen, onToggleRead, onToggleSaved, openNoteId, onOpenNoteChange, noteDraft, onNoteDraftChange, onSaveAnnotation } =
    handlers
  const time = formatTime(article.publishedAt, timeOnly)

  return (
    <article className="group m-reveal relative flex min-w-0 flex-col" style={{ animationDelay: `${revealDelay}ms` }}>
      <button
        type="button"
        onClick={() => onOpen(article)}
        className="relative block aspect-[16/10] w-full cursor-pointer overflow-hidden rounded-2xl bg-m-surface-4 outline-none focus-visible:ring-3 focus-visible:ring-m-lime"
        aria-label={`Ouvrir : ${article.title}`}
      >
        {article.imageUrl ? (
          <img
            src={article.imageUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.035]"
            onError={(e) => {
              e.currentTarget.style.display = "none"
            }}
          />
        ) : (
          <span className="flex size-full items-center justify-center bg-gradient-to-br from-m-surface-3 to-m-panel">
            <Rss className="size-7 text-m-ring" />
          </span>
        )}
        {!article.read && (
          <span className="absolute top-3 left-3 flex h-[22px] items-center gap-1.5 rounded-full bg-m-ink/80 pr-2.5 pl-2 text-[10px] font-medium text-white backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-m-lime" />
            Nouveau
          </span>
        )}
      </button>

      {/* Actions rapides, au survol (toujours visibles sur écran tactile) */}
      <div
        className={cn(
          "absolute top-2.5 right-2.5 flex gap-1.5 transition-opacity",
          "opacity-100 lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
          openNoteId === article.id_article && "lg:opacity-100"
        )}
      >
        <button
          type="button"
          className={ACTION_BTN}
          onClick={(e) => onToggleRead(article.id_article, article.read, e)}
          title={article.read ? "Marquer comme non lu" : "Marquer comme lu"}
          aria-label={article.read ? "Marquer comme non lu" : "Marquer comme lu"}
        >
          {article.read ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
        <button
          type="button"
          className={cn(ACTION_BTN, article.savedForLater && "bg-m-lime hover:bg-m-lime")}
          onClick={(e) => onToggleSaved(article.id_article, e)}
          title={article.savedForLater ? "Retirer de « À lire plus tard »" : "À lire plus tard"}
          aria-label={article.savedForLater ? "Retirer de « À lire plus tard »" : "À lire plus tard"}
        >
          {article.savedForLater ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
        </button>
        <MPopover
          open={openNoteId === article.id_article}
          onOpenChange={(open) => onOpenNoteChange(open ? article.id_article : null)}
        >
          <MPopoverTrigger
            render={
              <button
                type="button"
                className={cn(ACTION_BTN, article.annotation && "bg-m-lime hover:bg-m-lime")}
                onClick={() => onNoteDraftChange(article.annotation ?? "")}
                title="Annoter"
                aria-label="Annoter"
              >
                <PenLine className="size-3.5" />
              </button>
            }
          />
          <MPopoverContent align="end" className="flex w-72 flex-col gap-3 rounded-[22px]">
            <MTextarea
              placeholder="Ta note sur cet article…"
              value={noteDraft}
              onChange={(e) => onNoteDraftChange(e.target.value)}
              rows={4}
              className="min-h-24"
            />
            <MButton size="sm" className="w-full" onClick={() => onSaveAnnotation(article.id_article)}>
              Enregistrer la note
            </MButton>
          </MPopoverContent>
        </MPopover>
      </div>

      <div className="mt-3 flex items-center gap-2 font-mono text-[11px] text-m-soft">
        {article.feedName && <span className="min-w-0 truncate">{article.feedName}</span>}
        {article.feedName && time && <span className="text-m-ring">·</span>}
        {time && (
          <time dateTime={article.publishedAt} className="shrink-0 tabular-nums">
            {time}
          </time>
        )}
      </div>
      <button
        type="button"
        onClick={() => onOpen(article)}
        className={cn(
          "mt-1.5 cursor-pointer text-left text-[16px] leading-[1.3] font-medium tracking-[-0.02em] text-pretty outline-none hover:underline hover:decoration-m-ring hover:underline-offset-4 focus-visible:underline",
          article.read ? "text-m-strong" : "text-m-ink"
        )}
      >
        <span className="line-clamp-2">{article.title}</span>
      </button>
      {article.excerpt && <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.5] text-m-soft">{article.excerpt}</p>}
      {article.annotation && (
        <p className="mt-2 line-clamp-2 rounded-xl bg-m-lime-soft px-3 py-2 text-[12px] leading-snug text-m-strong">
          {article.annotation}
        </p>
      )}
    </article>
  )
}

/* ------------------------------------------------------------------ */
/* Grille + défilement infini                                          */
/* ------------------------------------------------------------------ */

const GRID = "grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"

/** Déclenche `onReveal` quand le bas de la liste approche du viewport. */
function RevealSentinel({ onReveal, active }: { onReveal: () => void; active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef(onReveal)
  useEffect(() => {
    cb.current = onReveal
  })
  useEffect(() => {
    const el = ref.current
    if (!el || !active) return
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && cb.current(), {
      rootMargin: "0px 0px 700px 0px",
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [active])
  return <div ref={ref} aria-hidden className="h-px w-full" />
}

export function ArticleGrid({
  articles,
  handlers,
  loading,
  hasMore,
  onReveal,
  groupByDate = false,
  step = 12,
  empty,
}: {
  articles: DisplayArticle[]
  handlers: ArticleHandlers
  loading: boolean
  hasMore: boolean
  onReveal: () => void
  groupByDate?: boolean
  /** Taille d'une tranche, pour décaler l'animation des tuiles d'une même tranche. */
  step?: number
  empty: React.ReactNode
}) {
  if (loading && articles.length === 0) {
    return (
      <div className={GRID}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex flex-col gap-3">
            <MSkeleton className="aspect-[16/10] w-full rounded-2xl" />
            <MSkeleton className="h-3 w-1/3" />
            <MSkeleton className="h-5 w-11/12" />
          </div>
        ))}
      </div>
    )
  }

  if (articles.length === 0) return <>{empty}</>

  const delay = (i: number) => (i % step) * 45

  return (
    <div className="flex flex-col gap-10">
      {groupByDate ? (
        groupByDateSection(articles).map((group, gi, all) => {
          const offset = all.slice(0, gi).reduce((n, g) => n + g.items.length, 0)
          return (
            <section key={group.label} className="flex flex-col gap-5">
              <h2 className="flex items-center gap-3 font-mono text-[11px] tracking-wide text-m-soft uppercase">
                {group.label}
                <span className="h-px flex-1 bg-m-ring/60" />
                <span className="tabular-nums">{group.items.length}</span>
              </h2>
              <div className={GRID}>
                {group.items.map((a, i) => (
                  <ArticleTile key={a.id_article} article={a} handlers={handlers} timeOnly revealDelay={delay(offset + i)} />
                ))}
              </div>
            </section>
          )
        })
      ) : (
        <div className={GRID}>
          {articles.map((a, i) => (
            <ArticleTile key={a.id_article} article={a} handlers={handlers} revealDelay={delay(i)} />
          ))}
        </div>
      )}

      <RevealSentinel onReveal={onReveal} active={hasMore} />
      <p className="flex items-center justify-center gap-2 pb-4 font-mono text-[11px] text-m-muted">
        {hasMore ? (
          <>
            <span className="size-1.5 animate-pulse rounded-full bg-m-green" />
            Chargement de la suite…
          </>
        ) : (
          <>
            <span className="size-1.5 rounded-full bg-m-ring" />
            Tu es à jour · {articles.length} article{articles.length > 1 ? "s" : ""}
          </>
        )}
      </p>
    </div>
  )
}
