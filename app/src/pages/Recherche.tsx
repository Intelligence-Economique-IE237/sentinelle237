import { useEffect, useMemo, useRef, useState } from "react"
import type React from "react"
import { useSearchParams } from "react-router-dom"
import { ArrowLeftRight, ArrowUpRight, Globe, History, Rss, Search, X } from "lucide-react"
import { LANGUE_LABELS } from "@/lib/labels"
import { MainLayout } from "@/components/app/MainLayout"
import { MButton, MCard, MCardHeader, MEmpty, MHero, MInput, MPill, MSelect, MSkeleton } from "@/components/mira/mira"
import { useCachedFetch } from "@/hooks/useCachedFetch"
import { ApiError } from "@/lib/api/client"
import { getMyFluxes } from "@/lib/api/feeds"
import { rechercheAvancee } from "@/lib/api/search"
import type { Flux, Langue, RechercheAvanceeResponse } from "@/lib/api/types"

const SEARCH_LANGUES: Langue[] = ["fr", "en", "es", "zh", "hi", "ar", "pt", "ru", "ja", "de"]
const LANGUE_OPTIONS = SEARCH_LANGUES.map((l) => ({ value: l, label: LANGUE_LABELS[l] }))

const RECENT_SEARCHES_KEY = "sentinelle237.recent-searches"
const MAX_RECENT_SEARCHES = 8

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : []
  } catch {
    return []
  }
}

function saveRecentSearches(searches: string[]) {
  try {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches))
  } catch {
    // stockage indisponible : on ignore
  }
}

function asLangue(value: string | null, fallback: Langue): Langue {
  return value && (SEARCH_LANGUES as string[]).includes(value) ? (value as Langue) : fallback
}

function domainOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function errorMessage(err: unknown) {
  if (!(err instanceof ApiError)) return "Impossible de contacter le serveur"
  if (err.status === 400) return "Requête invalide (trop courte, ou code langue/pays incorrect)"
  if (err.status === 429) return "Limite de recherches atteinte pour aujourd’hui"
  if (err.status === 502) return "Service de recherche externe indisponible, réessaie plus tard"
  return err.message
}

/**
 * Recherche avancée cross-langue, sur une page dédiée.
 * L'état vit dans l'URL (?q=&de=&vers=&pays=) : on peut partager une
 * recherche, la recharger, ou revenir en arrière avec le navigateur.
 */
export default function Recherche() {
  const [params, setParams] = useSearchParams()
  const q = params.get("q")?.trim() ?? ""
  const from = asLangue(params.get("de"), "fr")
  const to = asLangue(params.get("vers"), "en")
  const pays = (params.get("pays") ?? "").toUpperCase().slice(0, 2)

  // Brouillon du formulaire, initialisé depuis l'URL
  const [draft, setDraft] = useState({ q, from, to, pays })
  // Chaque réponse est rattachée à la recherche (clé) qui l'a produite :
  // on est « en chargement » tant que la clé courante n'a pas de réponse.
  const key = [q, from, to, pays].join("|")
  const [response, setResponse] = useState<{ key: string; result: RechercheAvanceeResponse | null; error: string | null }>()
  const loading = !!q && response?.key !== key
  const result = response?.key === key ? response.result : null
  const error = response?.key === key ? response.error : null
  const [recent, setRecent] = useState<string[]>(loadRecentSearches)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: feedsData } = useCachedFetch<Flux[]>("feeds", getMyFluxes, 2 * 60 * 1000)
  const feedNames = useMemo(() => Object.fromEntries((feedsData ?? []).map((f) => [f.id_flux, f.nom])), [feedsData])

  // Lance la recherche à chaque changement de l'URL
  useEffect(() => {
    if (!q) return
    let cancelled = false
    rechercheAvancee({ requete: q, langue_source: from, langue_cible: to, pays: pays || undefined })
      .then((res) => {
        if (cancelled) return
        setResponse({ key, result: res, error: null })
        setRecent((prev) => {
          const updated = [q, ...prev.filter((s) => s.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT_SEARCHES)
          saveRecentSearches(updated)
          return updated
        })
      })
      .catch((err) => {
        if (!cancelled) setResponse({ key, result: null, error: errorMessage(err) })
      })
    return () => {
      cancelled = true
    }
  }, [key, q, from, to, pays])

  useEffect(() => {
    if (!q) inputRef.current?.focus()
  }, [q])

  function submit(next: typeof draft) {
    const query = next.q.trim()
    if (!query) return
    setDraft(next)
    const sp: Record<string, string> = { q: query, de: next.from, vers: next.to }
    if (next.pays) sp.pays = next.pays
    setParams(sp)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    submit(draft)
  }

  function removeRecent(item: string) {
    const updated = recent.filter((s) => s !== item)
    setRecent(updated)
    saveRecentSearches(updated)
  }

  const webEntries = result ? Object.entries(result.web) : []
  const webCount = webEntries.reduce((n, [, list]) => n + list.length, 0)
  const showResults = !!q

  return (
    <MainLayout active={{ type: "recherche" }}>
      <MHero
        title="Recherche."
        subtitle="Un mot-clé, deux langues."
        stats={
          result && !loading
            ? [
                { value: result.corpus_interne.length, label: "Dans tes flux", dot: "bg-m-green" },
                { value: webCount, label: "Sur le web", dot: "bg-m-ink" },
              ]
            : undefined
        }
      />

      {/* Formulaire */}
      <MCard>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-5 size-5 -translate-y-1/2 text-m-muted" />
            <input
              ref={inputRef}
              aria-label="Mot-clé à rechercher"
              value={draft.q}
              onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))}
              placeholder="Un mot-clé, une entreprise, un sujet…"
              className="h-16 w-full rounded-full bg-m-surface-2 pr-5 pl-14 text-[18px] tracking-[-0.02em] text-m-ink outline-none placeholder:text-m-muted focus-visible:ring-2 focus-visible:ring-m-lime"
            />
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex flex-1 items-center gap-2">
              <MSelect
                ariaLabel="Langue de la requête"
                value={draft.from}
                onChange={(v) => setDraft((d) => ({ ...d, from: v }))}
                options={LANGUE_OPTIONS}
                className="min-w-0 flex-1"
              />
              <MButton
                variant="light"
                size="icon"
                aria-label="Inverser les langues"
                title="Inverser les langues"
                onClick={() => setDraft((d) => ({ ...d, from: d.to, to: d.from }))}
              >
                <ArrowLeftRight />
              </MButton>
              <MSelect
                ariaLabel="Langue de traduction"
                value={draft.to}
                onChange={(v) => setDraft((d) => ({ ...d, to: v }))}
                options={LANGUE_OPTIONS}
                className="min-w-0 flex-1"
              />
            </div>
            <div className="flex gap-2">
              <MInput
                aria-label="Code pays (optionnel)"
                value={draft.pays}
                maxLength={2}
                onChange={(e) => setDraft((d) => ({ ...d, pays: e.target.value.toUpperCase() }))}
                placeholder="Pays (CM…)"
                className="w-32 rounded-full font-mono uppercase placeholder:font-sans placeholder:normal-case"
              />
              <MButton type="submit" disabled={!draft.q.trim() || loading} className="flex-1 md:flex-none">
                {loading ? "Recherche…" : "Rechercher"}
              </MButton>
            </div>
          </div>
        </form>

        {recent.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-m-muted uppercase">
              <History className="size-3.5" /> Récentes
            </span>
            {recent.map((item) => (
              <span key={item} className="group flex h-8 items-center rounded-full bg-m-surface-3 pr-1 pl-3 text-[13px]">
                <button
                  type="button"
                  className="max-w-[24ch] cursor-pointer truncate"
                  onClick={() => submit({ ...draft, q: item })}
                >
                  {item}
                </button>
                <button
                  type="button"
                  aria-label={`Retirer ${item} des recherches récentes`}
                  onClick={() => removeRecent(item)}
                  className="ml-1 flex size-6 cursor-pointer items-center justify-center rounded-full text-m-muted hover:bg-m-surface hover:text-m-ink"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </MCard>

      {!showResults && (
        <p className="flex items-center justify-center gap-2 py-6 text-center font-mono text-[11px] text-m-muted">
          Ta requête est traduite puis cherchée dans tes flux suivis et sur le web. Rien n’est enregistré en base.
        </p>
      )}

      {showResults && error && (
        <div role="alert" className="rounded-[22px] bg-m-peach px-5 py-4 text-sm text-m-orange-text">
          {error}
        </div>
      )}

      {showResults && !error && (
        <>
          {result && !loading && (
            <div className="flex flex-wrap items-center gap-2 px-1 text-sm">
              <MPill tone="white" className="font-mono font-normal">{LANGUE_LABELS[from]}</MPill>
              <span className="font-medium">« {result.requete_originale} »</span>
              <ArrowLeftRight className="size-3.5 text-m-muted" />
              <MPill tone="lime" className="font-mono font-normal">{LANGUE_LABELS[to]}</MPill>
              <span className="font-medium">« {result.requete_traduite} »</span>
            </div>
          )}

          {result?.webIndisponible && !loading && (
            <div className="rounded-[22px] bg-m-sand px-5 py-3 text-sm text-m-strong">
              Recherche web externe indisponible pour l’instant : seuls tes flux suivis sont affichés.
            </div>
          )}

          <div className="grid gap-[18px] lg:grid-cols-12">
            {/* Corpus interne */}
            <MCard tone="panel" className="self-start lg:col-span-5">
              <MCardHeader
                title="Dans tes flux suivis"
                subtitle="Articles déjà collectés par Sentinelle."
                action={
                  <span className="flex size-10 items-center justify-center rounded-full bg-m-avatar font-mono text-[12px] tabular-nums ring-2 ring-m-surface">
                    {loading ? "…" : (result?.corpus_interne.length ?? 0)}
                  </span>
                }
              />
              <div className="mt-6 flex flex-col gap-2">
                {loading && Array.from({ length: 4 }, (_, i) => <MSkeleton key={i} className="h-14 rounded-2xl bg-m-surface/70" />)}
                {!loading && result?.corpus_interne.length === 0 && (
                  <MEmpty className="py-8">Rien trouvé dans tes flux suivis.</MEmpty>
                )}
                {!loading &&
                  result?.corpus_interne.map((item, i) => (
                    <a
                      key={item.id_article}
                      href={item.lien}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="m-reveal group flex items-center gap-3 rounded-2xl bg-m-surface px-4 py-3 transition-colors hover:bg-m-lime-soft"
                      style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                    >
                      <Rss className="size-4 shrink-0 text-m-muted" />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-[14px] leading-snug font-medium">{item.titre}</span>
                        {feedNames[item.flux_id] && (
                          <span className="mt-0.5 block truncate font-mono text-[11px] text-m-soft">{feedNames[item.flux_id]}</span>
                        )}
                      </span>
                      <ArrowUpRight className="size-4 shrink-0 text-m-muted transition-colors group-hover:text-m-ink" />
                    </a>
                  ))}
              </div>
            </MCard>

            {/* Web, une carte par langue */}
            <div className="flex flex-col gap-[18px] lg:col-span-7">
              {loading && (
                <MCard>
                  <MSkeleton className="h-6 w-40" />
                  <div className="mt-6 flex flex-col gap-5">
                    {Array.from({ length: 4 }, (_, i) => (
                      <div key={i} className="flex flex-col gap-2">
                        <MSkeleton className="h-3 w-24" />
                        <MSkeleton className="h-5 w-4/5" />
                        <MSkeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </MCard>
              )}
              {!loading &&
                webEntries.map(([langue, list]) => (
                  <MCard key={langue}>
                    <MCardHeader
                      title={
                        <span className="flex items-center gap-2">
                          <Globe className="size-5 text-m-soft" />
                          Web · {LANGUE_LABELS[langue as Langue] ?? langue}
                        </span>
                      }
                      action={<MPill tone="neutral" className="font-mono">{list.length}</MPill>}
                    />
                    {list.length === 0 ? (
                      <MEmpty className="py-8">Aucun résultat dans cette langue.</MEmpty>
                    ) : (
                      <ol className="mt-4 flex flex-col">
                        {list.map((r, i) => (
                          <li
                            key={r.lien}
                            className="m-reveal border-t border-m-surface-3 first:border-t-0"
                            style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                          >
                            <a href={r.lien} target="_blank" rel="noopener noreferrer" className="group -mx-3 block rounded-2xl px-3 py-4 hover:bg-m-surface-2">
                              <span className="flex items-center gap-2 font-mono text-[11px] text-m-soft">
                                {domainOf(r.lien)}
                                {r.date_publication && (
                                  <>
                                    <span className="text-m-ring">·</span>
                                    {new Date(r.date_publication).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                                  </>
                                )}
                              </span>
                              <span className="mt-1 flex items-start gap-2 text-[16px] leading-snug font-medium tracking-[-0.02em]">
                                <span className="flex-1 group-hover:underline group-hover:decoration-m-ring group-hover:underline-offset-4">
                                  {r.titre}
                                </span>
                                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-m-muted" />
                              </span>
                              {r.description && <span className="mt-1 line-clamp-2 block text-[13px] leading-[1.5] text-m-soft">{r.description}</span>}
                            </a>
                          </li>
                        ))}
                      </ol>
                    )}
                  </MCard>
                ))}
            </div>
          </div>
        </>
      )}
    </MainLayout>
  )
}
