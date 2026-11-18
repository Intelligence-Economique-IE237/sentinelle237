/**
 * Primitives visuelles de l'espace Admin, reprises du design Framer « Mira ».
 * Les couleurs viennent des tokens `--color-m-*` définis dans index.css.
 */
import * as React from "react"
import { ChevronDownIcon, ChevronLeft, ChevronRight, XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { cn } from "@/lib/utils"
import { initials, mButtonClasses, type ButtonSize, type ButtonVariant } from "./mira-styles"

/* ------------------------------------------------------------------ */
/* Cartes                                                              */
/* ------------------------------------------------------------------ */

type CardTone = "white" | "dark" | "panel"

const CARD_TONES: Record<CardTone, string> = {
  white: "bg-m-surface text-m-ink",
  dark: "m-bio text-white",
  panel: "bg-m-panel text-m-ink",
}

export function MCard({
  tone = "white",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { tone?: CardTone }) {
  return (
    <section
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-[32px] px-[26px] pt-6 pb-6",
        CARD_TONES[tone],
        className
      )}
      {...props}
    >
      {children}
    </section>
  )
}

export function MCardHeader({
  title,
  subtitle,
  action,
  dark,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  dark?: boolean
  className?: string
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[22px] leading-tight font-medium tracking-[-0.03em]">{title}</h2>
        {subtitle && (
          <p
            className={cn(
              "mt-1.5 max-w-[34ch] text-sm leading-[1.5] text-pretty",
              dark ? "text-white/60" : "text-m-soft"
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

/** Sous-carte grise (ex. les cartes « Heart / Metabolic » du design). */
export function MTile({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-[22px] bg-m-surface-2 p-4", className)} {...props}>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pastilles / badges                                                  */
/* ------------------------------------------------------------------ */

export type PillTone = "lime" | "sand" | "peach" | "neutral" | "dark" | "glass" | "white"

const PILL_TONES: Record<PillTone, string> = {
  lime: "bg-m-lime text-m-ink",
  sand: "bg-m-sand text-m-ink",
  peach: "bg-m-peach text-m-orange-text",
  neutral: "bg-m-surface-3 text-m-strong",
  dark: "bg-m-ink text-white",
  glass: "bg-white/14 text-white backdrop-blur",
  white: "bg-m-surface text-m-strong",
}

export function MPill({
  tone = "neutral",
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: PillTone }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-[11px] leading-none font-semibold whitespace-nowrap",
        PILL_TONES[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export function MDot({ className }: { className?: string }) {
  return <span className={cn("inline-block size-[6px] shrink-0 rounded-full", className)} />
}

/* ------------------------------------------------------------------ */
/* Boutons                                                             */
/* ------------------------------------------------------------------ */

export const MButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }
>(function MButton({ variant = "dark", size = "md", className, type = "button", ...props }, ref) {
  return <button ref={ref} type={type} className={mButtonClasses(variant, size, className)} {...props} />
})

/* ------------------------------------------------------------------ */
/* Contrôle segmenté (nav « Overview / Biomarkers … » du design)       */
/* ------------------------------------------------------------------ */

export function MSegmented<T extends string>({
  value,
  onChange,
  items,
  className,
  itemClassName,
}: {
  value: T
  onChange: (value: T) => void
  items: { value: T; label: React.ReactNode }[]
  className?: string
  itemClassName?: string
}) {
  return (
    <div role="tablist" className={cn("flex items-center gap-0.5 rounded-full bg-m-surface-4/80 p-1", className)}>
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-m-lime",
              active ? "bg-m-ink text-white" : "text-m-strong hover:text-m-ink",
              itemClassName
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* En-tête de page (date + grand titre + KPI)                          */
/* ------------------------------------------------------------------ */

export function MHero({
  title,
  subtitle,
  stats,
}: {
  title: React.ReactNode
  subtitle: React.ReactNode
  stats?: { value: React.ReactNode; label: string; dot: string }[]
}) {
  const date = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })
  return (
    <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2.5 font-mono text-[12px] tracking-wide text-m-soft uppercase">
          <MDot className="bg-m-green" />
          {date}
        </p>
        <h1 className="mt-3 text-[34px] leading-[1.02] font-light tracking-[-0.06em] text-m-ink sm:text-[44px] lg:text-[56px]">
          <span className="block">{title}</span>
          <span className="block text-m-muted">{subtitle}</span>
        </h1>
      </div>
      {stats && stats.length > 0 && (
        <dl className="flex shrink-0 gap-7 md:gap-8 md:pb-1">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5">
              <dd className="text-[32px] leading-none font-light tracking-[-0.05em] text-m-strong tabular-nums md:text-[34px]">
                {s.value}
              </dd>
              <dt className="flex items-center gap-1.5 text-[12px] text-m-muted">
                <MDot className={s.dot} />
                {s.label}
              </dt>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Champs de formulaire                                                */
/* ------------------------------------------------------------------ */

const FIELD =
  "w-full rounded-2xl border-0 bg-m-surface-2 px-4 text-sm text-m-ink placeholder:text-m-muted outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-m-lime disabled:opacity-60"

export const MInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function MInput({ className, ...props }, ref) {
    return <input ref={ref} className={cn(FIELD, "h-11", className)} {...props} />
  }
)

export const MTextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function MTextarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(FIELD, "min-h-28 resize-y py-3 leading-[1.5]", className)} {...props} />
  }
)

export function MField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-m-strong">
        {label}
        {hint && <span className="ml-1 font-normal text-m-muted">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

/** Interrupteur lime. */
export function MSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  id?: string
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-m-lime",
        checked ? "justify-end bg-m-ink" : "justify-start bg-m-track"
      )}
    >
      <span className={cn("size-5 rounded-full transition-colors", checked ? "bg-m-lime" : "bg-m-surface")} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Select (base-ui) au style pastille                                  */
/* ------------------------------------------------------------------ */

export function MSelect<T extends string>({
  value,
  onChange,
  options,
  className,
  ariaLabel,
  placeholder,
  id,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; icon?: React.ReactNode }[]
  className?: string
  ariaLabel?: string
  placeholder?: string
  id?: string
}) {
  return (
    <SelectPrimitive.Root
      items={options}
      value={value}
      onValueChange={(v) => v !== null && onChange(v as T)}
    >
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        className={cn(
          "flex h-11 cursor-pointer items-center justify-between gap-2 rounded-full bg-m-surface-2 pr-3 pl-4 text-sm text-m-ink outline-none focus-visible:ring-2 focus-visible:ring-m-lime",
          className
        )}
      >
        <SelectPrimitive.Value className="truncate data-placeholder:text-m-muted" placeholder={placeholder} />
        <SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 text-m-muted" />} />
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} alignItemWithTrigger={false} className="z-50 outline-none">
          <SelectPrimitive.Popup className="max-h-[min(22rem,var(--available-height))] min-w-(--anchor-width) overflow-y-auto rounded-2xl bg-m-surface p-1.5 text-sm text-m-ink shadow-[0_1px_2px_rgba(15,17,15,.08),0_12px_32px_rgba(15,17,15,.14)] outline-none transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0">
            <SelectPrimitive.List>
            {options.map((o) => (
              <SelectPrimitive.Item
                key={o.value}
                value={o.value}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 outline-none select-none data-highlighted:bg-m-surface-3 data-selected:font-medium"
              >
                <SelectPrimitive.ItemText className="flex items-center gap-2">
                  {o.icon}
                  {o.label}
                </SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator>
                  <MDot className="bg-m-green" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}

/* ------------------------------------------------------------------ */
/* Boîte de dialogue                                                   */
/* ------------------------------------------------------------------ */

export function MDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  media,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  /** Contenu affiché au-dessus du titre (ex. image d'un article). */
  media?: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-m-ink/20 backdrop-blur-[3px] transition-opacity duration-150 data-starting-style:opacity-0 data-ending-style:opacity-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-[28px] bg-m-surface p-6 text-m-ink shadow-[0_1px_2px_rgba(15,17,15,.1),0_24px_60px_rgba(15,17,15,.22)] outline-none transition-[opacity,scale] duration-150 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0",
            className
          )}
        >
          {media}
          <div className={cn(!media && "pr-10")}>
            <DialogPrimitive.Title className="text-[22px] leading-tight font-medium tracking-[-0.03em]">
              {title}
            </DialogPrimitive.Title>
            {description && (
              <DialogPrimitive.Description className="mt-1.5 text-sm leading-[1.5] text-m-soft">
                {description}
              </DialogPrimitive.Description>
            )}
          </div>
          <DialogPrimitive.Close
            aria-label="Fermer"
            className="absolute top-5 right-5 flex size-8 cursor-pointer items-center justify-center rounded-full bg-m-surface-3 text-m-soft transition-colors hover:text-m-ink"
          >
            <XIcon className="size-4" />
          </DialogPrimitive.Close>
          {children}
          {footer && <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">{footer}</div>}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* ------------------------------------------------------------------ */
/* Pagination « 2 / 4 → »                                              */
/* ------------------------------------------------------------------ */

export function MPagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-center gap-2">
      <MButton variant="light" size="icon-sm" aria-label="Page précédente" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        <ChevronLeft />
      </MButton>
      <span className="min-w-14 text-center font-mono text-[12px] text-m-strong tabular-nums">
        {page} / {totalPages}
      </span>
      <MButton variant="light" size="icon-sm" aria-label="Page suivante" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        <ChevronRight />
      </MButton>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* États vides / chargement                                            */
/* ------------------------------------------------------------------ */

export function MEmpty({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("py-14 text-center text-sm text-m-muted", className)}>{children}</p>
}

export function MSkeleton({ className }: { className?: string }) {
  return <span className={cn("block animate-pulse rounded-xl bg-m-surface-4", className)} />
}

/* ------------------------------------------------------------------ */
/* Avatar à initiales                                                  */
/* ------------------------------------------------------------------ */

export function MAvatar({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-m-avatar text-[10px] font-medium text-m-strong ring-2 ring-m-surface",
        className
      )}
    >
      {initials(name)}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Arrière-plan : halos flous du design                                */
/* ------------------------------------------------------------------ */

export function MBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-[18%] -right-[8%] h-[62%] w-[52%] rounded-full bg-m-lime-mist opacity-90 blur-[120px]" />
      <div className="absolute top-[38%] -left-[12%] h-[52%] w-[42%] rounded-full bg-m-panel opacity-80 blur-[110px]" />
    </div>
  )
}
