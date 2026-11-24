import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  Check,
  Compass,
  FolderSearch,
  Newspaper,
  Rss,
  Sparkles,
} from "lucide-react"
import { BrandMark } from "@/components/app/BrandMark"
import { MBackground, MButton, MEmpty, MField, MInput, MPill, MSegmented, MSkeleton } from "@/components/mira/mira"
import { toast } from "@/components/mira/toast-manager"
import { useCache } from "@/context/CacheContext"
import { createAlerte, getAlertes } from "@/lib/api/alerts"
import { ApiError } from "@/lib/api/client"
import { getCategoriesFlux, getFluxSuggestions, getMyFluxes, subscribeToFlux } from "@/lib/api/feeds"
import {
  FLUX_ZONES,
  type CategorieFlux,
  type FluxSuggestion,
  type FluxZone,
  type Frequence,
  type User,
} from "@/lib/api/types"
import { enablePush, getPushSupport, PushPermissionError } from "@/lib/push"
import { cn } from "@/lib/utils"

const STEPS = ["bienvenue", "interets", "sources", "alerte", "notifications", "fin"] as const
type Step = (typeof STEPS)[number]

const ZONE_LABELS: Record<FluxZone, string> = {
  afrique: "Afrique",
  europe: "Europe",
  amerique: "Amériques",
  asie: "Asie",
  oceanie: "Océanie",
  international: "International",
}

const ALERTE_SUGGESTIONS = [
  "économie camerounaise",
  "BEAC taux directeur",
  "port de Kribi",
  "CEMAC",
  "cacao Cameroun",
  "cybersécurité Afrique",
]

const PRESELECTION = 6

export type OnboardingResult = { startTour: boolean }

/** Parcours d'accueil d'un nouveau compte, affiché en plein écran au premier passage. */
export function Onboarding({
  user,
  onFinish,
}: {
  user: User
  onFinish: (result: OnboardingResult) => Promise<void>
}) {
  const cache = useCache()
  const [step, setStep] = useState<Step>("bienvenue")
  const stepIndex = STEPS.indexOf(step)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [finishing, setFinishing] = useState(false)

  // Catalogue chargé dès l'ouverture, pendant que l'utilisateur lit l'accueil
  const [categories, setCategories] = useState<CategorieFlux[] | null>(null)
  const [catalogue, setCatalogue] = useState<FluxSuggestion[] | null>(null)
  useEffect(() => {
    getCategoriesFlux()
      .then(setCategories)
      .catch(() => setCategories([]))
    getFluxSuggestions({ limit: 100 })
      .then(setCatalogue)
      .catch(() => setCatalogue([]))
  }, [])

  // Choix de l'utilisateur
  const [categoriesChoisies, setCategoriesChoisies] = useState<string[]>([])
  const [zonesChoisies, setZonesChoisies] = useState<FluxZone[]>([])
  const [selection, setSelection] = useState<Set<string> | null>(null)
  const [suivis, setSuivis] = useState(0)
  const [motCle, setMotCle] = useState("")
  const [frequence, setFrequence] = useState<Frequence>("quotidien")
  const [alerteCreee, setAlerteCreee] = useState<string | null>(null)
  const [pushActif, setPushActif] = useState(false)
  const [busy, setBusy] = useState(false)

  // Sources proposées selon les centres d'intérêt (tout le catalogue si rien ne correspond)
  const { proposees, filtreVide } = useMemo(() => {
    const liste = catalogue ?? []
    const filtrees = liste.filter(
      (f) =>
        (categoriesChoisies.length === 0 || (f.categorie_id && categoriesChoisies.includes(f.categorie_id))) &&
        (zonesChoisies.length === 0 || (f.zone && zonesChoisies.includes(f.zone as FluxZone)))
    )
    const aucunFiltre = categoriesChoisies.length === 0 && zonesChoisies.length === 0
    const vide = !aucunFiltre && filtrees.length === 0
    return { proposees: vide ? liste : filtrees, filtreVide: vide }
  }, [catalogue, categoriesChoisies, zonesChoisies])

  const preselection = useMemo(
    () => new Set(proposees.filter((f) => !f.isSubscribed).slice(0, PRESELECTION).map((f) => f.id_flux)),
    [proposees]
  )
  const choisis = selection ?? preselection

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
    window.scrollTo({ top: 0 })
  }, [step])

  const go = (s: Step) => setStep(s)
  const suivant = () => go(STEPS[Math.min(stepIndex + 1, STEPS.length - 1)])
  const precedent = () => go(STEPS[Math.max(stepIndex - 1, 0)])

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  function toggleSource(id: string) {
    const next = new Set(choisis)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelection(next)
  }

  async function suivreSources() {
    const ids = [...choisis].filter((id) => !catalogue?.find((f) => f.id_flux === id)?.isSubscribed)
    if (ids.length === 0) return suivant()
    setBusy(true)
    const results = await Promise.allSettled(ids.map((id) => subscribeToFlux(id)))
    const ok = results.filter((r) => r.status === "fulfilled").length
    setSuivis((n) => n + ok)
    setCatalogue((list) => list?.map((f) => (ids.includes(f.id_flux) ? { ...f, isSubscribed: true } : f)) ?? null)
    getMyFluxes()
      .then((feeds) => cache.set("feeds", feeds))
      .catch(() => undefined)
    if (ok < ids.length) {
      toast.add({
        title: "Certaines sources n’ont pas pu être suivies",
        description: `${ok} sur ${ids.length}. Tu pourras les ajouter plus tard.`,
        type: "error",
      })
    }
    setBusy(false)
    suivant()
  }

  async function creerAlerte() {
    const mot = motCle.trim()
    if (mot.length < 2) return
    setBusy(true)
    try {
      await createAlerte({ mot_cle: mot, frequence })
      setAlerteCreee(mot)
      getAlertes()
        .then((alertes) => cache.set("alertes", alertes))
        .catch(() => undefined)
      suivant()
    } catch (err) {
      toast.add({
        title: "Alerte non créée",
        description: err instanceof ApiError ? err.message : "Réessaie dans un instant.",
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  async function activerPush() {
    setBusy(true)
    try {
      await enablePush()
      setPushActif(true)
      suivant()
    } catch (err) {
      toast.add({
        title: "Notifications non activées",
        description:
          err instanceof PushPermissionError || err instanceof ApiError ? err.message : "Tu pourras les activer depuis « Mon compte ».",
        type: "error",
      })
    } finally {
      setBusy(false)
    }
  }

  async function terminer(startTour: boolean) {
    setFinishing(true)
    try {
      await onFinish({ startTour })
    } finally {
      setFinishing(false)
    }
  }

  const prenom = user.pseudo

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenue sur Sentinelle237"
      className="fixed inset-0 z-[70] isolate overflow-y-auto bg-m-bg font-sans text-m-ink antialiased"
    >
      <MBackground />
      <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col px-4 py-5 sm:px-6 sm:py-8">
        {/* Barre du haut : marque, progression, passer */}
        <div className="flex items-center gap-4">
          <BrandMark />
          <ol className="ml-auto flex items-center gap-1.5" aria-label={`Étape ${stepIndex + 1} sur ${STEPS.length}`}>
            {STEPS.map((s, i) => (
              <li
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === stepIndex ? "w-7 bg-m-ink" : i < stepIndex ? "w-3 bg-m-green" : "w-3 bg-m-ink/15"
                )}
              />
            ))}
          </ol>
          {step !== "fin" && (
            <MButton variant="ghost" size="sm" onClick={() => terminer(false)} disabled={finishing}>
              Passer
            </MButton>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-center py-8 sm:py-12">
          {step === "bienvenue" && (
            <Section
              headingRef={headingRef}
              kicker="Bienvenue"
              title={`Bonjour ${prenom}.`}
              subtitle="Préparons ta veille."
            >
              <p className="text-[15px] leading-[1.55] text-m-soft">
                Sentinelle237 rassemble tes sources d’information, surveille les sujets qui comptent pour toi et
                t’aide à mener tes enquêtes. Trois minutes suffisent pour démarrer.
              </p>
              <div className="mt-6 grid gap-2.5 sm:grid-cols-3">
                <Feature icon={Newspaper} title="Un seul fil" text="Tous tes sites et flux RSS au même endroit." tone="bg-m-sand" />
                <Feature icon={Bell} title="Des alertes" text="Un mot-clé, et Sentinelle cherche pour toi." tone="bg-m-lime/60" />
                <Feature icon={FolderSearch} title="Des enquêtes" text="Alertes et sources réunies par sujet." tone="bg-m-peach" />
              </div>
              <Footer>
                <MButton onClick={suivant} className="ml-auto">
                  Commencer <ArrowRight className="size-3.5!" />
                </MButton>
              </Footer>
            </Section>
          )}

          {step === "interets" && (
            <Section
              headingRef={headingRef}
              kicker="Étape 1 · Centres d’intérêt"
              title="Qu’est-ce qui t’intéresse ?"
              subtitle="On t’en proposera les sources."
            >
              <h3 className="text-[13px] font-medium text-m-strong">Thèmes</h3>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {categories === null
                  ? Array.from({ length: 6 }, (_, i) => <MSkeleton key={i} className="h-10 w-28 rounded-full" />)
                  : categories.map((c) => (
                      <Chip
                        key={c.id_categorie}
                        selected={categoriesChoisies.includes(c.id_categorie)}
                        onClick={() => {
                          setCategoriesChoisies((l) => toggle(l, c.id_categorie))
                          setSelection(null)
                        }}
                      >
                        <span className="size-2.5 rounded-full" style={{ backgroundColor: c.couleur }} />
                        {c.libelle}
                      </Chip>
                    ))}
                {categories?.length === 0 && <p className="text-sm text-m-muted">Aucun thème défini pour l’instant.</p>}
              </div>

              <h3 className="mt-6 text-[13px] font-medium text-m-strong">Régions</h3>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {FLUX_ZONES.map((z) => (
                  <Chip
                    key={z}
                    selected={zonesChoisies.includes(z)}
                    onClick={() => {
                      setZonesChoisies((l) => toggle(l, z))
                      setSelection(null)
                    }}
                  >
                    {ZONE_LABELS[z]}
                  </Chip>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-m-muted">Rien de coché ? On te proposera tout le catalogue.</p>

              <Footer>
                <MButton variant="ghost" onClick={precedent}>
                  <ArrowLeft className="size-3.5!" /> Retour
                </MButton>
                <MButton onClick={suivant} className="ml-auto">
                  Voir les sources <ArrowRight className="size-3.5!" />
                </MButton>
              </Footer>
            </Section>
          )}

          {step === "sources" && (
            <Section
              headingRef={headingRef}
              kicker="Étape 2 · Sources"
              title="Choisis tes sources."
              subtitle="Tu pourras en ajouter d’autres."
            >
              {filtreVide && (
                <p className="mb-4 rounded-[18px] bg-m-sand px-4 py-2.5 text-[13px]">
                  Aucune source ne correspond encore à tes choix : voici tout le catalogue.
                </p>
              )}
              {catalogue === null ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }, (_, i) => (
                    <MSkeleton key={i} className="h-16 rounded-[20px]" />
                  ))}
                </div>
              ) : proposees.length === 0 ? (
                <MEmpty>
                  Le catalogue est vide pour l’instant. Tu pourras ajouter tes propres sources avec le bouton + de la
                  barre latérale.
                </MEmpty>
              ) : (
                <ul className="-mx-1 flex max-h-[min(420px,50svh)] flex-col gap-1.5 overflow-y-auto px-1 py-1">
                  {proposees.map((f) => {
                    const cat = categories?.find((c) => c.id_categorie === f.categorie_id)
                    const checked = f.isSubscribed || choisis.has(f.id_flux)
                    return (
                      <li key={f.id_flux}>
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checked}
                          disabled={f.isSubscribed}
                          onClick={() => toggleSource(f.id_flux)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 rounded-[20px] px-3.5 py-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-m-lime disabled:cursor-default",
                            checked ? "bg-m-ink text-white" : "bg-m-surface-2 hover:bg-m-surface-3"
                          )}
                        >
                          <FluxLogo flux={f} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{f.nom}</span>
                            <span className={cn("flex items-center gap-1.5 text-[12px]", checked ? "text-white/60" : "text-m-muted")}>
                              {cat && <span className="size-2 rounded-full" style={{ backgroundColor: cat.couleur }} />}
                              {[cat?.libelle, f.zone ? ZONE_LABELS[f.zone as FluxZone] : null].filter(Boolean).join(" · ") ||
                                "Source"}
                            </span>
                          </span>
                          {f.isSubscribed ? (
                            <MPill tone="glass">Déjà suivie</MPill>
                          ) : (
                            <span
                              className={cn(
                                "flex size-6 shrink-0 items-center justify-center rounded-full",
                                checked ? "bg-m-lime text-m-ink" : "bg-m-surface shadow-[inset_0_0_0_1.5px_var(--color-m-surface-4)]"
                              )}
                            >
                              {checked && <Check className="size-3.5" strokeWidth={3} />}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <Footer>
                <MButton variant="ghost" onClick={precedent}>
                  <ArrowLeft className="size-3.5!" /> Retour
                </MButton>
                <MButton onClick={suivreSources} disabled={busy || catalogue === null} className="ml-auto">
                  {busy ? "Abonnement…" : choisis.size > 0 ? `Suivre ${choisis.size} source${choisis.size > 1 ? "s" : ""}` : "Continuer"}
                  {!busy && <ArrowRight className="size-3.5!" />}
                </MButton>
              </Footer>
            </Section>
          )}

          {step === "alerte" && (
            <Section
              headingRef={headingRef}
              kicker="Étape 3 · Première alerte"
              title="Un sujet à surveiller ?"
              subtitle="Sentinelle cherche pour toi."
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  creerAlerte()
                }}
              >
                <MField label="Mot-clé" htmlFor="onboarding-mot-cle" hint="(2 caractères minimum)">
                  <MInput
                    id="onboarding-mot-cle"
                    value={motCle}
                    onChange={(e) => setMotCle(e.target.value)}
                    placeholder="ex. économie camerounaise"
                    maxLength={100}
                    autoComplete="off"
                  />
                </MField>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {ALERTE_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setMotCle(s)}
                      className={cn(
                        "h-8 cursor-pointer rounded-full px-3 text-[12px] font-medium transition-colors",
                        motCle === s ? "bg-m-ink text-white" : "bg-m-surface-3 text-m-strong hover:bg-m-surface-4"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                <p className="mt-6 text-[13px] font-medium text-m-strong">Récapitulatif par e-mail</p>
                <MSegmented<Frequence>
                  className="mt-2.5 w-fit max-w-full"
                  value={frequence}
                  onChange={setFrequence}
                  items={[
                    { value: "immediat", label: "Immédiat" },
                    { value: "quotidien", label: "Quotidien" },
                    { value: "hebdomadaire", label: "Hebdo" },
                  ]}
                />
                <p className="mt-4 text-[13px] text-m-muted">
                  La recherche démarre tout de suite dans tes sources et sur le web.
                </p>

                <Footer>
                  <MButton variant="ghost" type="button" onClick={precedent}>
                    <ArrowLeft className="size-3.5!" /> Retour
                  </MButton>
                  <MButton variant="light" type="button" onClick={suivant} className="ml-auto">
                    Plus tard
                  </MButton>
                  <MButton type="submit" disabled={busy || motCle.trim().length < 2}>
                    {busy ? "Création…" : "Créer l’alerte"}
                  </MButton>
                </Footer>
              </form>
            </Section>
          )}

          {step === "notifications" && (
            <Section
              headingRef={headingRef}
              kicker="Étape 4 · Notifications"
              title="Reste informé."
              subtitle="Même application fermée."
            >
              <div className="flex items-start gap-4 rounded-[22px] bg-m-surface-2 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-m-lime">
                  <BellRing className="size-5" />
                </span>
                <p className="text-sm leading-[1.55] text-m-soft">
                  Reçois une notification quand une alerte trouve de nouveaux résultats, ou quand de nouveaux articles
                  arrivent dans un dossier d’enquête. Tu choisis lesquelles dans « Mon compte ».
                </p>
              </div>
              <PushNotice />
              <Footer>
                <MButton variant="ghost" onClick={precedent}>
                  <ArrowLeft className="size-3.5!" /> Retour
                </MButton>
                <MButton variant="light" onClick={suivant} className="ml-auto">
                  Plus tard
                </MButton>
                {getPushSupport() === "ok" && (
                  <MButton onClick={activerPush} disabled={busy}>
                    {busy ? "Activation…" : "Activer"}
                  </MButton>
                )}
              </Footer>
            </Section>
          )}

          {step === "fin" && (
            <Section headingRef={headingRef} kicker="C’est prêt" title="Ta veille est en place." subtitle="Bonne lecture.">
              <ul className="flex flex-col gap-2">
                <Recap icon={Rss} done={suivis > 0}>
                  {suivis > 0 ? `${suivis} source${suivis > 1 ? "s" : ""} suivie${suivis > 1 ? "s" : ""}` : "Aucune source ajoutée pour l’instant"}
                </Recap>
                <Recap icon={Bell} done={Boolean(alerteCreee)}>
                  {alerteCreee ? `Alerte « ${alerteCreee} » créée` : "Pas encore d’alerte"}
                </Recap>
                <Recap icon={BellRing} done={pushActif}>
                  {pushActif ? "Notifications activées sur cet appareil" : "Notifications à activer dans « Mon compte »"}
                </Recap>
              </ul>
              <div className="mt-6 flex items-start gap-4 rounded-[22px] bg-m-ink p-5 text-white">
                <Compass className="mt-0.5 size-5 shrink-0 text-m-lime" />
                <div>
                  <p className="font-medium">Une visite guidée de 2 minutes ?</p>
                  <p className="mt-1 text-sm text-white/65">
                    On te montre l’interface étape par étape. Tu pourras la relancer depuis le menu de ton compte.
                  </p>
                </div>
              </div>
              <Footer>
                <MButton variant="ghost" onClick={() => terminer(false)} disabled={finishing}>
                  Explorer seul
                </MButton>
                <MButton variant="lime" onClick={() => terminer(true)} disabled={finishing} className="ml-auto">
                  <Sparkles className="size-3.5!" /> Lancer la visite guidée
                </MButton>
              </Footer>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({
  headingRef,
  kicker,
  title,
  subtitle,
  children,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  kicker: string
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="m-reveal">
      <p className="font-mono text-[12px] tracking-wide text-m-soft uppercase">{kicker}</p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="mt-3 text-[34px] leading-[1.02] font-light tracking-[-0.06em] outline-none sm:text-[46px]"
      >
        <span className="block">{title}</span>
        <span className="block text-m-muted">{subtitle}</span>
      </h1>
      <div className="mt-7 rounded-[32px] bg-m-surface p-5 shadow-[0_10px_30px_rgba(15,17,15,.06)] sm:p-7">{children}</div>
    </section>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-m-surface-3 pt-5">{children}</div>
}

function Feature({
  icon: Icon,
  title,
  text,
  tone,
}: {
  icon: typeof Bell
  title: string
  text: string
  tone: string
}) {
  return (
    <div className="rounded-[22px] bg-m-surface-2 p-4">
      <span className={cn("flex size-10 items-center justify-center rounded-full", tone)}>
        <Icon className="size-4" />
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-0.5 text-[13px] leading-[1.45] text-m-soft">{text}</p>
    </div>
  )
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-m-lime",
        selected ? "bg-m-ink text-white" : "bg-m-surface-2 text-m-strong hover:bg-m-surface-3"
      )}
    >
      {selected && <Check className="size-3.5 text-m-lime" strokeWidth={3} />}
      {children}
    </button>
  )
}

function FluxLogo({ flux }: { flux: FluxSuggestion }) {
  const [broken, setBroken] = useState(false)
  if (flux.logo && !broken) {
    return (
      <img
        src={flux.logo}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="size-9 shrink-0 rounded-full bg-m-surface object-cover"
      />
    )
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-m-surface-3 text-[12px] font-semibold text-m-strong uppercase">
      {flux.nom.slice(0, 2)}
    </span>
  )
}

function Recap({ icon: Icon, done, children }: { icon: typeof Bell; done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-[20px] bg-m-surface-2 px-4 py-3 text-sm">
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          done ? "bg-m-lime text-m-ink" : "bg-m-surface-3 text-m-muted"
        )}
      >
        {done ? <Check className="size-4" strokeWidth={3} /> : <Icon className="size-4" />}
      </span>
      <span className={done ? "font-medium" : "text-m-soft"}>{children}</span>
    </li>
  )
}

function PushNotice() {
  const support = getPushSupport()
  if (support === "ok") return null
  const text =
    support === "ios-install"
      ? "Sur iPhone et iPad, ajoute d’abord Sentinelle à l’écran d’accueil (Partager → « Sur l’écran d’accueil »), puis active les notifications depuis « Mon compte »."
      : support === "dev"
        ? "Les notifications sont disponibles dans la version déployée de l’application."
        : "Ce navigateur ne prend pas en charge les notifications push."
  return <p className="mt-4 rounded-[18px] bg-m-sand px-4 py-2.5 text-[13px]">{text}</p>
}
