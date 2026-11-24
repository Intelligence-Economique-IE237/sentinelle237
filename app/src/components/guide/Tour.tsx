import { useCallback, useEffect, useId, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ArrowLeft, ArrowRight, MousePointerClick, X } from "lucide-react"
import { MButton } from "@/components/mira/mira"
import { cn } from "@/lib/utils"
import { TOUR_STEPS, type TourStep } from "./tourSteps"

type Box = { top: number; left: number; width: number; height: number }

const PAD = 6
const GAP = 14
const MARGIN = 12
const DESKTOP = "(min-width: 1024px)"

/** Premier élément visible portant ce data-tour (la sidebar existe en double : desktop + tiroir mobile). */
function findTarget(id: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)
  for (const el of els) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  )
}

function useIsDesktop() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP).matches)
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP)
    const onChange = () => setDesktop(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])
  return desktop
}

/**
 * Visite guidée : assombrit l'écran, découpe l'élément expliqué et affiche
 * une bulle à côté. Les étapes « action » laissent l'élément cliquable et
 * avancent quand l'utilisateur clique dessus.
 */
export function Tour({
  onEnd,
  setDrawer,
}: {
  onEnd: (reason: "done" | "skip") => void
  setDrawer: (open: boolean) => void
}) {
  const [index, setIndex] = useState(0)
  const step: TourStep = TOUR_STEPS[index]
  const isLast = index === TOUR_STEPS.length - 1
  const desktop = useIsDesktop()
  const titleId = useId()

  // Position de la cible, mesurée en continu (défilement, tiroir qui glisse, redimensionnement…)
  const [measure, setMeasure] = useState<{ index: number; box: Box | null; missing: boolean }>({
    index: -1,
    box: null,
    missing: false,
  })
  const [popHeight, setPopHeight] = useState(180)
  const popRef = useRef<HTMLDivElement>(null)

  const current = measure.index === index ? measure : { box: null, missing: false }
  const box = step.target ? current.box : null
  const searching = Boolean(step.target) && !box && !current.missing

  const next = useCallback(() => {
    if (isLast) onEnd("done")
    else setIndex((i) => i + 1)
  }, [isLast, onEnd])
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  // Sur mobile, la sidebar vit dans un tiroir : on l'ouvre pour les étapes qui la concernent
  useEffect(() => {
    if (!desktop) setDrawer(Boolean(step.sidebar))
  }, [desktop, step.sidebar, setDrawer])

  useEffect(() => () => setDrawer(false), [setDrawer])

  useEffect(() => {
    let raf = 0
    let scrolled = false
    const started = performance.now()
    const loop = () => {
      if (popRef.current) {
        const h = popRef.current.offsetHeight
        setPopHeight((p) => (Math.abs(p - h) > 1 ? h : p))
      }
      if (step.target) {
        const el = findTarget(step.target)
        if (el) {
          const r = el.getBoundingClientRect()
          if (!scrolled) {
            scrolled = true
            if (r.top < 80 || r.bottom > window.innerHeight - 24) el.scrollIntoView({ block: "center", behavior: "smooth" })
          }
          const b = { top: r.top, left: r.left, width: r.width, height: r.height }
          setMeasure((m) => (m.index === index && sameBox(m.box, b) ? m : { index, box: b, missing: false }))
        } else if (performance.now() - started > 4000) {
          // Élément introuvable (écran trop petit, vue différente…) : on explique sans pointer
          setMeasure((m) => (m.index === index && m.missing ? m : { index, box: null, missing: true }))
        }
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [index, step.target])

  // Étape interactive : on avance quand l'utilisateur clique sur l'élément
  useEffect(() => {
    if (step.action !== "click" || !step.target) return
    const selector = `[data-tour="${step.target}"]`
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element | null)?.closest?.(selector)) window.setTimeout(next, 250)
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [step.action, step.target, next])

  // Clavier : Échap pour quitter, flèches pour naviguer
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd("skip")
      else if (e.key === "ArrowRight" && step.action !== "click") next()
      else if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [next, prev, onEnd, step.action])

  // Le bouton principal d'une étape interactive fait le clic à la place de l'utilisateur
  function primary() {
    if (step.action === "click" && step.target && box) {
      findTarget(step.target)?.click()
      return
    }
    next()
  }

  // Focus sur la bulle à chaque étape, pour les lecteurs d'écran et le clavier
  useEffect(() => {
    popRef.current?.focus({ preventScroll: true })
  }, [index])

  const vw = window.innerWidth
  const vh = window.innerHeight
  const hole = box
    ? {
        top: box.top - PAD,
        left: box.left - PAD,
        width: box.width + PAD * 2,
        height: box.height + PAD * 2,
      }
    : null
  const radius = Math.min(step.radius ?? 18, hole ? hole.height / 2 : 0)

  // Placement de la bulle
  const width = Math.min(360, vw - MARGIN * 2)
  let popStyle: React.CSSProperties
  if (!hole) {
    popStyle = { width, left: (vw - width) / 2, top: Math.max(MARGIN, (vh - popHeight) / 2) }
  } else if (!desktop) {
    // Mobile : bulle en bas de l'écran, ou en haut si la cible est en bas
    const targetLow = hole.top + hole.height / 2 > vh * 0.55
    popStyle = targetLow ? { left: MARGIN, right: MARGIN, top: MARGIN } : { left: MARGIN, right: MARGIN, bottom: MARGIN }
  } else if (vw - (hole.left + hole.width) > width + GAP + MARGIN && hole.left < vw / 3) {
    // Élément de la sidebar : bulle à droite
    const top = hole.top + hole.height / 2 - popHeight / 2
    popStyle = { width, left: hole.left + hole.width + GAP, top: clamp(top, MARGIN, vh - popHeight - MARGIN) }
  } else {
    const below = vh - (hole.top + hole.height) > popHeight + GAP + MARGIN
    const left = clamp(hole.left + hole.width / 2 - width / 2, MARGIN, vw - width - MARGIN)
    popStyle = below
      ? { width, left, top: hole.top + hole.height + GAP }
      : { width, left, top: Math.max(MARGIN, hole.top - GAP - popHeight) }
  }

  const progress = ((index + 1) / TOUR_STEPS.length) * 100
  const interactive = step.action === "click" && Boolean(hole)

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[80]" data-tour-overlay="">
      {/* Voile sombre avec découpe arrondie */}
      <svg className="pointer-events-none absolute inset-0 size-full" aria-hidden="true">
        <path
          fillRule="evenodd"
          fill="rgba(15,17,15,0.55)"
          className="transition-[d] duration-300 ease-out"
          d={`M0 0H${vw}V${vh}H0Z${hole ? roundedRectPath(hole, radius) : ""}`}
        />
      </svg>

      {/* Zones qui bloquent les clics autour de la découpe */}
      {hole ? (
        <>
          <div className="pointer-events-auto absolute inset-x-0 top-0" style={{ height: Math.max(0, hole.top) }} />
          <div className="pointer-events-auto absolute inset-x-0 bottom-0" style={{ top: hole.top + hole.height }} />
          <div className="pointer-events-auto absolute left-0" style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }} />
          <div className="pointer-events-auto absolute right-0" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }} />
          {!interactive && <div className="pointer-events-auto absolute" style={hole} />}
          <div
            className={cn(
              "pointer-events-none absolute ring-3 ring-m-lime transition-all duration-300 ease-out",
              interactive && "animate-pulse"
            )}
            style={{ ...hole, borderRadius: radius }}
          />
        </>
      ) : (
        <div className="pointer-events-auto absolute inset-0" />
      )}

      {/* Bulle */}
      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          "pointer-events-auto absolute rounded-[24px] bg-m-surface p-5 text-m-ink shadow-[0_24px_60px_rgba(15,17,15,.28)] outline-none transition-[top,left,bottom,opacity] duration-300 ease-out",
          searching && "opacity-0"
        )}
        style={popStyle}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-[11px] tracking-wide text-m-muted tabular-nums">
            {String(index + 1).padStart(2, "0")} / {String(TOUR_STEPS.length).padStart(2, "0")}
          </span>
          <button
            type="button"
            onClick={() => onEnd("skip")}
            aria-label="Quitter la visite guidée"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-m-surface-3 text-m-soft transition-colors hover:text-m-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 id={titleId} className="mt-2 text-[19px] leading-tight font-medium tracking-[-0.03em]">
          {step.title}
        </h2>
        <p className="mt-1.5 text-sm leading-[1.5] text-m-soft">{step.body}</p>

        {interactive && step.actionLabel && (
          <p className="mt-3 flex items-center gap-2 rounded-full bg-m-lime/35 px-3 py-2 text-[13px] font-medium">
            <MousePointerClick className="size-4 shrink-0" />
            À toi : {step.actionLabel}
          </p>
        )}

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-m-surface-3" aria-hidden="true">
          <div className="h-full rounded-full bg-m-lime transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {index === 0 ? (
            <MButton variant="ghost" size="sm" onClick={() => onEnd("skip")}>
              Plus tard
            </MButton>
          ) : (
            <MButton variant="ghost" size="sm" onClick={prev}>
              <ArrowLeft className="size-3.5!" /> Précédent
            </MButton>
          )}
          <MButton size="sm" variant={isLast ? "lime" : "dark"} onClick={primary} className="ml-auto">
            {index === 0 ? "Commencer la visite" : isLast ? "Terminer" : interactive ? "Le faire pour moi" : "Suivant"}
            {!isLast && <ArrowRight className="size-3.5!" />}
          </MButton>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Étape {index + 1} sur {TOUR_STEPS.length} : {step.title}
      </p>
    </div>,
    document.body
  )
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max))
}

function roundedRectPath(b: Box, r: number) {
  const { top: y, left: x, width: w, height: h } = b
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
}
